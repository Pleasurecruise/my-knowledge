import type {
  Article,
  ArticleDocumentSet,
  ArticleSummary,
  ParsedArticleDocument,
  TranslationLocale,
} from "@my-knowledge/content";
import { initialArticleVisibility } from "@my-knowledge/content";
import { and, eq } from "drizzle-orm";
import { drizzle } from "drizzle-orm/d1";

import { deleteSearchItem, indexChineseArticle } from "./ai-search";
import { deleteArticleCache } from "./cache";
import { getArticleRow, readArticle } from "./document";
import { createStoredArticle, deleteStoredArticle, updateStoredArticle } from "./mutation";
import { allocateArticleSlug, articleObjectKey, articleSummary } from "./record";
import type { StoredArticleDocument, WrittenArticleDocument } from "./types";
import { articles, articleTranslations } from "@/db/schema";

const articleLocales: readonly string[] = ["zh", "en", "ja"];

async function deleteArticleArtifacts(env: CloudflareEnv, id: string, hash: string): Promise<void> {
  const results = await Promise.allSettled([
    deleteArticleCache(env.KNOWLEDGE_CACHE, id, hash, articleLocales),
    deleteSearchItem(env, id),
  ]);
  const errors = results.flatMap((result) => (result.status === "rejected" ? [result.reason] : []));
  if (errors.length > 0) throw new AggregateError(errors, `Article version cleanup failed: ${id}`);
}

async function readStoredDocument(
  bucket: R2Bucket,
  id: string,
  locale: string,
  contentHash: string,
): Promise<StoredArticleDocument | null> {
  const key = articleObjectKey(id, locale);
  const object = await bucket.get(key);
  if (!object) return null;
  return {
    contentHash,
    key,
    markdown: await object.text(),
    etag: object.etag,
  };
}

async function writeDocument(
  bucket: R2Bucket,
  key: string,
  markdown: string,
  contentHash: string,
  previous: StoredArticleDocument | null,
): Promise<WrittenArticleDocument> {
  const object = await bucket.put(key, markdown, {
    onlyIf: previous ? { etagMatches: previous.etag } : { etagDoesNotMatch: "*" },
    httpMetadata: { contentType: "text/markdown; charset=utf-8" },
    customMetadata: { contentHash },
  });
  if (!object) throw new Error(`Markdown changed while writing ${key}`);
  return { key, etag: object.etag };
}

async function rollbackDocument(
  bucket: R2Bucket,
  previous: StoredArticleDocument | null,
  written: WrittenArticleDocument,
): Promise<void> {
  const current = await bucket.head(written.key);
  if (!current || current.etag !== written.etag) {
    throw new Error(`Cannot roll back changed Markdown object ${written.key}`);
  }
  if (!previous) {
    await bucket.delete(written.key);
    return;
  }
  const restored = await bucket.put(written.key, previous.markdown, {
    onlyIf: { etagMatches: written.etag },
    httpMetadata: { contentType: "text/markdown; charset=utf-8" },
    customMetadata: { contentHash: previous.contentHash },
  });
  if (!restored) throw new Error(`Cannot restore Markdown object ${written.key}`);
}

async function deleteStoredDocuments(
  bucket: R2Bucket,
  documents: readonly StoredArticleDocument[],
): Promise<void> {
  for (const document of documents) {
    const current = await bucket.head(document.key);
    if (!current) continue;
    if (current.etag !== document.etag) {
      throw new Error(`Canonical Markdown changed before deleting ${document.key}`);
    }
    await bucket.delete(document.key);
  }
}

