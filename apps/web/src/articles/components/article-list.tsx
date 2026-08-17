import type { ArticleSummary } from "@my-knowledge/content";
import Link from "next/link";

import type { ArticleListProps } from "./article-list.types";

export function ArticleList({ articles, empty, entryUnit }: ArticleListProps) {
  if (articles.length === 0)
    return <p className="text-muted-foreground border-b py-10 text-sm">{empty}</p>;

  const years = new Map<number, Map<number, ArticleSummary[]>>();
  for (const article of articles) {
    const date = new Date(article.updatedAt);
    const year = date.getFullYear();
    const month = date.getMonth();
    const registeredMonths = years.get(year);
    const months = registeredMonths ? registeredMonths : new Map<number, ArticleSummary[]>();
    const registeredArticles = months.get(month);
    months.set(month, registeredArticles ? [...registeredArticles, article] : [article]);
    years.set(year, months);
  }
  const groups = [...years.entries()].sort(([left], [right]) => right - left);

  return (
    <>
      {groups.map(([year, months]) => {
        const count = [...months.values()].reduce((total, entries) => total + entries.length, 0);
        return (
          <section className="my-5 text-foreground/80" key={year}>
            <h2 className="mb-4 text-sm font-medium text-foreground">
              {year}
              <span className="ml-1 text-xs text-muted-foreground">
                {count} {entryUnit}
              </span>
            </h2>
            {[...months.entries()]
              .sort(([left], [right]) => right - left)
              .map(([month, entries]) => {
                const monthDate = new Date(2020, month, 1);
                const chineseMonth = new Intl.DateTimeFormat("zh-CN", {
                  month: "long",
                }).format(monthDate);
                const englishMonth = new Intl.DateTimeFormat("en-US", {
                  month: "short",
                })
                  .format(monthDate)
                  .toUpperCase();
                return (
                  <section className="mb-4" key={month}>
                    <h3 className="mb-2 text-xs font-medium tracking-wide text-muted-foreground">
                      {chineseMonth} · {englishMonth}
                    </h3>
                    <ol className="space-y-1.5">
                      {entries.map((article) => {
                        const date = new Date(article.updatedAt);
                        const primaryTag = article.tags.at(0);
                        const tagSegments = primaryTag ? primaryTag.split("/").filter(Boolean) : [];
                        const type = tagSegments.at(-1);
                        const edition = article.editions.zh;
                        return (
                          <li
                            className="grid grid-cols-[2.25rem_minmax(0,1fr)_max-content] gap-3"
                            key={article.id}
                          >
                            <time
                              className="font-mono text-sm leading-5 tabular-nums text-muted-foreground"
                              dateTime={article.updatedAt}
                            >
                              {new Intl.DateTimeFormat("en-US", { day: "2-digit" }).format(date)}
                            </time>
                            <Link
                              className="min-w-0 truncate text-sm leading-5 text-foreground underline-offset-4 transition-colors hover:text-primary hover:underline"
                              href={`/articles/${article.slug}`}
                              title={edition.title}
                            >
                              {edition.title}
                            </Link>
                            <span className="truncate text-xs leading-5 text-muted-foreground">
                              {type}
                            </span>
                          </li>
                        );
                      })}
                    </ol>
                  </section>
                );
              })}
          </section>
        );
      })}
    </>
  );
}
