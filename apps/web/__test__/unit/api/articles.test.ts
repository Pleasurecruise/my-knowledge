import { describe, expect, it } from "vite-plus/test";
import { initialArticleVisibility } from "@my-knowledge/content";

import { articleCreateSchema, articleListQuerySchema, articlePatchSchema } from "@/api/articles";

describe("article REST contract", () => {
  it("creates articles as public", () => {
    expect(initialArticleVisibility).toBe("public");
  });

  it("parses bounded pagination and repeated hierarchical tags", () => {
    const url = new URL(
      "https://example.com/api/articles?visibility=private&tag=engineering&tag=testing/privacy&limit=50&cursor=next",
    );
    const parsed = articleListQuerySchema.safeParse({
      ...Object.fromEntries(url.searchParams.entries()),
      tags: url.searchParams.getAll("tag"),
    });
    expect(parsed.success && parsed.data).toEqual({
      visibility: "private",
      tags: ["engineering", "testing/privacy"],
      limit: 50,
      cursor: "next",
    });
  });

  it("rejects mixed content and visibility patches", () => {
    expect(
      articlePatchSchema.safeParse({
        expectedHash: "a".repeat(64),
        title: "Title",
        summary: "Summary",
        body: "Body",
        tags: [],
        visibility: "private",
      }).success,
    ).toBe(false);
  });

  it("accepts completed Chinese with optional supplied editions", () => {
    expect(
      articleCreateSchema.safeParse({
        documents: { zh: "Chinese", en: "English", ja: "Japanese" },
      }).success,
    ).toBe(true);
  });
});
