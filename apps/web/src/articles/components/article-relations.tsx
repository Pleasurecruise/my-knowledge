import { resolveLocale } from "@my-knowledge/content";
import Link from "next/link";

import type { ArticleRelationListProps } from "./article-relations.types";

export function ArticleRelationList({
  articles,
  empty,
  heading,
  locale,
}: ArticleRelationListProps) {
  const localizedArticles = articles.flatMap((article) => {
    const resolvedLocale = resolveLocale(Object.keys(article.editions), locale);
    const edition = resolvedLocale ? article.editions[resolvedLocale] : undefined;
    return edition ? [{ article, edition }] : [];
  });

  return (
    <section>
      <h2 className="font-heading text-base font-semibold">{heading}</h2>
      <div className="mt-3">
        {localizedArticles.length === 0 ? (
          <p className="text-muted-foreground text-sm leading-6">{empty}</p>
        ) : (
          <ul className="divide-border divide-y border-y">
            {localizedArticles.map(({ article, edition }) => (
              <li className="py-3" key={article.slug}>
                <Link className="hover:text-primary font-medium" href={`/articles/${article.slug}`}>
                  {edition.title}
                </Link>
                <p className="text-muted-foreground mt-1 text-sm leading-6">{edition.summary}</p>
              </li>
            ))}
          </ul>
        )}
      </div>
    </section>
  );
}
