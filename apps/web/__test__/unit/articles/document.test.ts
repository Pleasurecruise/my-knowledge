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
}));

vi.mock("@opennextjs/cloudflare", () => ({
  getCloudflareContext: async () => ({
    env: {
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
  visibility: "public",
  contentHash: "a".repeat(64),
  createdAt: "2026-09-01T00:00:00.000Z",
  updatedAt: "2026-09-01T00:00:00.000Z",
};

beforeEach(() => {
  vi.resetAllMocks();
  reads.row.mockResolvedValue(row);
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
