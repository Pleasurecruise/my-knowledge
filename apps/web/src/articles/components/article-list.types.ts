import type { ArticleSummary } from "@my-knowledge/content";

export type ArticleListProps = {
  articles: ArticleSummary[];
  empty: string;
  entryUnit: string;
};
