import { searchAiArticles, searchAiSummaries } from "@/articles/persistence/ai-search";
import { getCloudflareContext } from "@opennextjs/cloudflare";
import { beforeEach, expect, it, vi } from "vite-plus/test";
import {
  getArticleEdition,
  getArticleMetadata,
  localizeArticles,
} from "@/articles/persistence/document";
import {
  articleSummary,
  type ArticleRow,
  type ArticleTranslationRow,
} from "@/articles/persistence/record";
import { articles } from "@/db/schema";

const reads = vi.hoisted(() => ({
  row: vi.fn<() => Promise<ArticleRow | undefined>>(),
  translations: vi.fn<() => Promise<ArticleTranslationRow[]>>(),
  cache: vi.fn(),
  object: vi.fn(),
  write: vi.fn(),
  search: vi.fn(),
}));

vi.mock("@opennextjs/cloudflare", () => ({
  getCloudflareContext: async () => ({
    env: {
      AI_SEARCH: { get: () => ({ search: reads.search }) },
      DB: {},
      KNOWLEDGE_CACHE: {},
      KNOWLEDGE_BUCKET: { get: reads.object },
    },
  }),
}));
vi.mock("drizzle-orm/d1", () => ({
  drizzle: () => ({
    select: () => ({
      from: (table: unknown) => ({
        where: () => (table === articles ? { get: reads.row } : reads.translations()),
      }),
    }),
  }),
}));
vi.mock("@/articles/persistence/cache", () => ({
  readArticleCache: reads.cache,
  writeArticleCache: reads.write,
}));

const row: ArticleRow = {
  id: "11111111-1111-4111-8111-111111111111",
  title: "中文",
  summary: "摘要",
  tagsJson: "[]",
  linksJson: "[]",
  visibility: "public",
  contentHash: "a".repeat(64),
  createdAt: "2026-09-01T00:00:00.000Z",
  updatedAt: "2026-09-01T00:00:00.000Z",
};

beforeEach(() => {
  vi.resetAllMocks();
  reads.row.mockResolvedValue(row);
  reads.search.mockResolvedValue({ chunks: [{ item: { key: `${row.id}/zh.md` }, score: 1 }] });
  reads.translations.mockResolvedValue([
    {
      articleId: row.id,
      locale: "en",
      sourceHash: row.contentHash,
      title: "English",
      summary: "Summary",
    },
  ]);
  reads.cache.mockResolvedValue({
    title: "English",
    summary: "Summary",
    markdown: "Readable text",
  });
});

it("reads anonymous metadata without translations, caches or bodies", async () => {
  const { env } = await getCloudflareContext({ async: true });
  expect((await getArticleMetadata(env, row.id))?.editions.zh.title).toBe("中文");
  expect(reads.translations).not.toHaveBeenCalled();
  expect(reads.cache).not.toHaveBeenCalled();
  expect(reads.object).not.toHaveBeenCalled();
});

it("reads only the selected edition after authorizing the row", async () => {
  const { env } = await getCloudflareContext({ async: true });
  expect((await getArticleEdition(env, "anonymous", row.id, "en"))?.locale).toBe("en");
  expect(reads.cache).toHaveBeenCalledExactlyOnceWith(
    env.KNOWLEDGE_CACHE,
    row.id,
    row.contentHash,
    "en",
  );
  expect(reads.row).toHaveBeenCalledBefore(reads.cache);
  expect(reads.object).not.toHaveBeenCalled();
});

it("does not access derived or canonical content when D1 denies the row", async () => {
  reads.row.mockResolvedValue(undefined);
  const { env } = await getCloudflareContext({ async: true });
  expect(await getArticleEdition(env, "anonymous", row.id, "en")).toBeNull();
  expect(await getArticleMetadata(env, row.id)).toBeNull();
  expect(reads.translations).not.toHaveBeenCalled();
  expect(reads.cache).not.toHaveBeenCalled();
  expect(reads.object).not.toHaveBeenCalled();
});

it("falls back to Chinese when the requested current translation is absent", async () => {
  reads.translations.mockResolvedValue([]);
  const { env } = await getCloudflareContext({ async: true });
  expect((await getArticleEdition(env, "anonymous", row.id, "ja"))?.locale).toBe("zh");
  expect(reads.cache).toHaveBeenCalledExactlyOnceWith(
    env.KNOWLEDGE_CACHE,
    row.id,
    row.contentHash,
    "zh",
  );
});

it("bypasses public caches for an owner's private article", async () => {
  reads.row.mockResolvedValue({ ...row, visibility: "private" });
  reads.object.mockResolvedValue({
    customMetadata: { contentHash: row.contentHash },
    text: async () => "---\ntitle: Private\nsummary: Private summary\ntags: []\n---\nBody",
  });
  const { env } = await getCloudflareContext({ async: true });
  expect((await getArticleEdition(env, "owner", row.id, "zh"))?.text.title).toBe("Private");
  expect(reads.translations).not.toHaveBeenCalled();
  expect(reads.cache).not.toHaveBeenCalled();
  expect(reads.write).not.toHaveBeenCalled();
  expect(reads.object).toHaveBeenCalledExactlyOnceWith(`knowledge/${row.id}/zh.md`);
});

