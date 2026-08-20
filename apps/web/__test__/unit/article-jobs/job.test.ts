import { readFileSync } from "node:fs";
import { DatabaseSync } from "node:sqlite";
import { describe, expect, it } from "vite-plus/test";

import { articleJobInputTtlSeconds } from "@/article-jobs/application";
import { parseArticleJobResult, type ArticleJobRow } from "@/article-jobs/persistence";
import { articleJobInputKey, articleJobMessageSchema } from "@/article-jobs/types";

function row(status: ArticleJobRow["status"], resultJson: string | null): ArticleJobRow {
  return {
    id: "11111111-1111-4111-8111-111111111111",
    status,
    resultJson,
    createdAt: "2026-08-18T00:00:00.000Z",
    updatedAt: "2026-08-18T00:00:00.000Z",
  };
}

describe("article job boundaries", () => {
  it("uses an expiring namespaced input key and a job-only queue message", () => {
    const jobId = "11111111-1111-4111-8111-111111111111";
    expect(articleJobInputKey(jobId)).toBe(`article-jobs/${jobId}/input`);
    expect(articleJobInputTtlSeconds).toBe(48 * 60 * 60);
    expect(articleJobMessageSchema.parse({ jobId })).toEqual({ jobId });
    expect(
      articleJobMessageSchema.safeParse({ jobId, content: "must not enter Queue" }).success,
    ).toBe(false);
  });

  it("parses terminal references without storing article content", () => {
    const resultJson = JSON.stringify({
      status: "created",
      articleId: "22222222-2222-4222-8222-222222222222",
    });
    expect(parseArticleJobResult(row("created", resultJson))).toEqual({
      status: "created",
      articleId: "22222222-2222-4222-8222-222222222222",
    });
  });

  it("rejects a result whose discriminant differs from the row status", () => {
    const resultJson = JSON.stringify({
      status: "created",
      articleId: "22222222-2222-4222-8222-222222222222",
    });
    expect(() => parseArticleJobResult(row("failed", resultJson))).toThrow(
      "Article job status does not match its result",
    );
  });

  it("parses a sanitized terminal failure", () => {
    expect(
      parseArticleJobResult(
        row("failed", JSON.stringify({ status: "failed", error: "Article creation failed" })),
      ),
    ).toEqual({ status: "failed", error: "Article creation failed" });
  });

  it("creates the reduced job state machine and permits repeated content hashes", () => {
    const database = new DatabaseSync(":memory:");
    for (const name of ["0001_initial.sql", "0002_article_jobs.sql"]) {
      database.exec(readFileSync(new URL(`../../../migrations/${name}`, import.meta.url), "utf8"));
    }
    database
      .prepare(
        "INSERT INTO articleJobs (id, status, resultJson, createdAt, updatedAt) VALUES (?, ?, ?, ?, ?)",
      )
      .run("pending", "pending", null, "now", "now");
    expect(() =>
      database
        .prepare(
          "INSERT INTO articleJobs (id, status, resultJson, createdAt, updatedAt) VALUES (?, ?, ?, ?, ?)",
        )
        .run("invalid", "created", null, "now", "now"),
    ).toThrow();
    const article = ["same-hash", "{}", "[]", "[]", "private", "now", "now"] as const;
    const insertArticle = database.prepare(
      "INSERT INTO articles (id, slug, contentHash, metaJson, tagsJson, linksJson, visibility, createdAt, updatedAt) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)",
    );
    insertArticle.run("article-1", "first", ...article);
    expect(() => insertArticle.run("article-2", "second", ...article)).not.toThrow();
    database.close();
  });
});
