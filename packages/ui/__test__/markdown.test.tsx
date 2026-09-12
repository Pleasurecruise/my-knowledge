import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vite-plus/test";

import { extractHeadings } from "@my-knowledge/content";

import { CanvasBlock } from "../src/canvas-block";
import { Markdown } from "../src/markdown";
import type { StructuredBlockProps } from "../src/structured-block.types";

const labels = {
  canvas: "JSON Canvas",
  canvasRelationships: "Canvas relationships",
  canvasViewport: "Scrollable JSON Canvas",
  chart: "Vega-Lite chart",
  diagram: "Mermaid diagram",
  renderingDiagram: "Rendering diagram…",
  spatialView: "Spatial view",
};

function StructuredBlock(props: StructuredBlockProps) {
  if (props.language === "mermaid") return <p>{props.renderingDiagram}</p>;
  if (props.language === "json-canvas") return <CanvasBlock {...props} />;
  return <p>{props.chart}</p>;
}

describe("Markdown", () => {
  it("keeps the prototype canvas profiles and shorthand diagrams", async () => {
    const result = await Markdown({
      labels,
      structuredBlock: StructuredBlock,
      markdown: `~~~embed:architecture
align: left
<svg viewBox="0 0 320 120"><title>Request path</title><desc>A request reaches the service.</desc><g class="node c-red"><rect x="10" y="20" width="120" height="60"/><text class="t" x="24" y="54">Client</text></g><path class="leader" d="M130 50 L190 50"/></svg>
~~~

~~~embed:storyboard
align: right
<svg viewBox="0 0 320 120"><title>Draft sequence</title><desc>A hand-drawn note.</desc><path class="scribble" d="M10 15 L130 13"/><text class="hand title" x="24" y="46">Draft</text></svg>
~~~

~~~embed:architecture
flowchart LR
客户端 [浏览器] --> API [服务]
~~~

~~~embed:storyboard
title: 发布流程
step: 编写 | 完成内容
step: 发布 | 上传产物
~~~`,
    });
    const html = renderToStaticMarkup(result);
    expect(html).toContain("markdown-embed-architecture");
    expect(html).toContain("markdown-embed-storyboard");
    expect(html).toContain('class="node c-red"');
    expect(html).toContain('class="scribble"');
    expect(html).toContain('class="leader"');
    expect(html).toContain("浏览器</text>");
    expect(html).toContain("发布流程</title>");
    expect(html).toContain('class="sketch-shadow"');
    expect(html).not.toContain("Rendering diagram");
  });
  it("preserves structured JSON entities and highlights tilde code fences", async () => {
    const result = await Markdown({
      labels,
      structuredBlock: StructuredBlock,
      markdown:
        '~~~json-canvas\n{"nodes":[{"id":"one","type":"text","text":"&quot;quoted&quot;","x":0,"y":0,"width":200,"height":100}],"edges":[]}\n~~~\n\n~~~ts\nconst answer = 42;\n~~~',
    });
    const html = renderToStaticMarkup(result);
    expect(html).toContain("&amp;quot;quoted&amp;quot;");
    expect(html).toContain('data-language="ts"');
  });
  it("renders portable semantics and removes unsafe source HTML", async () => {
    const element = await Markdown({
      structuredBlock: StructuredBlock,
      labels,
      markdown: `---
title: Render fixture
summary: Renderer coverage.
tags: []
---
> [!NOTE] Keep the boundary explicit.

Read [[target-article|the source]].

<script>alert(1)</script>

[unsafe](javascript:alert(1))
`,
    });
    const html = renderToStaticMarkup(element);
    expect(html).toContain('class="callout callout-note"');
    expect(html).toContain('href="/articles/target-article"');
    expect(html).not.toContain("<script");
    expect(html).not.toContain("javascript:");
  });

  it("preserves math and maps structured fences to dedicated components", async () => {
    const element = await Markdown({
      structuredBlock: StructuredBlock,
      labels,
      markdown: `Inline $x^2$.

\`\`\`mermaid
graph LR
  A --> B
\`\`\`
`,
    });
    const html = renderToStaticMarkup(element);
    expect(html).toContain("katex");
    expect(html).toContain("Rendering diagram");
    expect(html).not.toContain("language-mermaid");
    expect(html).not.toContain('class="shiki');
  });

  it("uses the fine-grained Shiki bundle with aliases and dual themes", async () => {
    const element = await Markdown({
      structuredBlock: StructuredBlock,
      labels,
      markdown: `\`\`\`ts
const answer: number = 42;
\`\`\`

\`\`\`bash
echo "ready"
\`\`\``,
    });
    const html = renderToStaticMarkup(element);
    expect(html).toContain('class="shiki shiki-themes github-light github-dark"');
    expect(html).toContain('data-language="ts"');
    expect(html).toContain('data-language="bash"');
    expect(html).toContain("--shiki-dark");
    expect(html).toContain('class="line"');
  });

  it("decodes code entities and renders unknown languages as escaped plain text", async () => {
    const element = await Markdown({
      structuredBlock: StructuredBlock,
      labels,
      markdown: `Inline \`&lt;main&gt;\`.

\`\`\`unknown-language
&lt;main&gt;
\`\`\``,
    });
    const html = renderToStaticMarkup(element);
    expect(html).toContain("<code>&lt;main&gt;</code>");
    expect(html).not.toContain("&amp;lt;main&amp;gt;");
    expect(html).toContain("&lt;main&gt;");
  });

  it("leaves the document title to the article page", async () => {
    const element = await Markdown({
      structuredBlock: StructuredBlock,
      labels,
      markdown: "## Body section",
    });
    const html = renderToStaticMarkup(element);
    expect(html).not.toContain("<h1");
    expect(html).toContain('<h2 id="body-section">Body section</h2>');
  });

  it("anchors every body heading and wraps wide tables", async () => {
    const element = await Markdown({
      structuredBlock: StructuredBlock,
      labels,
      markdown: `# Body title

###### Detail

| Name | Value |
| --- | --- |
| A | B |`,
    });
    const html = renderToStaticMarkup(element);
    expect(html).toContain('<h1 id="body-title">Body title</h1>');
    expect(html).toContain('<h6 id="detail">Detail</h6>');
    expect(html).toContain('<div class="markdown-table-scroll"><table>');
  });

  it("renders positioned JSON Canvas nodes", async () => {
    const valid = await Markdown({
      structuredBlock: StructuredBlock,
      labels,
      markdown: `\`\`\`json-canvas
{"nodes":[{"id":"one","type":"text","text":"One","x":0,"y":0,"width":200,"height":100},{"id":"two","type":"text","text":"Two","x":300,"y":100,"width":200,"height":100}],"edges":[{"id":"one-two","fromNode":"one","toNode":"two"}]}
\`\`\``,
    });
    const validHtml = renderToStaticMarkup(valid);
    expect(validHtml).toContain('aria-label="JSON Canvas"');
    expect(validHtml).toContain("canvas-scene__edges");
    expect(validHtml).toContain("One → Two");
  });
});

