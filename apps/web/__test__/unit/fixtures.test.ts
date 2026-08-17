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
      "99565281b97b58653d28bb2a051ccc2ff0be870cd2f1f2116f9a45b5c6c071b5",
    );
  });

  it("keeps the related article locale editions structurally compatible", async () => {
    const article = await parseArticleDocuments(await documents("related"));
    expect(article.links).toEqual([]);
    expect(article.tags).toEqual(["engineering/architecture"]);
    expect(article.contentHash).toBe(
      "266ed4837c32e892b9e1ca59e4339bf9206e8a31be0544d81437a25fc30b7400",
    );
  });

  it("keeps the private deletion fixture deterministic", async () => {
    const article = await parseArticleDocuments(await documents("private"));
    expect(article.tags).toEqual(["testing/privacy"]);
    expect(article.contentHash).toBe(
      "9859fec5e397ef21b07ff25a813a3149e46fda460fca71d5e5871e74823152c3",
    );
  });
});
