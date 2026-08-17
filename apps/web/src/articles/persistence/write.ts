import type { Article, ArticleDocumentSet, ArticleSummary } from "@my-knowledge/content";
import { and, eq } from "drizzle-orm";
import { drizzle } from "drizzle-orm/d1";

import { deleteArticleCache } from "./cache";
import { getArticleRow, readArticle } from "./document";
import { createStoredArticle, deleteStoredArticle, updateStoredArticle } from "./mutation";
import {
  allocateArticleSlug,
  articleDocumentMeta,
  articleObjectKey,
  articleSummary,
  articleVectorId,
  requiredChineseEdition,
} from "./record";
import type { StoredArticleDocument, WrittenArticleDocument } from "./types";
import { articles } from "@/db/schema";

async function deleteArticleArtifacts(
  env: CloudflareEnv,
  id: string,
  hash: string,
  locales: readonly string[],
): Promise<void> {
  const results = await Promise.allSettled([
    deleteArticleCache(env.KNOWLEDGE_CACHE, id, hash, locales),
    env.KNOWLEDGE_INDEX.deleteByIds([articleVectorId(id, hash)]),
  ]);
  const errors: unknown[] = [];
  for (const result of results) {
    if (result.status === "rejected") errors.push(result.reason);
  }
  if (errors.length > 0) throw new AggregateError(errors, `Article version cleanup failed: ${id}`);
}

async function readStoredArticleDocuments(
  env: CloudflareEnv,
  article: ArticleSummary,
): Promise<StoredArticleDocument[]> {
  return Promise.all(
    Object.keys(article.editions).map(async (locale) => {
      const key = articleObjectKey(article.slug, article.tags, locale);
      const object = await env.KNOWLEDGE_BUCKET.get(key);
      if (!object)
        throw new Error(`Canonical ${locale} Markdown is missing for article ${article.id}`);
      return {
        contentHash: article.contentHash,
        key,
        markdown: await object.text(),
        etag: object.etag,
      };
    }),
  );
}

async function writeArticleDocuments(
  env: CloudflareEnv,
  slug: string,
  document: ArticleDocumentSet,
  previousDocuments: readonly StoredArticleDocument[],
  writtenDocuments: WrittenArticleDocument[],
): Promise<void> {
  const previousByKey = new Map(previousDocuments.map((item) => [item.key, item]));
  for (const [locale, value] of Object.entries(document.editions)) {
    const key = articleObjectKey(slug, document.tags, locale);
    const previous = previousByKey.get(key);
    const object = await env.KNOWLEDGE_BUCKET.put(key, value.markdown, {
      onlyIf: previous ? { etagMatches: previous.etag } : { etagDoesNotMatch: "*" },
      httpMetadata: { contentType: "text/markdown; charset=utf-8" },
      customMetadata: { contentHash: document.contentHash },
    });
    if (!object) throw new Error(`Canonical Markdown changed while writing ${key}`);
    writtenDocuments.push({ key, etag: object.etag });
  }
}

async function rollbackArticleDocuments(
  bucket: R2Bucket,
  previousDocuments: readonly StoredArticleDocument[],
  writtenDocuments: readonly WrittenArticleDocument[],
): Promise<void> {
  const previousByKey = new Map(previousDocuments.map((item) => [item.key, item]));
  for (const written of writtenDocuments.toReversed()) {
    const current = await bucket.head(written.key);
    if (!current || current.etag !== written.etag) {
      throw new Error(`Cannot roll back changed Markdown object ${written.key}`);
    }
    const previous = previousByKey.get(written.key);
    if (!previous) {
      await bucket.delete(written.key);
      continue;
    }
    const restored = await bucket.put(written.key, previous.markdown, {
      onlyIf: { etagMatches: written.etag },
      httpMetadata: { contentType: "text/markdown; charset=utf-8" },
      customMetadata: { contentHash: previous.contentHash },
    });
    if (!restored) throw new Error(`Cannot restore Markdown object ${written.key}`);
  }
}

async function deleteStoredArticleDocuments(
  bucket: R2Bucket,
  documents: readonly StoredArticleDocument[],
  retainedKeys: ReadonlySet<string>,
): Promise<void> {
  for (const document of documents) {
    if (retainedKeys.has(document.key)) continue;
    const current = await bucket.head(document.key);
    if (!current) continue;
    if (current.etag !== document.etag) {
      throw new Error(`Canonical Markdown changed before deleting ${document.key}`);
    }
    await bucket.delete(document.key);
  }
}

async function writeArticleVector(
  env: CloudflareEnv,
  id: string,
  hash: string,
  embedding: number[],
): Promise<void> {
  await env.KNOWLEDGE_INDEX.upsert([
    {
      id: articleVectorId(id, hash),
      values: embedding,
      metadata: { articleId: id, contentHash: hash },
    },
  ]);
}

