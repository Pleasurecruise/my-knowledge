import { canonicalizeTags, type Article } from "@my-knowledge/content";

import { InvalidArticleInputError } from "./input-error";
import { getArticleById } from "./persistence/document";
import { listArticles, listTags } from "./persistence/query";
import type { ArticleListQuery } from "./types";

export type ArticleDraft = {
  body: string;
  summary: string;
  tags: string[];
  title: string;
};

export type ArticleDocuments = {
  zh: string;
  en?: string | undefined;
  ja?: string | undefined;
};

export type ArticleUpdateResult =
  | { status: "updated"; article: Article }
  | { status: "notFound" }
  | { status: "stale" };

export async function getOwnerArticle(env: CloudflareEnv, id: string) {
  return getArticleById(env, "owner", id);
}

export async function listOwnerArticles(env: CloudflareEnv, input: ArticleListQuery) {
  return listArticles(env, "owner", input);
}

export async function listOwnerTags(env: CloudflareEnv, parent: string | undefined) {
  const tags = await listTags(env, "owner");
  if (parent === undefined) return tags;
  const normalizedParent = canonicalizeTags([parent])[0];
  if (!normalizedParent) throw new InvalidArticleInputError();
  const prefix = `${normalizedParent.toLocaleLowerCase("en-US")}/`;
  return tags.filter((tag) => tag.path.toLocaleLowerCase("en-US").startsWith(prefix));
}

export { InvalidArticleInputError };
