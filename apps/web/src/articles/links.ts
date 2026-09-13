export const articleOrigin = "https://knowledge.you-find.me";

/** Canonical identities shared by cards, backlinks and the authorized graph. */
export function articleLinkTargets(
  origin: string,
  article: { id: string; slug: string },
): string[] {
  return [
    ...new Set(
      [article.id, article.slug].flatMap((identity) => {
        const path = `/articles/${encodeURIComponent(identity)}`;
        return [identity, new URL(path, origin).href, `${articleOrigin}${path}`];
      }),
    ),
  ];
}
