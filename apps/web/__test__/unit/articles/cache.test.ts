import { describe, expect, it } from "vite-plus/test";

import {
  articleCacheKey,
  deleteArticleCache,
  type ArticleCache,
  readArticleCache,
  writeArticleCache,
} from "@/articles/persistence/cache";

function createMemoryCache() {
  const values = new Map<string, string>();
  const writes: Array<{ key: string; ttl: number | undefined }> = [];
  const cache: ArticleCache = {
    async delete(key) {
      values.delete(key);
    },
    async get(key) {
      const value = values.get(key);
      return value === undefined ? null : value;
    },
    async put(key, value, options) {
      values.set(key, value);
      writes.push({ key, ttl: options?.expirationTtl });
    },
  };
  return { cache, values, writes };
}

describe("article cache", () => {
  it("stores and reads a hash-keyed locale edition with a bounded lifetime", async () => {
    const memory = createMemoryCache();
    const article = { title: "Title", summary: "Summary", markdown: "Body\n" };

    await writeArticleCache(memory.cache, "article", "hash", "ja", article);

    await expect(readArticleCache(memory.cache, "article", "hash", "ja")).resolves.toEqual(article);
    expect(memory.writes).toEqual([{ key: "articles/article/hash/ja.json", ttl: 86_400 }]);
  });

  it("distinguishes a cache miss from invalid cached data", async () => {
    const memory = createMemoryCache();
    await expect(readArticleCache(memory.cache, "article", "hash", "en")).resolves.toBeUndefined();
    memory.values.set(articleCacheKey("article", "hash", "en"), "{}");
    await expect(readArticleCache(memory.cache, "article", "hash", "en")).rejects.toThrow();
  });

  it("deletes every locale for one article version", async () => {
    const memory = createMemoryCache();
    const article = { title: "Title", summary: "Summary", markdown: "Body\n" };
    await writeArticleCache(memory.cache, "article", "hash", "zh", article);
    await writeArticleCache(memory.cache, "article", "hash", "en", article);

    await deleteArticleCache(memory.cache, "article", "hash", ["zh", "en"]);

    expect(memory.values.size).toBe(0);
  });
});
