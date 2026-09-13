import { describe, expect, it } from "vite-plus/test";

import { markdownEquivalent } from "../src/markdown-equivalence";

describe("Markdown editor compatibility", () => {
  it("accepts equivalent formatting without source positions", () => {
    expect(markdownEquivalent("**Bold**\n\n- First\n", "__Bold__\n\n* First")).toBe(true);
  });
  it("rejects lost images, math and code metadata", () => {
    for (const [source, candidate] of [
      ["![alt](https://example.com/a.png)", "alt"],
      ["$x^2$", "x^2"],
      ["```ts file.ts\nconst x = 1;\n```", "```ts\nconst x = 1;\n```"],
    ] satisfies [string, string][])
      expect(markdownEquivalent(source, candidate)).toBe(false);
  });
  it("preserves structured fences and GFM tables", () => {
    const source =
      "```embed:article\nhttps://knowledge.you-find.me/articles/target\n```\n\n| a |\n| :- |\n| b |";
    expect(markdownEquivalent(source, source)).toBe(true);
    expect(markdownEquivalent(source, source.replace("target", "other"))).toBe(false);
  });
});
