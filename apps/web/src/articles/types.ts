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

export type RankedArticleSummary = {
  article: ArticleSummary;
  score: number;
};

export type ArticleGraphRecord = {
  article: ArticleSummary;
  links: string[];
};

export type ArticleRelations = {
  backlinks: ArticleSummary[];
  semantic: { status: "available"; articles: RankedArticleSummary[] } | { status: "unavailable" };
};

export type TagCount = {
  count: number;
  path: string;
};
