import type { RootContent } from "mdast";
import { expect, it, vi } from "vite-plus/test";
import { renderToStaticMarkup } from "react-dom/server";
import {
  parseArticleDocument,
  serializeArticleDocument,
  markdownParser,
} from "@my-knowledge/content";
import { Markdown } from "../src/markdown";

const labels = {
  canvas: "Canvas",
  canvasRelationships: "Relationships",
  canvasViewport: "Canvas viewport",
  chart: "Chart",
  diagram: "Diagram",
  renderingDiagram: "Rendering",
  spatialView: "Spatial view",
};
const dialects = [
  ["annotation", "mark: 内容优先\nnote: 让文字成为主角\ncolor: red\n---\n我的博客坚持内容优先。"],
  ["github", "repo: Pleasurecruise/my-workspace\nalign: left"],
  ["stock", "code: AAPL"],
  ["architecture", "align: wide\nflowchart LR\n   Client --> API\n   API --> Database"],
  [
    "storyboard",
    "title: 发布流程\nstep: 编写 | 完成 Markdown 内容\nstep: 构建 | 编译并验证内容\nstep: 发布 | 上传生成的产物",
  ],
  ["link", "url: https://ogp.me/\nalign: wide"],
  [
    "media",
    "type: audio\nsrc: https://github.com/Pleasurecruise/pleasure1234/blob/main/public/cat.mp3\nalign: narrow",
  ],
  ["article", "url: https://knowledge.you-find.me/articles/example\nalign: narrow"],
  [
    "quote",
    "author: Project notes\nurl: https://example.com/source\n---\nKeep the knowledge and its context.",
  ],
  [
    "diff",
    'title: Publication default\n---\n--- a/config.ts\n+++ b/config.ts\n@@ -1 +1 @@\n-const visibility = "private";\n+const visibility = "public";',
  ],
];

it("separates all nested source examples from the following live dialects", async () => {
  const sources = dialects.map(([kind, body]) => `\`\`\`embed:${kind}\n${body}\n\`\`\``);
  const markdown = sources
    .map((source, index) => `${index + 1}. Example\n\n\`\`\`\n${source}\n\`\`\`\n\n${source}`)
    .join("\n\n");
  const document = parseArticleDocument(
    serializeArticleDocument({
      title: "Examples",
      summary: "Dialect examples",
      tags: [],
      body: markdown,
    }),
  );
  const codes = markdownParser
    .parse(document.body)
    .children.filter((node: RootContent) => node.type === "code");
  expect(codes).toHaveLength(dialects.length * 2);
  for (const [index, source] of sources.entries()) {
    expect(codes[index * 2]).toMatchObject({ lang: "markdown", value: source });
    expect(codes[index * 2 + 1]?.lang).toBe(`embed:${dialects[index]?.[0]}`);
  }
  const resolve = vi.fn(async () => ({
    type: "element" as const,
    tagName: "div",
    properties: {},
    children: [],
  }));
  const html = renderToStaticMarkup(
    await Markdown({
      markdown: document.body,
      labels,
      structuredBlock: () => null,
      embeds: resolve,
    }),
  );
  expect(html.match(/data-language="markdown"/gu)).toHaveLength(dialects.length);
  const sourceBlocks = html.match(/<pre[^>]*data-language="markdown"[^>]*>[\s\S]*?<\/pre>/gu) ?? [];
  for (const [index, block] of sourceBlocks.entries()) {
    expect(block.match(/class="line"/gu)?.length).toBe(sources[index]?.split("\n").length);
  }
  expect(html).not.toContain("markdown-block-error");
  expect(resolve).toHaveBeenCalledTimes(4);
  for (const node of codes) {
    const start = node.position?.start.offset;
    expect(start).toBeDefined();
    expect(document.body.slice(start, (start ?? 0) + 3)).toBe("```");
  }
});
