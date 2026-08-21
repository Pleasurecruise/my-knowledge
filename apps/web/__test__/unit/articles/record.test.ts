import { describe, expect, it } from "vite-plus/test";

import { articleObjectKey, articleSummary, type ArticleRow } from "@/articles/persistence/record";

describe("article object keys", () => {
  it("stores Chinese Markdown below a stable article ID", () => {
    expect(articleObjectKey("11111111-1111-4111-8111-111111111111", "zh")).toBe(
      "knowledge/11111111-1111-4111-8111-111111111111/zh.md",
    );
  });

  it("stores translations below the article i18n prefix", () => {
    expect(articleObjectKey("11111111-1111-4111-8111-111111111111", "en")).toBe(
      "knowledge/11111111-1111-4111-8111-111111111111/i18n/en.md",
    );
  });

  it("exposes only translations derived from the current Chinese hash", () => {
    const row: ArticleRow = {
      id: "11111111-1111-4111-8111-111111111111",
      slug: "canonical-chinese",
      title: "中文标题",
      summary: "中文摘要。",
      contentHash: "a".repeat(64),
      tagsJson: "[]",
      linksJson: "[]",
      visibility: "public",
      createdAt: "2026-08-21T00:00:00.000Z",
      updatedAt: "2026-08-21T00:00:00.000Z",
    };
    expect(
      articleSummary(row, [
        {
          articleId: row.id,
          locale: "en",
          title: "Current",
          summary: "Current translation.",
          sourceHash: row.contentHash,
        },
        {
          articleId: row.id,
          locale: "ja",
          title: "古い翻訳",
          summary: "古い翻訳。",
          sourceHash: "b".repeat(64),
        },
      ]).editions,
    ).toEqual({
      en: { title: "Current", summary: "Current translation." },
      zh: { title: "中文标题", summary: "中文摘要。" },
    });
  });
});
