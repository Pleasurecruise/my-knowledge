import type { ArticleSummary } from "@my-knowledge/content";

export type ArticleListProps = {
  locale?: string;
  order?: "chronology" | "relevance";
  articles: ArticleSummary[];
  empty: string;
};
