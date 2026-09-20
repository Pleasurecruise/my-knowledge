import { parseArticleDocuments } from "@my-knowledge/content";
import { getCloudflareContext } from "@opennextjs/cloudflare";
import { beforeEach, expect, it, vi } from "vite-plus/test";
import { deleteArticle, updateArticle } from "@/articles/persistence/write";
import type { ArticleRow } from "@/articles/persistence/record";

const writes = vi.hoisted(() => ({
  row: vi.fn(),
  read: vi.fn(),
  set: vi.fn(),
  result: vi.fn(),
  object: vi.fn(),
  index: vi.fn(),
  removeIndex: vi.fn(),
  put: vi.fn(),
  head: vi.fn(),
  removeObject: vi.fn(),
  removeCache: vi.fn(),
  translations: vi.fn(),
  removeRow: vi.fn(),
}));
vi.mock("@opennextjs/cloudflare", () => ({
  getCloudflareContext: async () => ({
    env: {
      DB: {},
      KNOWLEDGE_BUCKET: {
        get: writes.object,
        put: writes.put,
        head: writes.head,
        delete: writes.removeObject,
      },
      KNOWLEDGE_CACHE: { delete: writes.removeCache },
    },
  }),
}));
vi.mock("@/articles/persistence/document", () => ({
  getArticleRow: writes.row,
  readArticle: writes.read,
}));
vi.mock("@/articles/persistence/ai-search", () => ({
  indexChineseArticle: writes.index,
  deleteSearchItem: writes.removeIndex,
}));
vi.mock("drizzle-orm/d1", () => ({
  drizzle: () => ({
    update: () => ({ set: writes.set }),
    select: () => ({ from: () => ({ where: writes.translations }) }),
    delete: () => ({ where: () => ({ returning: () => ({ get: writes.removeRow }) }) }),
  }),
}));
beforeEach(() => {
  vi.resetAllMocks();
  writes.set.mockReturnValue({ where: () => ({ returning: () => ({ get: writes.result }) }) });
});

it.each([undefined, "private"])(
  "refreshes derived links on an unchanged save with visibility %s",
  async (visibility) => {
    const document = await parseArticleDocuments({
      zh: "---\ntitle: Source\nsummary: Summary\ntags: []\n---\n```embed:article\nhttps://knowledge.you-find.me/articles/target\n```",
    });
    const previous: ArticleRow = {
      id: "source",
      title: "Source",
      summary: "Summary",
      tagsJson: "[]",
      linksJson: "[]",
      contentHash: document.contentHash,
      visibility: "public",
      createdAt: "2026-09-01",
      updatedAt: "2026-09-01",
    };
    writes.row.mockResolvedValue(previous);
    const updated = {
      ...previous,
      linksJson: JSON.stringify(document.links),
      updatedAt: expect.any(String),
      ...(visibility === undefined ? {} : { visibility }),
    };
    writes.result.mockResolvedValue(updated);
    const { env } = await getCloudflareContext({ async: true });
    await updateArticle(
      env,
      previous.id,
      document.contentHash,
      document,
      visibility === "private" ? "private" : undefined,
    );
    expect(writes.set).toHaveBeenCalledWith({
      linksJson: JSON.stringify(document.links),
      updatedAt: expect.any(String),
      ...(visibility === undefined ? {} : { visibility }),
    });
    expect(writes.read).toHaveBeenCalledWith(env, updated);
    expect(writes.object).not.toHaveBeenCalled();
    expect(writes.index).not.toHaveBeenCalled();
  },
);

const previous: ArticleRow = {
  id: "source",
  title: "Source",
  summary: "Summary",
  tagsJson: "[]",
  linksJson: "[]",
  contentHash: "a".repeat(64),
  visibility: "public",
  createdAt: "2026-09-01",
  updatedAt: "2026-09-01",
};
const markdown = "---\ntitle: Source\nsummary: Summary\ntags: []\n---\nOld body";

