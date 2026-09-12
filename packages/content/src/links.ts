import remarkFrontmatter from "remark-frontmatter";
import remarkGfm from "remark-gfm";
import remarkMath from "remark-math";
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
  const ids = new Set<string>();
  const tree = unified()
    .use(remarkParse)
    .use(remarkFrontmatter, ["yaml"])
    .use(remarkGfm)
    .use(remarkMath)
    .parse(markdown);
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
