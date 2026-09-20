import { beforeEach, expect, it, vi } from "vite-plus/test";
import { searchKnowledge } from "@/search/action";

const boundary = vi.hoisted(() => ({ principal: vi.fn(), search: vi.fn() }));
vi.mock("@/auth/owner", () => ({ getPrincipal: boundary.principal }));
vi.mock("@opennextjs/cloudflare", () => ({ getCloudflareContext: async () => ({ env: {} }) }));
vi.mock("@/i18n/server", () => ({ getInterfaceI18n: async () => ({ code: "zh" }) }));
vi.mock("@/articles", () => ({
  searchAiSummaries: boundary.search,
  localizeArticles: async (_env: unknown, articles: unknown) => articles,
}));
beforeEach(() => vi.resetAllMocks());
it("denies anonymous AI search before calling the provider", async () => {
  boundary.principal.mockResolvedValue("anonymous");
  const form = new FormData();
  form.set("query", "private question");
  expect(await searchKnowledge({ articles: [], status: "idle" }, form)).toEqual({
    articles: [],
    status: "error",
  });
  expect(boundary.search).not.toHaveBeenCalled();
});
it("bounds owner questions and keeps provider errors out of the response", async () => {
  boundary.principal.mockResolvedValue("owner");
  const form = new FormData();
  form.set("query", "x".repeat(2001));
  await searchKnowledge({ articles: [], status: "idle" }, form);
  expect(boundary.search).not.toHaveBeenCalled();
  form.set("query", "private question");
  boundary.search.mockRejectedValue(new Error("provider included private question"));
  expect(await searchKnowledge({ articles: [], status: "idle" }, form)).toEqual({
    articles: [],
    status: "error",
  });
});
