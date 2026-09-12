import { expect, it } from "vite-plus/test";
import { parseArticleDocument, parseArticleDocuments, readArticleDocument } from "../src/index";
const source = (body: string) => `---\ntitle: Article\nsummary: Summary\ntags: []\n---\n${body}`;
it("indexes normalized article-list URLs separately from wiki slugs, excluding ordinary code", () => {
  const body =
    "[[target]]\n\n```embed:article\nhttps://knowledge.you-find.me/articles/target/#heading\n```\n\n```embed:article\nhttps://knowledge.you-find.me/articles/target?lang=en\n```\n\n```embed:article\nhttps://example.com\n```\n\n```text\nid: ignored\n```";
  expect(parseArticleDocument(source(body)).links).toEqual([
    "target",
    "https://knowledge.you-find.me/articles/target",
    "https://example.com/",
  ]);
});
it("requires translated editions to preserve article-list targets", async () => {
  await expect(
    parseArticleDocuments({
      zh: source("```embed:article\nhttps://knowledge.you-find.me/articles/first\n```"),
      en: source("```embed:article\nhttps://knowledge.you-find.me/articles/second\n```"),
    }),
  ).rejects.toThrow("link targets");
});

it("reads existing article source for repair while rejecting invalid new submissions", () => {
  const markdown = source("Before.\n\n```embed:article\nid: removed-target\n```\n\nAfter.");
  expect(readArticleDocument(markdown).body).toContain("id: removed-target");
  expect(() => parseArticleDocument(markdown)).toThrow("Invalid article list URL");
});

it("indexes url fields and bare URLs as the same article relationship", () => {
  const url = "https://knowledge.you-find.me/articles/target";
  expect(
    parseArticleDocument(source(`\`\`\`embed:article\nurl: ${url}#section\nalign: narrow\n\`\`\``))
      .links,
  ).toEqual(parseArticleDocument(source(`\`\`\`embed:article\n${url}\n\`\`\``)).links);
});
