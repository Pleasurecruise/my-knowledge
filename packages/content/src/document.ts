import remarkParse from "remark-parse";
import { unified } from "unified";
import { visit } from "unist-util-visit";

import { parseMarkdownEmbed } from "./embed";
import { parse, stringify } from "yaml";

import { extractWikiLinks } from "./links";
import { frontmatterSchema, jsonCanvasSchema, type ParsedArticleDocument } from "./schema";
import { canonicalizeTags } from "./tags";

export type ArticleDocumentInput = {
  title: string;
  summary: string;
  tags: readonly string[];
  body: string;
};

function normalizeLineEndings(value: string): string {
  return value.replaceAll("\r\n", "\n").replaceAll("\r", "\n").trimEnd();
}

function stripLeadingTitleHeading(value: string): string {
  return value.replace(/^\uFEFF?#\s+[^\n]+(?:\n|$)/u, "").replace(/^\n/u, "");
}

function validateFrontmatterOrder(source: string): void {
  const keys = source
    .split("\n")
    .filter((line) => /^[A-Za-z][A-Za-z0-9_-]*:/u.test(line))
    .map((line) => line.slice(0, line.indexOf(":")));

  if (keys.join(",") !== "title,summary,tags") {
    throw new Error("Frontmatter keys must be title, summary, and tags in that order");
  }
}

export function validateMarkdown(body: string): void {
  const tree = unified().use(remarkParse).parse(body);
  visit(tree, "html", () => {
    throw new Error("Raw HTML is not supported");
  });
  visit(tree, (node) => {
    if (
      (node.type === "link" || node.type === "image" || node.type === "definition") &&
      /^(?:javascript|vbscript|data):/iu.test(node.url.replaceAll(/[\s\p{Cc}]/gu, ""))
    ) {
      throw new Error("Executable URLs are not supported");
    }
  });
  visit(tree, "code", (node) => {
    const language = node.lang?.toLowerCase();
    if (!language) return;
    parseMarkdownEmbed(language, node.value);
    if (!["vega", "vega-lite", "json-canvas"].includes(language)) return;
    let value: unknown;
    try {
      value = JSON.parse(node.value);
    } catch {
      throw new Error(`${language} blocks require valid JSON`);
    }
    if (language === "json-canvas" && !jsonCanvasSchema.safeParse(value).success) {
      throw new Error("json-canvas blocks require valid portable spatial data");
    }
  });
}

export function parseArticleDocument(source: string): ParsedArticleDocument {
  const normalized = normalizeLineEndings(source).replace(/^\uFEFF/u, "");
  const lines = normalized.split("\n");

  // The first standalone `---` line is the frontmatter opener; any lines
  // before it are discarded as noise so unrelated prefixes (a model or a
  // tool prepending characters) do not break parsing.
  const openerIndex = lines.findIndex((line) => /^---[ \t]*$/u.test(line));
  if (openerIndex < 0) throw new Error("Article Markdown requires YAML frontmatter and a body");

  const closerIndex = lines.findIndex(
    (line, index) => index > openerIndex && /^---[ \t]*$/u.test(line),
  );
  if (closerIndex < 0) throw new Error("Article Markdown requires YAML frontmatter and a body");

  const yaml = lines.slice(openerIndex + 1, closerIndex).join("\n");
  validateFrontmatterOrder(yaml);
  const frontmatter = frontmatterSchema.parse(parse(yaml));
  const tags = canonicalizeTags(frontmatter.tags);
  const body = stripLeadingTitleHeading(
    lines
      .slice(closerIndex + 1)
      .join("\n")
      .trim(),
  ).trim();
  validateMarkdown(body);

  const canonicalFrontmatter = stringify(
    { title: frontmatter.title, summary: frontmatter.summary, tags },
    { lineWidth: 0 },
  ).trimEnd();
  const markdown = `---\n${canonicalFrontmatter}\n---\n${body}\n`;

  return {
    title: frontmatter.title,
    summary: frontmatter.summary,
    tags,
    body,
    links: extractWikiLinks(body),
    markdown,
  };
}

export function serializeArticleDocument(input: ArticleDocumentInput): string {
  const frontmatter = stringify(
    {
      title: input.title.trim(),
      summary: input.summary.trim(),
      tags: canonicalizeTags(input.tags),
    },
    { lineWidth: 0 },
  ).trimEnd();
  return parseArticleDocument(`---\n${frontmatter}\n---\n${input.body.trim()}\n`).markdown;
}
