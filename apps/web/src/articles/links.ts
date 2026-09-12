export const articleOrigin = "https://knowledge.you-find.me";

/** Canonical identities shared by cards, backlinks and the authorized graph. */
export function articleLinkTargets(origin: string, slug: string): string[] {
  const path = `/articles/${encodeURIComponent(slug)}`;
  return [...new Set([slug, new URL(path, origin).href, `${articleOrigin}${path}`])];
}
