import type { ArticleSummary } from "@my-knowledge/content";

export type ArticleListQuery = {
  visibility: "private" | "public" | undefined;
  tags: readonly string[];
  cursor: string | undefined;
  limit: number;
};

export type ArticlePage = {
  articles: ArticleSummary[];
  cursor: string | undefined;
};

export type TagCount = {
  count: number;
  path: string;
};