export async function createArticle(
  env: CloudflareEnv,
  document: ArticleDocumentSet,
  embedding: number[],
): Promise<Article> {
  const id = crypto.randomUUID();
  const slug = await allocateArticleSlug(env, requiredChineseEdition(document).title);
  const timestamp = new Date().toISOString();
  const row: typeof articles.$inferInsert = {
    id,
    slug,
    contentHash: document.contentHash,
    metaJson: JSON.stringify(articleDocumentMeta(document)),
    tagsJson: JSON.stringify(document.tags),
    linksJson: JSON.stringify(document.links),
    visibility: "private",
    createdAt: timestamp,
    updatedAt: timestamp,
  };

  const locales = Object.keys(document.editions);
  const writtenDocuments: WrittenArticleDocument[] = [];
  await createStoredArticle({
    writeDocuments: () => writeArticleDocuments(env, slug, document, [], writtenDocuments),
    writeVector: () => writeArticleVector(env, id, document.contentHash, embedding),
    insertRow: async () => {
      await drizzle(env.DB).insert(articles).values(row);
      return row;
    },
    cleanupNewVersion: async () => {
      await Promise.all([
        rollbackArticleDocuments(env.KNOWLEDGE_BUCKET, [], writtenDocuments),
        deleteArticleArtifacts(env, id, document.contentHash, locales),
      ]);
    },
  });
  const stored = await getArticleRow(env, "owner", "id", id);
  if (!stored) throw new Error(`Created article ${id} is not readable`);
  return readArticle(env, stored);
}

export async function updateArticle(
  env: CloudflareEnv,
  id: string,
  expectedHash: string,
  document: ArticleDocumentSet,
  embedding: number[],
): Promise<Article | undefined> {
  const previous = await getArticleRow(env, "owner", "id", id);
  if (!previous || previous.contentHash !== expectedHash) return undefined;
  if (document.contentHash === expectedHash) return readArticle(env, previous);
  const timestamp = new Date().toISOString();

  const previousArticle = articleSummary(previous);
  const previousDocuments = await readStoredArticleDocuments(env, previousArticle);
  const locales = Object.keys(document.editions);
  const previousLocales = Object.keys(previousArticle.editions);
  const writtenDocuments: WrittenArticleDocument[] = [];
  const retainedKeys = new Set(
    locales.map((locale) => articleObjectKey(previous.slug, document.tags, locale)),
  );
  const updated = await updateStoredArticle({
    writeDocuments: () =>
      writeArticleDocuments(env, previous.slug, document, previousDocuments, writtenDocuments),
    writeVector: () => writeArticleVector(env, id, document.contentHash, embedding),
    switchRow: () =>
      drizzle(env.DB)
        .update(articles)
        .set({
          contentHash: document.contentHash,
          metaJson: JSON.stringify(articleDocumentMeta(document)),
          tagsJson: JSON.stringify(document.tags),
          linksJson: JSON.stringify(document.links),
          updatedAt: timestamp,
        })
        .where(and(eq(articles.id, id), eq(articles.contentHash, expectedHash)))
        .returning()
        .get(),
    cleanupNewVersion: async () => {
      await Promise.all([
        rollbackArticleDocuments(env.KNOWLEDGE_BUCKET, previousDocuments, writtenDocuments),
        deleteArticleArtifacts(env, id, document.contentHash, locales),
      ]);
    },
    cleanupPreviousVersion: async () => {
      await Promise.all([
        deleteStoredArticleDocuments(env.KNOWLEDGE_BUCKET, previousDocuments, retainedKeys),
        deleteArticleArtifacts(env, id, expectedHash, previousLocales),
      ]);
    },
  });
  if (!updated) return undefined;
  return readArticle(env, updated);
}

export async function setArticleVisibility(
  env: CloudflareEnv,
  id: string,
  expectedHash: string,
  visibility: "private" | "public",
): Promise<ArticleSummary | undefined> {
  const updated = await drizzle(env.DB)
    .update(articles)
    .set({ visibility, updatedAt: new Date().toISOString() })
    .where(and(eq(articles.id, id), eq(articles.contentHash, expectedHash)))
    .returning()
    .get();
  if (!updated) return undefined;
  if (visibility === "private") {
    await deleteArticleCache(
      env.KNOWLEDGE_CACHE,
      id,
      expectedHash,
      Object.keys(articleSummary(updated).editions),
    );
  }
  return articleSummary(updated);
}

export async function deleteArticle(
  env: CloudflareEnv,
  id: string,
  expectedHash: string,
): Promise<boolean> {
  const previous = await getArticleRow(env, "owner", "id", id);
  if (!previous || previous.contentHash !== expectedHash) return false;
  const previousArticle = articleSummary(previous);
  const previousDocuments = await readStoredArticleDocuments(env, previousArticle);
  return deleteStoredArticle({
    hideRow: async () => {
      const hidden = await drizzle(env.DB)
        .update(articles)
        .set({ visibility: "private", updatedAt: new Date().toISOString() })
        .where(and(eq(articles.id, id), eq(articles.contentHash, expectedHash)))
        .returning({ id: articles.id })
        .get();
      return Boolean(hidden);
    },
    cleanupVersion: async () => {
      await Promise.all([
        deleteStoredArticleDocuments(env.KNOWLEDGE_BUCKET, previousDocuments, new Set()),
        deleteArticleArtifacts(env, id, expectedHash, Object.keys(previousArticle.editions)),
      ]);
    },
    deleteRow: async () => {
      const deleted = await drizzle(env.DB)
        .delete(articles)
        .where(and(eq(articles.id, id), eq(articles.contentHash, expectedHash)))
        .returning({ id: articles.id })
        .get();
      return Boolean(deleted);
    },
  });
}
