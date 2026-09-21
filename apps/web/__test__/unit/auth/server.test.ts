import { beforeEach, expect, it, vi } from "vite-plus/test";
import { createAuth } from "@/auth/server";

const reads = vi.hoisted(() => ({
  context: vi.fn(),
  betterAuth: vi.fn(),
  oneTap: vi.fn(),
  drizzle: vi.fn(),
  drizzleAdapter: vi.fn(),
}));

vi.mock("@opennextjs/cloudflare", () => ({ getCloudflareContext: reads.context }));
vi.mock("better-auth/minimal", () => ({ betterAuth: reads.betterAuth }));
vi.mock("better-auth/plugins", () => ({ oneTap: reads.oneTap }));
vi.mock("drizzle-orm/d1", () => ({ drizzle: reads.drizzle }));
vi.mock("better-auth/adapters/drizzle", () => ({ drizzleAdapter: reads.drizzleAdapter }));

beforeEach(() => {
  vi.resetAllMocks();
  reads.context.mockResolvedValue({
    env: {
      ALLOWED_EMAIL: "owner@example.com",
      BETTER_AUTH_SECRET: "a-secret-with-at-least-32-characters",
      BETTER_AUTH_URL: "https://knowledge.example.com",
      GOOGLE_CLIENT_ID: "client-id",
      GOOGLE_CLIENT_SECRET: "client-secret",
      DB: {},
    },
  });
  reads.betterAuth.mockImplementation(() => ({ api: { getSession: vi.fn() } }));
  reads.oneTap.mockReturnValue("one-tap");
  reads.drizzle.mockReturnValue("drizzle");
  reads.drizzleAdapter.mockReturnValue("adapter");
});

it("shares initialization across concurrent and subsequent requests", async () => {
  const [first, second] = await Promise.all([createAuth(), createAuth()]);
  expect(second).toBe(first);
  expect(await createAuth()).toBe(first);
  expect(reads.context).toHaveBeenCalledOnce();
  expect(reads.betterAuth).toHaveBeenCalledOnce();
  expect(reads.drizzle).toHaveBeenCalledOnce();
  expect(reads.drizzleAdapter).toHaveBeenCalledOnce();
});
