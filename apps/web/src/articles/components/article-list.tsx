import { resolveLocale, type ArticleSummary } from "@my-knowledge/content";
import { IntentLink } from "@/shell/intent-link";
import type { ArticleListProps } from "./article-list.types";

const articleDate = new Intl.DateTimeFormat("en-US", { month: "2-digit", day: "2-digit" });

export function ArticleList({
  articles,
  empty,
  order = "chronology",
  locale = "zh",
}: ArticleListProps) {
  if (articles.length === 0)
    return <p className="text-muted-foreground border-b py-6 text-sm">{empty}</p>;

  const years = new Map<number, ArticleSummary[]>();
  for (const article of articles) {
    const year = order === "relevance" ? 0 : new Date(article.updatedAt).getFullYear();
    const entries = years.get(year);
    if (entries) entries.push(article);
    else years.set(year, [article]);
  }
  return (
    <div className="article-list">
      {[...years.entries()]
        .sort(([left], [right]) => right - left)
        .map(([year, entries]) => (
          <section className="article-year" key={year}>
            {order === "chronology" ? <h2 className="article-year-heading">{year}</h2> : null}
            <ol>
              {entries.map((article) => {
                const edition =
                  article.editions[resolveLocale(Object.keys(article.editions), locale) ?? "zh"] ??
                  article.editions.zh;
                return (
                  <li key={article.id}>
                    <IntentLink
                      className="article-preview"
                      href={`/articles/${article.id}`}
                      aria-label={edition.title}
                    >
                      <span className="article-preview-heading">
                        <span className="article-preview-title">{edition.title}</span>
                        <span className="article-visibility">{article.visibility}</span>
                        <time dateTime={article.updatedAt}>
                          {articleDate.format(new Date(article.updatedAt))}
                        </time>
                      </span>
                      <span className="article-preview-summary">{edition.summary}</span>
                    </IntentLink>
                  </li>
                );
              })}
            </ol>
          </section>
        ))}
    </div>
  );
}