it("localizes authorized list summaries without reading any bodies", async () => {
  const { env } = await getCloudflareContext({ async: true });
  const summaries = [articleSummary(row)];
  const localized = await localizeArticles(env, summaries, "en");
  expect(localized[0]?.editions.en).toEqual({ title: "English", summary: "Summary" });
  expect(localized[0]?.editions.zh.title).toBe("中文");
  expect(reads.object).not.toHaveBeenCalled();
  expect(reads.cache).not.toHaveBeenCalled();
});
it("omits stale and absent translations and skips translation reads for Chinese", async () => {
  const { env } = await getCloudflareContext({ async: true });
  const summaries = [articleSummary(row)];
  expect(await localizeArticles(env, summaries, "zh-CN")).toBe(summaries);
  expect(reads.translations).not.toHaveBeenCalled();
  reads.translations.mockResolvedValue([
    { articleId: row.id, locale: "en", sourceHash: "old", title: "Stale", summary: "Stale" },
  ]);
  expect((await localizeArticles(env, summaries, "en"))[0]?.editions.en).toBeUndefined();
  reads.translations.mockResolvedValue([]);
  expect((await localizeArticles(env, summaries, "ja"))[0]?.editions.ja).toBeUndefined();
});

it.each([undefined, { contentHash: "b".repeat(64) }])(
  "rejects missing or uncommitted R2 versions: %j",
  async (customMetadata) => {
    reads.cache.mockResolvedValue(undefined);
    const body = vi.fn();
    reads.object.mockResolvedValue({ customMetadata, text: body });
    const { env } = await getCloudflareContext({ async: true });
    await expect(getArticleEdition(env, "anonymous", row.id, "zh")).rejects.toThrow(
      "Article version changed",
    );
    expect(body).not.toHaveBeenCalled();
    expect(reads.write).not.toHaveBeenCalled();
  },
);

it("rejects uncommitted R2 versions during AI retrieval through the shared read boundary", async () => {
  reads.cache.mockResolvedValue(undefined);
  const body = vi.fn();
  reads.object.mockResolvedValue({ customMetadata: { contentHash: "uncommitted" }, text: body });
  const { env } = await getCloudflareContext({ async: true });
  await expect(searchAiArticles(env, "owner", "question", 1)).rejects.toThrow(
    "Article version changed",
  );
  expect(body).not.toHaveBeenCalled();
  expect(reads.write).not.toHaveBeenCalled();
});

it("requests uncached metadata and fails explicitly on provider retrieval errors", async () => {
  const { env } = await getCloudflareContext({ async: true });
  await searchAiArticles(env, "owner", "question", 1);
  expect(reads.search).toHaveBeenCalledWith({
    query: "question",
    ai_search_options: {
      cache: { enabled: false },
      retrieval: { max_num_results: 50, metadata_only: true, return_on_failure: false },
    },
  });
});

it("overfetches chunks before article deduplication on a frozen synthetic corpus", async () => {
  const second = { ...row, id: "22222222-2222-4222-8222-222222222222" };
  const corpus = [
    ...Array.from({ length: 10 }, () => ({ item: { key: `${row.id}/zh.md` }, score: 0.9 })),
    { item: { key: `${second.id}/zh.md` }, score: 0.8 },
  ];
  // Baseline: limit was applied to chunks, yielding only one of two relevant articles.
  expect(new Set(corpus.slice(0, 2).map((chunk) => chunk.item.key)).size).toBe(1);
  reads.search.mockImplementation(async ({ ai_search_options }) => ({
    chunks: corpus.slice(0, ai_search_options.retrieval.max_num_results),
  }));
  reads.row.mockResolvedValueOnce(row).mockResolvedValueOnce(second);
  const { env } = await getCloudflareContext({ async: true });
  const results = await searchAiArticles(env, "owner", "question", 2);
  expect(results.map(({ article }) => article.id)).toEqual([row.id, second.id]);
});

it("discards unauthorized candidates without reading or caching their bodies", async () => {
  reads.row.mockResolvedValue(undefined);
  const { env } = await getCloudflareContext({ async: true });
  expect(await searchAiArticles(env, "anonymous", "question", 2)).toEqual([]);
  expect(reads.cache).not.toHaveBeenCalled();
  expect(reads.object).not.toHaveBeenCalled();
});

it("reads metadata-only browser results without touching canonical bodies or caches", async () => {
  const { env } = await getCloudflareContext({ async: true });
  const baselineReads: number[] = [];
  const candidateReads: number[] = [];
  for (let sample = 0; sample < 20; sample += 1) {
    reads.cache.mockClear();
    const baseline = await searchAiArticles(env, "owner", "synthetic question", 1);
    baselineReads.push(reads.cache.mock.calls.length);
    reads.cache.mockClear();
    const candidate = await searchAiSummaries(env, "synthetic question", 1);
    candidateReads.push(reads.cache.mock.calls.length);
    expect(candidate).toEqual(baseline.map(({ article }) => article));
  }
  expect(baselineReads).toEqual(Array(20).fill(1));
  expect(candidateReads).toEqual(Array(20).fill(0));
  expect(reads.object).not.toHaveBeenCalled();
});

it("filters tags before reading bodies and fills the requested article limit", async () => {
  const second = {
    ...row,
    id: "22222222-2222-4222-8222-222222222222",
    tagsJson: '["engineering/testing"]',
  };
  reads.search.mockResolvedValue({
    chunks: [
      { item: { key: `${row.id}/zh.md` }, score: 0.9 },
      { item: { key: `${second.id}/zh.md` }, score: 0.8 },
    ],
  });
  reads.row.mockResolvedValueOnce(row).mockResolvedValueOnce(second);
  const { env } = await getCloudflareContext({ async: true });
  const result = await searchAiArticles(env, "owner", "synthetic question", 1, ["engineering"]);
  expect(result.map(({ article }) => article.id)).toEqual([second.id]);
  expect(reads.cache).toHaveBeenCalledTimes(1);
});
