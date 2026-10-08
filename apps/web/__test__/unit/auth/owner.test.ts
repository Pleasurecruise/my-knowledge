import { beforeEach, expect, it, vi } from "vite-plus/test";
import { getPrincipal } from "@/auth/owner";

const reads = vi.hoisted(() => ({
  headers: vi.fn<() => Headers>(),
  request: vi.fn<() => Request>(),
  createAuth: vi.fn(),
  session: vi.fn(),
}));

vi.mock("@tanstack/react-start/server", () => ({
  getRequest: reads.request,
  getRequestHeaders: reads.headers,
}));
vi.mock("cloudflare:workers", () => ({ env: { ALLOWED_EMAIL: "owner@example.com" } }));
vi.mock("@/auth/server", () => ({ createAuth: reads.createAuth }));

beforeEach(() => {
  vi.resetAllMocks();
  reads.headers.mockReturnValue(new Headers());
  reads.request.mockImplementation(() => new Request("https://knowledge.example.com"));
  reads.createAuth.mockResolvedValue({ api: { getSession: reads.session } });
});

it("skips auth initialization when no session cookie exists", async () => {
  expect(await getPrincipal()).toBe("anonymous");
  expect(reads.createAuth).not.toHaveBeenCalled();
});

it("does not authorize an unverified session cookie", async () => {
  reads.headers.mockReturnValue(new Headers({ cookie: "better-auth.session_token=invalid" }));
  reads.session.mockResolvedValue(null);
  expect(await getPrincipal()).toBe("anonymous");
  expect(reads.session).toHaveBeenCalledOnce();
});

it.each([
  ["OWNER@example.com", "owner"],
  ["other@example.com", "anonymous"],
])("authorizes verified email %s as %s", async (email, principal) => {
  reads.headers.mockReturnValue(new Headers({ cookie: "better-auth.session_token=verified" }));
  reads.session.mockResolvedValue({ user: { email } });
  expect(await getPrincipal()).toBe(principal);
});

it("verifies the session once per request", async () => {
  const request = new Request("https://knowledge.example.com");
  reads.request.mockReturnValue(request);
  reads.headers.mockReturnValue(new Headers({ cookie: "better-auth.session_token=verified" }));
  reads.session.mockResolvedValue({ user: { email: "owner@example.com" } });
  expect(await Promise.all([getPrincipal(), getPrincipal()])).toEqual(["owner", "owner"]);
  expect(reads.session).toHaveBeenCalledOnce();
  reads.request.mockReturnValue(new Request("https://knowledge.example.com"));
  await getPrincipal();
  expect(reads.session).toHaveBeenCalledTimes(2);
});