export async function createArticle(
  env: CloudflareEnv,
  id: string,
  document: ArticleDocumentSet,
): Promise<Article> {
  const existing = await getArticleRow(env, "owner", "id", id);
  if (existing) return readArticle(env, existing);
  const chinese = document.editions.zh;
  const slug = await allocateArticleSlug(env, chinese.title);
  const timestamp = new Date().toISOString();
  let written: WrittenArticleDocument | null = null;
  await createStoredArticle({
    writeDocuments: async () => {
      written = await writeDocument(
        env.KNOWLEDGE_BUCKET,
        articleObjectKey(id, "zh"),
        chinese.markdown,
        document.contentHash,
        null,
      );
    },
    writeIndex: () => indexChineseArticle(env, id, chinese.markdown),
    insertRow: async () => {
      const row: typeof articles.$inferInsert = {
        id,
        slug,
        title: chinese.title,
        summary: chinese.summary,
        contentHash: document.contentHash,
        tagsJson: JSON.stringify(document.tags),
        linksJson: JSON.stringify(document.links),
        visibility: initialArticleVisibility,
        createdAt: timestamp,
        updatedAt: timestamp,
      };
      await drizzle(env.DB).insert(articles).values(row);
      return row;
    },
    cleanupNewVersion: async () => {
      if (await getArticleRow(env, "owner", "id", id)) return;
      const cleanup = [deleteArticleArtifacts(env, id, document.contentHash)];
      if (written) cleanup.push(rollbackDocument(env.KNOWLEDGE_BUCKET, null, written));
      await Promise.all(cleanup);
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
): Promise<Article | undefined> {
  const previous = await getArticleRow(env, "owner", "id", id);
  if (!previous || previous.contentHash !== expectedHash) return undefined;
  if (document.contentHash === expectedHash) return readArticle(env, previous);
  const chinese = document.editions.zh;
  const previousDocument = await readStoredDocument(
    env.KNOWLEDGE_BUCKET,
    id,
    "zh",
    previous.contentHash,
  );
  if (!previousDocument) throw new Error(`Canonical Chinese Markdown is missing for article ${id}`);
  let written: WrittenArticleDocument | null = null;
  const updated = await updateStoredArticle({
    writeDocuments: async () => {
      written = await writeDocument(
        env.KNOWLEDGE_BUCKET,
        articleObjectKey(id, "zh"),
        chinese.markdown,
        document.contentHash,
        previousDocument,
      );
    },
    writeIndex: () => indexChineseArticle(env, id, chinese.markdown),
    switchRow: () =>
      drizzle(env.DB)
        .update(articles)
        .set({
          title: chinese.title,
          summary: chinese.summary,
          contentHash: document.contentHash,
          tagsJson: JSON.stringify(document.tags),
          linksJson: JSON.stringify(document.links),
          updatedAt: new Date().toISOString(),
        })
        .where(and(eq(articles.id, id), eq(articles.contentHash, expectedHash)))
        .returning()
        .get(),
    cleanupNewVersion: async () => {
      const cleanup = [
        deleteArticleArtifacts(env, id, document.contentHash),
        indexChineseArticle(env, id, previousDocument.markdown),
      ];
      if (written) cleanup.push(rollbackDocument(env.KNOWLEDGE_BUCKET, previousDocument, written));
      await Promise.all(cleanup);
    },
    cleanupPreviousVersion: () =>
      deleteArticleCache(env.KNOWLEDGE_CACHE, id, expectedHash, articleLocales),
  });
  if (!updated) return undefined;
  return readArticle(env, updated);
}

export async function hasCurrentTranslation(
  env: CloudflareEnv,
  id: string,
  locale: TranslationLocale,
  sourceHash: string,
): Promise<boolean> {
  const row = await drizzle(env.DB)
    .select({ articleId: articleTranslations.articleId })
    .from(articleTranslations)
    .where(
      and(
        eq(articleTranslations.articleId, id),
        eq(articleTranslations.locale, locale),
        eq(articleTranslations.sourceHash, sourceHash),
      ),
    )
    .get();
  if (!row) return false;
  return Boolean(await env.KNOWLEDGE_BUCKET.head(articleObjectKey(id, locale)));
}

export async function saveArticleTranslation(
  env: CloudflareEnv,
  id: string,
  locale: TranslationLocale,
  sourceHash: string,
  translation: ParsedArticleDocument,
): Promise<void> {
  const article = await getArticleRow(env, "owner", "id", id);
  if (!article || article.contentHash !== sourceHash) return;
  const previousTranslation = await drizzle(env.DB)
    .select()
    .from(articleTranslations)
    .where(and(eq(articleTranslations.articleId, id), eq(articleTranslations.locale, locale)))
    .get();
  const previous = previousTranslation
    ? await readStoredDocument(env.KNOWLEDGE_BUCKET, id, locale, previousTranslation.sourceHash)
    : null;
  if (previousTranslation && !previous) {
    throw new Error(`Translation Markdown is missing for article ${id}/${locale}`);
  }
  const written = await writeDocument(
    env.KNOWLEDGE_BUCKET,
    articleObjectKey(id, locale),
    translation.markdown,
    sourceHash,
    previous,
  );
  try {
    await drizzle(env.DB)
      .insert(articleTranslations)
      .values({
        articleId: id,
        locale,
        title: translation.title,
        summary: translation.summary,
        sourceHash,
      })
      .onConflictDoUpdate({
        target: [articleTranslations.articleId, articleTranslations.locale],
        set: {
          title: translation.title,
          summary: translation.summary,
          sourceHash,
        },
      });
  } catch (error) {
    await rollbackDocument(env.KNOWLEDGE_BUCKET, previous, written);
    throw error;
  }
  const hashes = new Set([sourceHash]);
  if (previous) hashes.add(previous.contentHash);
  await Promise.all(
    [...hashes].map((hash) => deleteArticleCache(env.KNOWLEDGE_CACHE, id, hash, [locale])),
  );
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
    await deleteArticleCache(env.KNOWLEDGE_CACHE, id, expectedHash, articleLocales);
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
  const chinese = await readStoredDocument(env.KNOWLEDGE_BUCKET, id, "zh", previous.contentHash);
  if (!chinese) throw new Error(`Canonical Chinese Markdown is missing for article ${id}`);
  const translations = await drizzle(env.DB)
    .select()
    .from(articleTranslations)
    .where(eq(articleTranslations.articleId, id));
  const translatedDocuments = await Promise.all(
    translations.map(async (translation) => {
      const document = await readStoredDocument(
        env.KNOWLEDGE_BUCKET,
        id,
        translation.locale,
        translation.sourceHash,
      );
      if (!document) {
        throw new Error(`Translation Markdown is missing for article ${id}/${translation.locale}`);
      }
      return document;
    }),
  );
  const documents = [chinese, ...translatedDocuments];
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
        deleteStoredDocuments(env.KNOWLEDGE_BUCKET, documents),
        deleteArticleArtifacts(env, id, expectedHash),
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
