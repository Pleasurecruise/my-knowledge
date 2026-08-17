import { DatabaseSync } from "node:sqlite";
import { describe, expect, it } from "vite-plus/test";

import { authorizedCondition, tagCountQuery } from "@/articles/persistence/query";

describe("article query authorization", () => {
  it("adds a visibility predicate only for anonymous reads", () => {
    expect(authorizedCondition("anonymous")).toBeDefined();
    expect(authorizedCondition("owner")).toBeUndefined();
  });

  it("counts each article once for every hierarchical tag path", () => {
    const database = new DatabaseSync(":memory:");
    database.exec(`
      CREATE TABLE articles (
        id TEXT PRIMARY KEY,
        tagsJson TEXT NOT NULL,
        visibility TEXT NOT NULL
      );
      INSERT INTO articles (id, tagsJson, visibility) VALUES
        ('public-one', '["engineering/architecture","engineering/testing/privacy"]', 'public'),
        ('public-two', '["engineering/architecture"]', 'public'),
        ('private-one', '["private/security"]', 'private');
    `);

    expect(database.prepare(tagCountQuery).all(1)).toEqual([
      { path: "engineering", count: 2 },
      { path: "engineering/architecture", count: 2 },
      { path: "engineering/testing", count: 1 },
      { path: "engineering/testing/privacy", count: 1 },
    ]);
    expect(database.prepare(tagCountQuery).all(0)).toContainEqual({ path: "private", count: 1 });
    database.close();
  });
});
