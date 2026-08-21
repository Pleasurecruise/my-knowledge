import { summarizeArticle } from "@my-knowledge/ai-core";
import {
  canonicalizeTags,
  parseArticleDocuments,
  serializeArticleDocument,
} from "@my-knowledge/content";

import { modelConfig } from "@/model/config";

import { getArticleById } from "../persistence/document";
import { createArticle, updateArticle } from "../persistence/write";
import type { ArticleDraft, UpdateArticleDraftResult } from "./authoring.types";
import { enqueueArticleTranslations } from "./translation";

async function chineseDocument(env: CloudflareEnv, draft: ArticleDraft) {
  const tags = canonicalizeTags(draft.tags);
  const gateway = modelConfig(env);
  const summary = await summarizeArticle(gateway, draft.title, draft.body);
  const source = serializeArticleDocument({
    title: draft.title,
    summary,
    tags,
    body: draft.body,
  });
  return parseArticleDocuments({ zh: source });
}

export async function createArticleFromDraft(env: CloudflareEnv, draft: ArticleDraft) {
  const document = await chineseDocument(env, draft);
  const article = await createArticle(env, crypto.randomUUID(), document);
  await enqueueArticleTranslations(env, article.id, article.contentHash);
  return article;
}

export async function updateArticleFromDraft(
  env: CloudflareEnv,
  id: string,
  expectedHash: string,
  draft: ArticleDraft,
): Promise<UpdateArticleDraftResult> {
  const current = await getArticleById(env, "owner", id);
  if (!current) return { status: "notFound" };
  if (current.contentHash !== expectedHash) return { status: "stale" };
  const document = await chineseDocument(env, draft);
  const updated = await updateArticle(env, id, expectedHash, document);
  if (updated) await enqueueArticleTranslations(env, updated.id, updated.contentHash);
  return updated ? { status: "updated", article: updated } : { status: "stale" };
}
