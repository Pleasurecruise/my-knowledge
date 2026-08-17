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
  const prose = body
    .replaceAll(/^(?:`{3,}|~{3,})[^\n]*\n[\s\S]*?^(?:`{3,}|~{3,})\s*$/gmu, "")
    .replaceAll(/`[^`\n]*`/gu, "");
  if (/<\/?[A-Za-z][^>]*>/u.test(prose)) throw new Error("Raw HTML is not supported");
  if (/\]\(\s*(?:javascript|vbscript|data):/iu.test(prose))
    throw new Error("Executable URLs are not supported");

  const structuredFence = /```(vega|vega-lite|json-canvas)\s*\n([\s\S]*?)```/gu;
  for (const match of body.matchAll(structuredFence)) {
    const source = match[2];
    if (!source) throw new Error(`${match[1]} blocks require JSON`);
    let value: unknown;
    try {
      value = JSON.parse(source);
    } catch {
      throw new Error(`${match[1]} blocks require valid JSON`);
    }
    if (match[1] === "json-canvas" && !jsonCanvasSchema.safeParse(value).success) {
      throw new Error("json-canvas blocks require valid portable spatial data");
    }
  }
}

export function parseArticleDocument(source: string): ParsedArticleDocument {
  const normalized = normalizeLineEndings(source);
  const match = /^---\n([\s\S]*?)\n---\n([\s\S]+)$/u.exec(normalized);
  if (!match?.[1] || !match[2])
    throw new Error("Article Markdown requires YAML frontmatter and a body");

  validateFrontmatterOrder(match[1]);
  const frontmatter = frontmatterSchema.parse(parse(match[1]));
  const tags = canonicalizeTags(frontmatter.tags);
  const body = stripLeadingTitleHeading(match[2].trim()).trim();
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
