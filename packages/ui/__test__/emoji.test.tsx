import { expect, it } from "vite-plus/test";
import { renderToStaticMarkup } from "react-dom/server";
import { Fragment } from "react";
import { jsx, jsxs } from "react/jsx-runtime";
import remarkRehype from "remark-rehype";
import rehypeReact from "rehype-react";
import { createEmojiCatalog, markdownParser, imageEmojis } from "@my-knowledge/content";
import { markdownEmoji } from "../src/markdown-emoji";

const pack = {
  key: "test",
  name: "Test",
  display: "sticker" as const,
  items: [{ name: "开心", value: "https://example.com/test.gif?a=1&b=2" }],
};

it("renders known shortcodes in prose and preserves protected Markdown", async () => {
  const source =
    ":test_开心: **:test_开心:** :missing_x: `:test_开心:`\n\n```\n:test_开心:\n```\n\n[:test_开心:](https://example.com/:test_开心:) ![:test_开心:](https://example.com/img.png)";
  const result = await markdownParser()
    .use(remarkRehype)
    .use(markdownEmoji, createEmojiCatalog([pack]))
    .use(rehypeReact, { Fragment, jsx, jsxs })
    .process(source);
  const html = renderToStaticMarkup(result.result);
  expect(html.match(/class="markdown-emoji /gu)).toHaveLength(2);
  expect(html).toContain("a=1&amp;b=2");
  expect(html).toContain("markdown-emoji-sticker");
  expect(html).toContain(":missing_x:");
  expect(html).toContain("<code>:test_开心:</code>");
  expect(html).toContain('alt=":test_开心:"');
  expect(html).toContain(">:test_开心:</a>");
});

it("rejects unsafe image URLs and duplicate shortcodes", () => {
  for (const value of [
    "javascript:alert(1)",
    "http://example.com/x",
    "https://user:secret@example.com/x",
  ]) {
    expect(() => createEmojiCatalog([{ ...pack, items: [{ name: "x", value }] }])).toThrow();
  }
  expect(() => createEmojiCatalog([pack, pack])).toThrow("Duplicate emoji shortcode");
});

it("uses the selected catalog in the real article renderer", async () => {
  const { Markdown } = await import("../src/markdown");
  const view = await Markdown({
    labels: {
      canvas: "Canvas",
      canvasRelationships: "Relationships",
      canvasViewport: "Canvas viewport",
      chart: "Chart",
      diagram: "Diagram",
      renderingDiagram: "Rendering",
      spatialView: "Spatial view",
    },
    markdown:
      "Before :suzume5_01: after :baishengnv_117: :suzume_思考: :suzume_期待: `:suzume5_01:` $:suzume5_01:$ :missing_01:",
    structuredBlock: () => null,
  });
  const html = renderToStaticMarkup(view);
  expect(imageEmojis.size).toBe(163);
  expect(html.match(/class="markdown-emoji /gu)).toHaveLength(4);
  expect(html).toContain("<code>:suzume5_01:</code>");
  expect(html).toContain(":missing_01:");
});
