export const articleOrigin = "https://knowledge.you-find.me";

/** Canonical identities shared by cards, backlinks and the authorized graph. */
export function articleLinkTargets(origin: string, article: { id: string }): string[] {
  const path = `/articles/${encodeURIComponent(article.id)}`;
  return [...new Set([article.id, new URL(path, origin).href, `${articleOrigin}${path}`])];
}
