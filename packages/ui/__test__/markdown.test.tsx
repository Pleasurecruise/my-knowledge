import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vite-plus/test";

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
