import {
  type ArticleDocumentSet,
  type ArticleSummary,
  createSlug,
  normalizeLocale,
  visibilitySchema,
} from "@my-knowledge/content";
import { eq } from "drizzle-orm";
import { drizzle } from "drizzle-orm/d1";
import { z } from "zod";

import { articles } from "@/db/schema";

const editionMetaSchema = z.object({ title: z.string(), summary: z.string() });
const metaSchema = z.object({ zh: editionMetaSchema }).catchall(editionMetaSchema);
const stringArraySchema = z.array(z.string());

export type ArticleRow = typeof articles.$inferSelect;

export function articleObjectKey(slug: string, tags: readonly string[], locale: string): string {
  const category = tags.at(0);
  const articlePath = category ? `${category}/${slug}` : slug;
  return `knowledge/${articlePath}/${normalizeLocale(locale)}.md`;
}

const articleVectorIdentitySchema = z.object({
  id: z.uuid(),
  hash: z.string().regex(/^[a-f0-9]{64}$/u),
});

export const articleVectorMetadataSchema = z.object({
  articleId: z.uuid(),
  contentHash: z.string().regex(/^[a-f0-9]{64}$/u),
});

export function articleVectorId(id: string, hash: string): string {
  const identity = articleVectorIdentitySchema.parse({ id, hash });
  return `${identity.id.replaceAll("-", "")}:${identity.hash.slice(0, 31)}`;
}

export function articleSummary(row: ArticleRow): ArticleSummary {
  const parsedMeta: unknown = JSON.parse(row.metaJson);
  const parsedTags: unknown = JSON.parse(row.tagsJson);
  const meta = metaSchema.parse(parsedMeta);
  return {
    id: row.id,
    slug: row.slug,
    editions: meta,
    tags: stringArraySchema.parse(parsedTags),
    visibility: visibilitySchema.parse(row.visibility),
    contentHash: row.contentHash,
    createdAt: row.createdAt,
    updatedAt: row.updatedAt,
  };
}

export function articleLinks(row: ArticleRow): string[] {
  const parsed: unknown = JSON.parse(row.linksJson);
  return stringArraySchema.parse(parsed);
}

export function articleDocumentMeta(document: ArticleDocumentSet) {
  return Object.fromEntries(
    Object.entries(document.editions).map(([locale, value]) => [
      locale,
      { title: value.title, summary: value.summary },
    ]),
  );
}

export function requiredChineseEdition(document: ArticleDocumentSet) {
  return document.editions.zh;
}

export async function allocateArticleSlug(env: CloudflareEnv, title: string): Promise<string> {
  const base = createSlug(title);
  for (let suffix = 1; suffix <= 1_000; suffix += 1) {
    const slug = suffix === 1 ? base : `${base}-${suffix}`;
    const existing = await drizzle(env.DB)
      .select({ id: articles.id })
      .from(articles)
      .where(eq(articles.slug, slug))
      .get();
    if (!existing) return slug;
  }
  throw new Error("Could not allocate a unique article slug");
}
