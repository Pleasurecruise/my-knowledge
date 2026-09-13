import { describe, expect, it } from "vite-plus/test";
import { parseArticleDocument, parseMarkdownEmbed, serializeArticleDocument } from "../src";
import cases from "./fixtures/document-embeds.json";

describe("document embeds shared with my-workspace", () => {
  it.each(cases)("$kind valid=$valid: $source", ({ kind, source, valid }) => {
    const parse = () => parseMarkdownEmbed(kind, source);
    if (!valid) {
      expect(parse).toThrow();
      return;
    }
    expect(parse()).toBeDefined();
    const body = `~~~${kind}\n${source}\n~~~`;
    const document = serializeArticleDocument({
      title: "Documents",
      summary: "Sources and changes",
      tags: [],
      body,
    });
    expect(parseArticleDocument(document).body).toBe(body);
  });
  it("preserves patch whitespace and distinguishes headers from changed lines", () => {
    expect(
      parseMarkdownEmbed(
        "embed:diff",
        "title: Markers\n---\n--- a/a\n+++ b/a\n@@ -1 +1 @@\n--- old\n+++ new",
      ),
    ).toMatchObject({
      lines: [
        { kind: "header", text: "--- a/a" },
        { kind: "header", text: "+++ b/a" },
        { kind: "header", text: "@@ -1 +1 @@" },
        { kind: "remove", text: "--- old" },
        { kind: "add", text: "+++ new" },
      ],
    });
  });
});