it("does not clean another writer's index after a conditional write loses", async () => {
  writes.row.mockResolvedValue(previous);
  writes.object.mockResolvedValue({
    text: async () => markdown,
    etag: "old",
    customMetadata: { contentHash: previous.contentHash },
  });
  writes.put.mockResolvedValue(null);
  const document = await parseArticleDocuments({ zh: markdown.replace("Old body", "New body") });
  const { env } = await getCloudflareContext({ async: true });
  await expect(updateArticle(env, previous.id, previous.contentHash, document)).rejects.toThrow(
    "Markdown changed while writing",
  );
  expect(writes.removeIndex).not.toHaveBeenCalled();
  expect(writes.removeCache).not.toHaveBeenCalled();
  expect(writes.index).not.toHaveBeenCalled();
});

it("rejects a canonical object from a different in-flight version before writing", async () => {
  writes.row.mockResolvedValue(previous);
  writes.object.mockResolvedValue({
    text: async () => markdown,
    etag: "other",
    customMetadata: { contentHash: "b".repeat(64) },
  });
  const document = await parseArticleDocuments({ zh: markdown.replace("Old body", "New body") });
  const { env } = await getCloudflareContext({ async: true });
  await expect(updateArticle(env, previous.id, previous.contentHash, document)).rejects.toThrow(
    "Article version changed",
  );
  expect(writes.put).not.toHaveBeenCalled();
  expect(writes.removeIndex).not.toHaveBeenCalled();
});

it("does not clean the index when a rollback no longer owns the canonical object", async () => {
  writes.row.mockResolvedValue(previous);
  writes.object.mockResolvedValue({
    text: async () => markdown,
    etag: "old",
    customMetadata: { contentHash: previous.contentHash },
  });
  writes.put.mockResolvedValue({ etag: "written" });
  writes.index.mockRejectedValue(new Error("Index unavailable"));
  writes.head.mockResolvedValue({ etag: "other-writer" });
  const document = await parseArticleDocuments({ zh: markdown.replace("Old body", "New body") });
  const { env } = await getCloudflareContext({ async: true });
  await expect(updateArticle(env, previous.id, previous.contentHash, document)).rejects.toThrow(
    "Article update and cleanup both failed",
  );
  expect(writes.removeIndex).not.toHaveBeenCalled();
  expect(writes.removeCache).not.toHaveBeenCalled();
});

it("retries deletion after canonical objects were deleted but search cleanup failed", async () => {
  writes.row.mockResolvedValue(previous);
  writes.result.mockResolvedValue({ id: previous.id });
  writes.translations.mockResolvedValue([{ locale: "en", sourceHash: previous.contentHash }]);
  writes.object
    .mockResolvedValueOnce({
      text: async () => markdown,
      etag: "old",
      customMetadata: { contentHash: previous.contentHash },
    })
    .mockResolvedValue(null);
  writes.head.mockResolvedValue({ etag: "old" });
  writes.removeIndex
    .mockRejectedValueOnce(new Error("Search unavailable"))
    .mockResolvedValue(undefined);
  writes.removeRow.mockResolvedValue({ id: previous.id });
  const { env } = await getCloudflareContext({ async: true });
  await expect(deleteArticle(env, previous.id, previous.contentHash)).rejects.toThrow(
    "Article version cleanup failed",
  );
  expect(writes.set).toHaveBeenCalledWith({ visibility: "private" });
  expect(writes.removeRow).not.toHaveBeenCalled();
  await expect(deleteArticle(env, previous.id, previous.contentHash)).resolves.toBe(true);
  expect(writes.removeObject).toHaveBeenCalledWith("knowledge/source/zh.md");
  expect(writes.removeRow).toHaveBeenCalledTimes(1);
});

it("hides an article before a canonical read fails during deletion", async () => {
  writes.row.mockResolvedValue(previous);
  writes.result.mockResolvedValue({ id: previous.id });
  writes.object.mockRejectedValue(new Error("R2 unavailable"));
  const { env } = await getCloudflareContext({ async: true });
  await expect(deleteArticle(env, previous.id, previous.contentHash)).rejects.toThrow(
    "R2 unavailable",
  );
  expect(writes.set).toHaveBeenCalledWith({ visibility: "private" });
  expect(writes.removeRow).not.toHaveBeenCalled();
});
