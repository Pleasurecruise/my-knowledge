import type { Article } from "@my-knowledge/content";

export type ArticleDraft = {
  body: string;
  locale: string;
  tags: string[];
  title: string;
};

export type UpdateArticleDraftResult =
  | { status: "updated"; article: Article }
  | { status: "notFound" }
  | { status: "stale" };
