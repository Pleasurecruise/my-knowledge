import { getCloudflareContext } from "@opennextjs/cloudflare";
import { beforeEach, expect, it, vi } from "vite-plus/test";
import { indexChineseArticle } from "@/articles/persistence/ai-search";

const upload = vi.hoisted(() => vi.fn());
vi.mock("@opennextjs/cloudflare", () => ({
  getCloudflareContext: async () => ({
    env: { AI_SEARCH: { get: () => ({ items: { uploadAndPoll: upload } }) } },
  }),
}));
beforeEach(() => vi.resetAllMocks());
it.each(["queued", "running", "error", "skipped", "outdated"])(
  "rejects publication when indexing is %s",
  async (status) => {
    upload.mockResolvedValue({ status });
    const { env } = await getCloudflareContext({ async: true });
    await expect(indexChineseArticle(env, "article", "Markdown", [])).rejects.toThrow(
      "indexing incomplete",
    );
  },
);
it("accepts only a completed upload and excludes daily articles", async () => {
  upload.mockResolvedValue({ status: "completed" });
  const { env } = await getCloudflareContext({ async: true });
  await indexChineseArticle(env, "article", "Markdown", []);
  await indexChineseArticle(env, "daily", "Markdown", ["daily/notes"]);
  expect(upload).toHaveBeenCalledExactlyOnceWith("article/zh.md", "Markdown", {
    timeoutMs: 30_000,
  });
});
