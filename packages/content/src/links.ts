import type { Root } from "mdast";
import { markdownParser } from "./markdown";
import { visit } from "unist-util-visit";

export function createSlug(title: string): string {
  const slug = title
    .normalize("NFKC")
    .toLocaleLowerCase("en-US")
    .replaceAll(/[^\p{L}\p{N}]+/gu, "-")
    .replaceAll(/^-|-$/gu, "");

  if (!slug) throw new Error("The title cannot produce a slug");
  return slug;
}

export type ArticleHeading = { depth: number; title: string; id: string };

export function extractHeadings(markdown: string | Root): ArticleHeading[] {
  const headings: ArticleHeading[] = [];
  const ids = new Set<string>();
  const tree = typeof markdown === "string" ? markdownParser.parse(markdown) : markdown;
  visit(tree, "heading", (node) => {
    let title = "";
    visit(node, (child) => {
      if (child.type === "text" || child.type === "inlineCode" || child.type === "inlineMath")
        title += child.value;
      if (child.type === "image" && child.alt) title += child.alt;
    });
    title = title
      .replaceAll(
        /\[\[([^\]|\n]+)(?:\|([^\]\n]+))?\]\]/gu,
        (_, target: string, label: string | undefined) => (label || target).trim(),
      )
      .trim();
    const base = /[\p{L}\p{N}]/u.test(title) ? createSlug(title) : "section";
    let id = base;
    for (let count = 2; ids.has(id); count += 1) id = `${base}-${count}`;
    ids.add(id);
    headings.push({ depth: node.depth, title: title || "Section", id });
  });
  return headings;
}
