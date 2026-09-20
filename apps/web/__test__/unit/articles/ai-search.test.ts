import { getCloudflareContext } from "@opennextjs/cloudflare";
import { afterEach, beforeEach, expect, it, vi } from "vite-plus/test";
import { indexChineseArticle } from "@/articles/persistence/ai-search";
import { createStoredArticle } from "@/articles/persistence/mutation";

const upload = vi.hoisted(() => vi.fn());
vi.mock("@opennextjs/cloudflare", () => ({
  getCloudflareContext: async () => ({
    env: { AI_SEARCH: { get: () => ({ items: { uploadAndPoll: upload } }) } },
  }),
}));
beforeEach(() => vi.resetAllMocks());
afterEach(() => vi.useRealTimers());
it.each(["completed", "timeout"])(
  "keeps a slow upload unpublished until %s and cleans up only on failure",
  async (outcome) => {
    vi.useFakeTimers();
    const failure = new Error("AI Search indexing timed out");
    upload.mockImplementation(
      (_key: string, _markdown: string, options: { timeoutMs: number }) =>
        new Promise((resolve, reject) => {
          setTimeout(
            () => {
              if (outcome === "completed" && options.timeoutMs > 45_000)
                resolve({ status: "completed" });
              else reject(failure);
            },
            outcome === "completed" ? Math.min(45_000, options.timeoutMs) : options.timeoutMs,
          );
        }),
    );
    const { env } = await getCloudflareContext({ async: true });
    const insertRow = vi.fn(async () => "article");
    const cleanupNewVersion = vi.fn(async () => {});
    const save = createStoredArticle({
      writeDocuments: async () => {},
      writeIndex: () => indexChineseArticle(env, "article", "Markdown", []),
      insertRow,
      cleanupNewVersion,
    });
    const result =
      outcome === "completed"
        ? expect(save).resolves.toBe("article")
        : expect(save).rejects.toBe(failure);
    await vi.advanceTimersByTimeAsync(30_000);
    expect(insertRow).not.toHaveBeenCalled();
    expect(cleanupNewVersion).not.toHaveBeenCalled();
    await vi.advanceTimersByTimeAsync(outcome === "completed" ? 15_000 : 90_000);
    await result;
    expect(insertRow).toHaveBeenCalledTimes(outcome === "completed" ? 1 : 0);
    expect(cleanupNewVersion).toHaveBeenCalledTimes(outcome === "completed" ? 0 : 1);
    expect(upload).toHaveBeenCalledTimes(1);
  },
);
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
    timeoutMs: 120_000,
  });
});
