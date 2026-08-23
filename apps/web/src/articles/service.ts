import {
  canonicalizeTags,
  parseArticleDocuments,
  serializeArticleDocument,
  translationLocaleSchema,
  type Article,
} from "@my-knowledge/content";

import { InvalidArticleInputError } from "./application/input-error";
import { searchAiArticles } from "./persistence/ai-search";
import { getArticleById } from "./persistence/document";
import { listArticles, listTags } from "./persistence/query";
import { createArticle, saveArticleTranslation, updateArticle } from "./persistence/write";
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

async function parseSubmittedDocuments(input: ArticleDocuments) {
  const documents: Record<string, string> = { zh: input.zh };
  if (input.en !== undefined) documents.en = input.en;
  if (input.ja !== undefined) documents.ja = input.ja;
  try {
    return await parseArticleDocuments(documents);
  } catch {
    throw new InvalidArticleInputError();
  }
}

async function parseDraftDocument(draft: ArticleDraft) {
  try {
    const tags = canonicalizeTags(draft.tags);
    const source = serializeArticleDocument({
      title: draft.title,
      summary: draft.summary,
      tags,
      body: draft.body,
    });
    return await parseArticleDocuments({ zh: source });
  } catch {
    throw new InvalidArticleInputError();
  }
}

async function saveSuppliedTranslations(
  env: CloudflareEnv,
  id: string,
  sourceHash: string,
  editions: Awaited<ReturnType<typeof parseArticleDocuments>>["editions"],
) {
  for (const locale of translationLocaleSchema.options) {
    const edition = editions[locale];
    if (edition) await saveArticleTranslation(env, id, locale, sourceHash, edition);
  }
}

export async function getOwnerArticle(env: CloudflareEnv, id: string) {
  return getArticleById(env, "owner", id);
}

export async function listOwnerArticles(env: CloudflareEnv, input: ArticleListQuery) {
  return listArticles(env, "owner", input);
}

export async function createArticleFromDraft(env: CloudflareEnv, draft: ArticleDraft) {
  const document = await parseDraftDocument(draft);
  return createArticle(env, crypto.randomUUID(), document);
}

export async function createArticleFromDocuments(env: CloudflareEnv, input: ArticleDocuments) {
  const documents = await parseSubmittedDocuments(input);
  const article = await createArticle(env, crypto.randomUUID(), documents);
  await saveSuppliedTranslations(env, article.id, article.contentHash, documents.editions);
  const stored = await getOwnerArticle(env, article.id);
  if (!stored) throw new Error(`Created article ${article.id} is not readable`);
  return stored;
}

export async function updateArticleFromDraft(
  env: CloudflareEnv,
  id: string,
  expectedHash: string,
  draft: ArticleDraft,
): Promise<ArticleUpdateResult> {
  const current = await getOwnerArticle(env, id);
  if (!current) return { status: "notFound" };
  if (current.contentHash !== expectedHash) return { status: "stale" };
  const document = await parseDraftDocument(draft);
  const updated = await updateArticle(env, id, expectedHash, document);
  return updated ? { status: "updated", article: updated } : { status: "stale" };
}

export async function updateArticleFromDocuments(
  env: CloudflareEnv,
  id: string,
  expectedHash: string,
  input: ArticleDocuments,
): Promise<ArticleUpdateResult> {
  const current = await getOwnerArticle(env, id);
  if (!current) return { status: "notFound" };
  if (current.contentHash !== expectedHash) return { status: "stale" };
  const documents = await parseSubmittedDocuments(input);
  const article = await updateArticle(env, id, expectedHash, documents);
  if (!article) return { status: "stale" };
  await saveSuppliedTranslations(env, id, article.contentHash, documents.editions);
  const stored = await getOwnerArticle(env, id);
  if (!stored) throw new Error(`Updated article ${id} is not readable`);
  return { status: "updated", article: stored };
}

export async function searchOwnerArticles(
  env: CloudflareEnv,
  query: string,
  tags: string[] | undefined,
  limit: number,
) {
  const wantedTags = tags
    ? canonicalizeTags(tags).map((tag) => tag.toLocaleLowerCase("en-US"))
    : undefined;
  const ranked = await searchAiArticles(env, "owner", query, wantedTags ? 50 : limit);
  const filtered = wantedTags
    ? ranked.filter(({ article }) =>
        wantedTags.every((wanted) =>
          article.tags.some((tag) => {
            const normalized = tag.toLocaleLowerCase("en-US");
            return normalized === wanted || normalized.startsWith(`${wanted}/`);
          }),
        ),
      )
    : ranked;
  return filtered.slice(0, limit).map(({ article, markdown, score }) => ({
    id: article.id,
    slug: article.slug,
    title: article.editions.zh.title,
    summary: article.editions.zh.summary,
    tags: article.tags,
    excerpt: markdown.slice(0, 320),
    score,
  }));
}

export async function listOwnerTags(env: CloudflareEnv, parent: string | undefined) {
  const tags = await listTags(env, "owner");
  if (parent === undefined) return tags;
  const normalizedParent = canonicalizeTags([parent])[0];
  if (!normalizedParent) throw new InvalidArticleInputError();
  const prefix = `${normalizedParent.toLocaleLowerCase("en-US")}/`;
  return tags.filter((tag) => tag.path.toLocaleLowerCase("en-US").startsWith(prefix));
}

export { deleteArticle, setArticleVisibility } from "./persistence/write";

export { InvalidArticleInputError };
