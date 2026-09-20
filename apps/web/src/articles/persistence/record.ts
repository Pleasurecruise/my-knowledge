import { type ArticleSummary, normalizeLocale, visibilitySchema } from "@my-knowledge/content";
import { z } from "zod";

import { articles, articleTranslations } from "@/db/schema";

const stringArraySchema = z.array(z.string());

export type ArticleRow = typeof articles.$inferSelect;
export type ArticleTranslationRow = typeof articleTranslations.$inferSelect;

export function articleObjectKey(articleId: string, locale: string): string {
  const normalized = normalizeLocale(locale);
  return normalized === "zh"
    ? `knowledge/${articleId}/zh.md`
    : `knowledge/${articleId}/i18n/${normalized}.md`;
}

export function articleSummary(
  row: ArticleRow,
  translations: readonly ArticleTranslationRow[] = [],
): ArticleSummary {
  const parsedTags: unknown = JSON.parse(row.tagsJson);
  const editions = Object.fromEntries(
    translations
      .filter((translation) => translation.sourceHash === row.contentHash)
      .map((translation) => [
        translation.locale,
        { title: translation.title, summary: translation.summary },
      ]),
  );
  return {
    id: row.id,
    editions: { ...editions, zh: { title: row.title, summary: row.summary } },
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
