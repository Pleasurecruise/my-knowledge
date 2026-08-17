import type { ArticleSummary } from "@my-knowledge/content";

export type ArticleRelationListProps = {
  articles: ArticleSummary[];
  empty: string;
  heading: string;
};
