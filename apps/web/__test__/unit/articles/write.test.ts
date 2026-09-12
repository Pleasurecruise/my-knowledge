import { parseArticleDocuments } from "@my-knowledge/content";
import { getCloudflareContext } from "@opennextjs/cloudflare";
import { beforeEach, expect, it, vi } from "vite-plus/test";
import { updateArticle } from "@/articles/persistence/write";
import type { ArticleRow } from "@/articles/persistence/record";

const writes = vi.hoisted(() => ({
  row: vi.fn(),
  read: vi.fn(),
  set: vi.fn(),
  result: vi.fn(),
  object: vi.fn(),
  index: vi.fn(),
}));
vi.mock("@opennextjs/cloudflare", () => ({
  getCloudflareContext: async () => ({ env: { DB: {}, KNOWLEDGE_BUCKET: { get: writes.object } } }),
}));
vi.mock("@/articles/persistence/document", () => ({
  getArticleRow: writes.row,
  readArticle: writes.read,
}));
vi.mock("@/articles/persistence/ai-search", () => ({
  indexChineseArticle: writes.index,
  deleteSearchItem: vi.fn(),
}));
vi.mock("drizzle-orm/d1", () => ({
  drizzle: () => ({ update: () => ({ set: writes.set }) }),
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
      slug: "source",
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
      ...(visibility === undefined ? {} : { visibility }),
    });
    expect(writes.read).toHaveBeenCalledWith(env, updated);
    expect(writes.object).not.toHaveBeenCalled();
    expect(writes.index).not.toHaveBeenCalled();
  },
);
