import remarkParse from "remark-parse";
import { unified } from "unified";
import { SKIP, visit } from "unist-util-visit";

export function createSlug(title: string): string {
  const slug = title
    .normalize("NFKC")
    .toLocaleLowerCase("en-US")
    .replaceAll(/[^\p{L}\p{N}]+/gu, "-")
    .replaceAll(/^-|-$/gu, "");

  if (!slug) throw new Error("The title cannot produce a slug");
  return slug;
}

export function extractWikiLinks(markdown: string): string[] {
  const links = new Set<string>();
  const pattern = /\[\[([^\]|\n]+)(?:\|[^\]\n]+)?\]\]/gu;

  const tree = unified().use(remarkParse).parse(markdown);
  visit(tree, (node) => {
    if (node.type === "link" || node.type === "linkReference") return SKIP;
    if (node.type !== "text") return;
    for (const match of node.value.matchAll(pattern)) {
      const target = match[1]?.trim();
      if (target) links.add(target);
    }
  });

  return [...links];
}

export type ArticleHeading = { depth: number; title: string; id: string };

export function extractHeadings(markdown: string): ArticleHeading[] {
  const headings: ArticleHeading[] = [];
  const counts = new Map<string, number>();
  const tree = unified().use(remarkParse).parse(markdown);
  visit(tree, "heading", (node) => {
    let title = "";
    visit(node, (child) => {
      if (child.type === "text" || child.type === "inlineCode") title += child.value;
      if (child.type === "image" && child.alt) title += child.alt;
    });
    title = title
      .replaceAll(
        /\[\[([^\]|\n]+)(?:\|([^\]\n]+))?\]\]/gu,
        (_, target: string, label: string | undefined) => (label || target).trim(),
      )
      .trim();
    if (!title) return;
    const base = createSlug(title);
    const previousCount = counts.get(base);
    const count = previousCount === undefined ? 1 : previousCount + 1;
    counts.set(base, count);
    headings.push({ depth: node.depth, title, id: count === 1 ? base : `${base}-${count}` });
  });
  return headings;
}
