import { DurableObject } from "cloudflare:workers";
import {
  parseArticleDocuments,
  serializeArticleDocument,
  translationLocaleSchema,
  type Visibility,
} from "@my-knowledge/content";

import { InvalidArticleInputError } from "./input-error";
import type { ArticleDocuments, ArticleDraft, ArticleUpdateResult } from "./operations";
import { getArticleById, getArticleRow } from "./persistence/document";
import { createArticle, saveArticleTranslation, updateArticle } from "./persistence/write";
import { deleteArticle, setArticleVisibility } from "./persistence/write";

export type ArticleWriteResult<Value> = { status: "ok"; value: Value } | { status: "invalidInput" };

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
    const source = serializeArticleDocument({
      title: draft.title,
      summary: draft.summary,
      tags: draft.tags,
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

async function createArticleFromDraft(env: CloudflareEnv, draft: ArticleDraft, id: string) {
  const document = await parseDraftDocument(draft);
  return createArticle(env, id, document);
}

async function createArticleFromDocuments(env: CloudflareEnv, input: ArticleDocuments, id: string) {
  const documents = await parseSubmittedDocuments(input);
  const article = await createArticle(env, id, documents);
  await saveSuppliedTranslations(env, article.id, article.contentHash, documents.editions);
  const stored = await getArticleById(env, "owner", article.id);
  if (!stored) throw new Error(`Created article ${article.id} is not readable`);
  return stored;
}

async function updateArticleFromDraft(
  env: CloudflareEnv,
  id: string,
  expectedHash: string,
  expectedUpdatedAt: string,
  draft: ArticleDraft & { visibility?: Visibility | undefined },
): Promise<ArticleUpdateResult> {
  const current = await getArticleRow(env, "owner", id);
  if (!current) return { status: "notFound" };
  if (current.contentHash !== expectedHash || current.updatedAt !== expectedUpdatedAt)
    return { status: "stale" };
  const document = await parseDraftDocument(draft);
  const updated = await updateArticle(env, id, expectedHash, document, draft.visibility);
  return updated ? { status: "updated", article: updated } : { status: "stale" };
}

async function updateArticleFromDocuments(
  env: CloudflareEnv,
  id: string,
  expectedHash: string,
  expectedUpdatedAt: string,
  input: ArticleDocuments,
): Promise<ArticleUpdateResult> {
  const current = await getArticleRow(env, "owner", id);
  if (!current) return { status: "notFound" };
  if (current.contentHash !== expectedHash || current.updatedAt !== expectedUpdatedAt)
    return { status: "stale" };
  const documents = await parseSubmittedDocuments(input);
  const article = await updateArticle(env, id, expectedHash, documents);
  if (!article) return { status: "stale" };
  await saveSuppliedTranslations(env, id, article.contentHash, documents.editions);
  const stored = await getArticleById(env, "owner", id);
  if (!stored) throw new Error(`Updated article ${id} is not readable`);
  return { status: "updated", article: stored };
}

// One actor per article serializes the complete R2/D1 operation, including rollback.
export class ArticleWriter extends DurableObject<CloudflareEnv> {
  private writes: Promise<unknown> = Promise.resolve();

  private run<Value>(operation: () => Promise<Value>): Promise<ArticleWriteResult<Value>> {
    const next = this.writes.then(async (): Promise<ArticleWriteResult<Value>> => {
      try {
        return { status: "ok", value: await operation() };
      } catch (error) {
        if (error instanceof InvalidArticleInputError) return { status: "invalidInput" };
        throw error;
      }
    });
    this.writes = next.catch(() => undefined);
    return next;
  }

  createDraft(id: string, draft: ArticleDraft) {
    return this.run(() => createArticleFromDraft(this.env, draft, id));
  }

  createDocuments(id: string, documents: ArticleDocuments) {
    return this.run(() => createArticleFromDocuments(this.env, documents, id));
  }

  updateDraft(
    id: string,
    hash: string,
    updatedAt: string,
    draft: ArticleDraft & { visibility?: Visibility | undefined },
  ): Promise<ArticleWriteResult<ArticleUpdateResult>> {
    return this.run(async () => {
      if (await this.ctx.storage.get("deleting")) return { status: "stale" };
      return updateArticleFromDraft(this.env, id, hash, updatedAt, draft);
    });
  }

  updateDocuments(
    id: string,
    hash: string,
    updatedAt: string,
    documents: ArticleDocuments,
  ): Promise<ArticleWriteResult<ArticleUpdateResult>> {
    return this.run(async () => {
      if (await this.ctx.storage.get("deleting")) return { status: "stale" };
      return updateArticleFromDocuments(this.env, id, hash, updatedAt, documents);
    });
  }

  setVisibility(id: string, hash: string, updatedAt: string, visibility: Visibility) {
    return this.run(async () => {
      if (await this.ctx.storage.get("deleting")) return undefined;
      const row = await getArticleRow(this.env, "owner", id);
      if (!row || row.contentHash !== hash || row.updatedAt !== updatedAt) return undefined;
      return setArticleVisibility(this.env, id, hash, visibility);
    });
  }

  delete(id: string, hash: string, updatedAt: string) {
    return this.run(async () => {
      const row = await getArticleRow(this.env, "owner", id);
      if (!row || row.contentHash !== hash || row.updatedAt !== updatedAt) return false;
      // Retained on cleanup failure and across actor restarts; only deletion may resume.
      await this.ctx.storage.put("deleting", true);
      return deleteArticle(this.env, id, hash);
    });
  }
}
