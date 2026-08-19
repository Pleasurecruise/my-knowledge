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

export type RankedArticle = {
  article: ArticleSummary;
  markdown: string;
  score: number;
};

export type ArticleGraphRecord = {
  article: ArticleSummary;
  links: string[];
};

export type TagCount = {
  count: number;
  path: string;
};
