import { beforeEach, expect, it, vi } from "vite-plus/test";
import { getPrincipal } from "@/auth/owner";

const reads = vi.hoisted(() => ({
  headers: vi.fn<() => Promise<Headers>>(),
  context: vi.fn(),
  createAuth: vi.fn(),
  session: vi.fn(),
}));

vi.mock("next/headers", () => ({ headers: reads.headers }));
vi.mock("@opennextjs/cloudflare", () => ({ getCloudflareContext: reads.context }));
vi.mock("@/auth/server", () => ({ createAuth: reads.createAuth }));

beforeEach(() => {
  vi.resetAllMocks();
  reads.headers.mockResolvedValue(new Headers());
  reads.context.mockResolvedValue({ env: { ALLOWED_EMAIL: "owner@example.com" } });
  reads.createAuth.mockResolvedValue({ api: { getSession: reads.session } });
});

it("skips auth initialization when no session cookie exists", async () => {
  expect(await getPrincipal()).toBe("anonymous");
  expect(reads.context).not.toHaveBeenCalled();
  expect(reads.createAuth).not.toHaveBeenCalled();
});

it("does not authorize an unverified session cookie", async () => {
  reads.headers.mockResolvedValue(new Headers({ cookie: "better-auth.session_token=invalid" }));
  reads.session.mockResolvedValue(null);
  expect(await getPrincipal()).toBe("anonymous");
  expect(reads.session).toHaveBeenCalledOnce();
});

it.each([
  ["OWNER@example.com", "owner"],
  ["other@example.com", "anonymous"],
])("authorizes verified email %s as %s", async (email, principal) => {
  reads.headers.mockResolvedValue(new Headers({ cookie: "better-auth.session_token=verified" }));
  reads.session.mockResolvedValue({ user: { email } });
  expect(await getPrincipal()).toBe(principal);
});