it("renders embed fences without code highlighting or executable SVG content", async () => {
  const result = await Markdown({
    labels,
    structuredBlock: StructuredBlock,
    markdown: `~~~embed:architecture
align: right
<svg viewBox="0 0 100 100" onload="alert(1)"><title>Safe canvas</title><desc>Static shapes</desc><script>alert(1)</script><foreignObject><iframe src="https://example.com"></iframe></foreignObject><rect width="100" height="100" fill="#123456" /></svg>
~~~

~~~embed:github
repo: owner/project
~~~

~~~embed:architecture
flowchart LR
A --> B
~~~`,
  });
  const html = renderToStaticMarkup(result);
  expect(html).toContain("markdown-embed-right");
  expect(html).toContain("Safe canvas");
  expect(html).toContain('fill="#123456"');
  expect(html).toContain('href="https://github.com/owner/project"');
  expect(html).toContain("Architecture flow");
  expect(html).toContain("markdown-embed-architecture");
  expect(html).not.toMatch(/onload|<script|<iframe|foreignObject|language-embed/iu);
});

it("renders link embeds through the article Markdown entrypoint", async () => {
  const result = await Markdown({
    labels,
    structuredBlock: StructuredBlock,
    markdown: "```embed:link\nurl: https://example.com/article?a=1&b=2\nalign: right\n```",
  });
  const html = renderToStaticMarkup(result);
  expect(html).toContain('href="https://example.com/article?a=1&amp;b=2"');
  expect(html).toContain("markdown-embed-right");
  expect(html).not.toContain("language-embed:link");
});

it("renders playable media with automatic video previews and explicit poster overrides", async () => {
  const result = await Markdown({
    labels,
    structuredBlock: StructuredBlock,
    markdown:
      "```embed:media\ntype: video\nsrc: ./media/demo.mp4\ntitle: Demo\ncaption: <script>text</script>\n```\n\n```embed:media\ntype: audio\nsrc: https://example.com/audio.mp3\n```\n\n```embed:media\ntype: video\nsrc: https://example.com/video.mp4#t=5\n```\n\n```embed:media\ntype: video\nsrc: ./custom.mp4\nposter: ./cover.jpg\n```",
  });
  const html = renderToStaticMarkup(result);
  expect(html).toContain('src="./media/demo.mp4#t=0.001"');
  expect(html).toContain('preload="metadata"');
  expect(html).toContain('src="https://example.com/video.mp4#t=5"');
  expect(html).toContain('src="./custom.mp4"');
  expect(html).toContain('poster="./cover.jpg"');
  expect(html).toContain("<audio");
  expect(html.match(/controls=""/gu)).toHaveLength(4);
  expect(html).toContain("&lt;script&gt;text&lt;/script&gt;");
  expect(html).not.toContain("autoPlay");
  expect(html).not.toContain("autoplay");
});

it("shares unique heading anchors with the table of contents for rich and empty headings", async () => {
  const markdown =
    "## Scope\n## Scope\n## Scope 2\n## ![Diagram](https://example.com/image.png)\n## 😀\n## ";
  const headings = extractHeadings(markdown);
  const html = renderToStaticMarkup(
    await Markdown({ labels, markdown, structuredBlock: StructuredBlock }),
  );
  const ids = [...html.matchAll(/<h[1-6] id="([^"]+)"/gu)].map((match) => match[1]);
  expect(ids).toEqual(["scope", "scope-2", "scope-2-2", "diagram", "section", "section-2"]);
  expect(ids).toEqual(headings.map((heading) => heading.id));
});

it("keeps frontmatter, math, strikethrough and code headings aligned with the contents", async () => {
  const markdown =
    "---\ntitle: Example\nsummary: Example\ntags: []\n---\n## ~~Old~~ $x^2$\n## `&lt;main&gt;`\n\n$$\n# not a heading\n$$\n\nReal\n----";
  const headings = extractHeadings(markdown);
  const html = renderToStaticMarkup(
    await Markdown({ labels, markdown, structuredBlock: StructuredBlock }),
  );
  const ids = [...html.matchAll(/<h[1-6] id="([^"]+)"/gu)].map((match) => match[1]);
  expect(headings.map((heading) => heading.title)).toEqual(["Old x^2", "&lt;main&gt;", "Real"]);
  expect(ids).toEqual(headings.map((heading) => heading.id));
  expect(ids).toHaveLength(3);
});
