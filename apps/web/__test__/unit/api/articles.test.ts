import { describe, expect, it } from "vite-plus/test";

import { articleCreateSchema, articleListQuerySchema, articlePatchSchema } from "@/api/articles";
import { articles } from "@/db/schema";

describe("article REST contract", () => {
  it("keeps visibility out of create input and defaults stored rows to public", () => {
    expect(
      articleCreateSchema.safeParse({
        title: "Title",
        summary: "Summary",
        body: "Body",
        tags: [],
        visibility: "private",
      }).success,
    ).toBe(false);
    expect(articles.visibility.default).toBe("public");
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

  it("accepts content and visibility together in one draft save", () => {
    expect(
      articlePatchSchema.safeParse({
        expectedHash: "a".repeat(64),
        expectedUpdatedAt: "2026-09-01T00:00:00.000Z",
        title: "Title",
        summary: "Summary",
        body: "Body",
        tags: [],
        visibility: "private",
      }).success,
    ).toBe(true);
  });

  it("accepts completed Chinese with optional supplied editions", () => {
    expect(
      articleCreateSchema.safeParse({
        documents: { zh: "Chinese", en: "English", ja: "Japanese" },
      }).success,
    ).toBe(true);
  });
});
