import { readFileSync } from "node:fs";
import { DatabaseSync } from "node:sqlite";
import { describe, expect, it } from "vite-plus/test";

import { articleJobTtlSeconds } from "@/article-jobs/application";
import { articleJobMessageSchema } from "@/article-jobs/types";

describe("article job boundaries", () => {
  it("keeps create input temporary", () => {
    expect(articleJobTtlSeconds).toBe(48 * 60 * 60);
  });

  it("accepts create and locale-specific translation messages without article content", () => {
    const articleId = "11111111-1111-4111-8111-111111111111";
    expect(articleJobMessageSchema.parse({ type: "create", articleId })).toEqual({
      type: "create",
      articleId,
    });
    expect(
      articleJobMessageSchema.parse({
        type: "translate",
        articleId,
        locale: "en",
        sourceHash: "a".repeat(64),
      }),
    ).toEqual({
      type: "translate",
      articleId,
      locale: "en",
      sourceHash: "a".repeat(64),
    });
    expect(
      articleJobMessageSchema.safeParse({ type: "create", articleId, content: "not allowed" })
        .success,
    ).toBe(false);
  });

  it("rebuilds content storage without durable jobs", () => {
    const database = new DatabaseSync(":memory:");
    database.exec("PRAGMA foreign_keys = ON");
    database.exec(
      readFileSync(new URL("../../../migrations/0001_initial.sql", import.meta.url), "utf8"),
    );
    const tables = database
      .prepare("SELECT name FROM sqlite_master WHERE type = 'table' ORDER BY name")
      .all()
      .map((row) => row.name);
    expect(tables).not.toContain("articleJobs");
    expect(tables).toContain("articleTranslations");

    database
      .prepare(
        "INSERT INTO articles (id, slug, title, summary, contentHash, tagsJson, linksJson, createdAt, updatedAt) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)",
      )
      .run("article-1", "first", "中文", "摘要", "same-hash", "[]", "[]", "now", "now");
    const article = database
      .prepare("SELECT visibility FROM articles WHERE id = ?")
      .get("article-1");
    expect(article?.visibility).toBe("public");

    const insertTranslation = database.prepare(
      "INSERT INTO articleTranslations (articleId, locale, title, summary, sourceHash) VALUES (?, ?, ?, ?, ?)",
    );
    insertTranslation.run("article-1", "en", "English", "Summary", "same-hash");
    expect(() =>
      insertTranslation.run("article-1", "en", "Duplicate", "Summary", "same-hash"),
    ).toThrow();
    database.close();
  });
});
