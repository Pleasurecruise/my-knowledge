import { IntentLink as Link } from "@/shell/intent-link";

import type { ArticleRelationListProps } from "./article-relations.types";

export function ArticleRelationList({
  articles,
  empty,
  heading,
  targetSlug,
}: ArticleRelationListProps) {
  return (
    <section>
      <h2 className="font-heading text-base font-semibold">{heading}</h2>
      <div className="mt-3">
        {articles.length === 0 ? (
          <p className="text-muted-foreground text-sm leading-6">{empty}</p>
        ) : (
          <ul className="divide-border divide-y border-y">
            {articles.map((article) => (
              <li className="py-3" key={article.slug}>
                <Link
                  className="hover:text-primary font-medium"
                  href={`/articles/${encodeURIComponent(article.slug)}#reference=${encodeURIComponent(targetSlug)}`}
                >
                  {article.editions.zh.title}
                </Link>
                <p className="text-muted-foreground mt-1 text-sm leading-6">
                  {article.editions.zh.summary}
                </p>
              </li>
            ))}
          </ul>
        )}
      </div>
    </section>
  );
}
