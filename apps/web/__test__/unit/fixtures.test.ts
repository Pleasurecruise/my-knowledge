import { readFile } from "node:fs/promises";
import { parseArticleDocuments } from "@my-knowledge/content";
import { describe, expect, it } from "vite-plus/test";

async function documents(name: "private" | "related" | "rich") {
  return Object.fromEntries(
    await Promise.all(
      ["zh", "en", "ja"].map(async (locale): Promise<[string, string]> => [
        locale,
        await readFile(new URL(`../fixtures/${name}/${locale}.md`, import.meta.url), "utf8"),
      ]),
    ),
  );
}

describe("browser fixtures", () => {
  it("keeps all rich-content locale editions structurally compatible", async () => {
    const article = await parseArticleDocuments(await documents("rich"));
    expect(Object.keys(article.editions)).toEqual(["zh", "en", "ja"]);
    expect(article.links).toEqual(["related-article"]);
    expect(article.contentHash).toBe(
      "60a93252b4aad827daa74851a0b1ff889226fef40b87c55e74cde3493f8c9370",
    );
  });

  it("keeps the related article locale editions structurally compatible", async () => {
    const article = await parseArticleDocuments(await documents("related"));
    expect(article.links).toEqual([]);
    expect(article.tags).toEqual(["engineering/architecture"]);
    expect(article.contentHash).toBe(
      "ff05da72f85e25930d01f0e144564d58c100a01e5fc86f467075b89f591f8c72",
    );
  });

  it("keeps the private deletion fixture deterministic", async () => {
    const article = await parseArticleDocuments(await documents("private"));
    expect(article.tags).toEqual(["testing/privacy"]);
    expect(article.contentHash).toBe(
      "24127f5139323ac615200058d1cc566fcc55d7fbd37563f93aa153992d3e3725",
    );
  });
});
