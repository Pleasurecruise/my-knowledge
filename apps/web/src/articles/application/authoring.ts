import { summarizeArticle } from "@my-knowledge/ai-core";
import { canonicalizeTags, serializeArticleDocument } from "@my-knowledge/content";

import { modelConfig } from "@/model/config";

import { getArticleById } from "../persistence/document";
import { createArticle, updateArticle } from "../persistence/write";
import { embedText, embeddingInput } from "./embedding";
import type { ArticleDraft, UpdateArticleDraftResult } from "./authoring.types";
import { translateChineseDocument } from "./translation";

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
  return translateChineseDocument(env, source);
}

export async function createArticleFromDraft(env: CloudflareEnv, draft: ArticleDraft) {
  const document = await chineseDocument(env, draft);
  const embedding = await embedText(env, embeddingInput(document.editions.zh));
  return createArticle(env, document, embedding);
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
  const embedding = await embedText(env, embeddingInput(document.editions.zh));
  const updated = await updateArticle(env, id, expectedHash, document, embedding);
  return updated ? { status: "updated", article: updated } : { status: "stale" };
}
