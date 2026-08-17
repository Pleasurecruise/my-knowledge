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

  for (const match of markdown.matchAll(pattern)) {
    const target = match[1]?.trim();
    if (target) links.add(target);
  }

  return [...links];
}

export type ArticleHeading = { depth: number; title: string; id: string };

export function extractHeadings(markdown: string): ArticleHeading[] {
  const headings: ArticleHeading[] = [];
  const counts = new Map<string, number>();
  for (const match of markdown.matchAll(/^(#{1,6})\s+(.+)$/gmu)) {
    const marker = match[1];
    const title = match[2]?.replaceAll(/[*_`]/gu, "").trim();
    if (!marker || !title) continue;
    const base = createSlug(title);
    const previousCount = counts.get(base);
    const count = previousCount === undefined ? 1 : previousCount + 1;
    counts.set(base, count);
    headings.push({ depth: marker.length, title, id: count === 1 ? base : `${base}-${count}` });
  }
  return headings;
}
