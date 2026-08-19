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
      status: "duplicate",
      articleId: "22222222-2222-4222-8222-222222222222",
      score: 0.97,
    });
    expect(parseArticleJobResult(row("duplicate", resultJson))).toEqual({
      status: "duplicate",
      articleId: "22222222-2222-4222-8222-222222222222",
      score: 0.97,
    });
  });

  it("rejects a result whose discriminant differs from the row status", () => {
    const resultJson = JSON.stringify({
      status: "created",
      articleId: "22222222-2222-4222-8222-222222222222",
    });
    expect(() => parseArticleJobResult(row("duplicate", resultJson))).toThrow(
      "Article job status does not match its result",
    );
  });

  it("enforces pending and terminal result constraints in the migration", () => {
    const database = new DatabaseSync(":memory:");
    const migration = readFileSync(
      new URL("../../../migrations/0002_article_jobs.sql", import.meta.url),
      "utf8",
    );
    database.exec(migration);
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
    database.close();
  });
});
