import { expect, it } from "vite-plus/test";
import { renderToStaticMarkup } from "react-dom/server";
import { validateMarkdown } from "@my-knowledge/content";
import { Markdown } from "../src/markdown";

const labels = {
  canvas: "Canvas",
  canvasRelationships: "Relationships",
  canvasViewport: "Canvas viewport",
  chart: "Chart",
  diagram: "Diagram",
  copyCode: "Copy code",
  codeCopied: "Code copied",
  codeCopyFailed: "Copy failed",
  renderingDiagram: "Rendering",
  spatialView: "Spatial view",
};
const patch = "title: Changes\n---\n--- a/a\n+++ b/a\n@@ -1 +1 @@\n-<old>\n+<new>";

it("compiles complete fences and preserves quoted whitespace", async () => {
  const markdown = `~~~embed:quote\nauthor: A & B\nurl: https://example.com\n---\nFirst\n\n<script>plain text</script>\n\n~~~\n\n~~~embed:diff\n${patch}\n~~~`;
  expect(() => validateMarkdown(markdown)).not.toThrow();
  const html = renderToStaticMarkup(
    await Markdown({ markdown, labels, structuredBlock: () => null }),
  );
  expect(html).toContain("First\n\n&lt;script&gt;plain text&lt;/script&gt;\n</p>");
  expect(html).toContain('cite="https://example.com/"');
  expect(html).toContain('class="diff-remove">-&lt;old&gt;\n</span>');
  expect(html).toContain('class="diff-add">+&lt;new&gt;\n</span>');
  expect(html).not.toContain("markdown-block-error");
});

it("rejects an extra blank patch line in submission and stored-body rendering", async () => {
  const markdown = `~~~embed:diff\n${patch}\n\n~~~`;
  expect(() => validateMarkdown(markdown)).toThrow("matching hunk counts");
  const html = renderToStaticMarkup(
    await Markdown({ markdown, labels, structuredBlock: () => null }),
  );
  expect(html).toContain("markdown-block-error");
});

it("leaves ordinary diff fences as code", async () => {
  const html = renderToStaticMarkup(
    await Markdown({ markdown: "```diff\n-old\n+new\n```", labels, structuredBlock: () => null }),
  );
  expect(html).not.toContain("markdown-embed-diff");
  expect(html).toContain("<pre");
});
