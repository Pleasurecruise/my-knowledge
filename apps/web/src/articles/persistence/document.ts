import {
  type Article,
  type ArticleText,
  type ArticleSummary,
  readArticleDocument,
  resolveLocale,
} from "@my-knowledge/content";
import { and, desc, eq, or, sql } from "drizzle-orm";
import { drizzle } from "drizzle-orm/d1";

import { readArticleCache, writeArticleCache } from "./cache";
import { authorizedCondition } from "./query";
import { articleObjectKey, articleSummary, type ArticleRow } from "./record";
import type { Principal } from "@/auth/types";
import { articles, articleTranslations } from "@/db/schema";

export async function readArticle(env: CloudflareEnv, row: ArticleRow): Promise<Article> {
  const translations = await drizzle(env.DB)
    .select()
    .from(articleTranslations)
    .where(
      and(
        eq(articleTranslations.articleId, row.id),
        eq(articleTranslations.sourceHash, row.contentHash),
      ),
    );
  const summary = articleSummary(row, translations);
  const entries = await Promise.all(
    Object.keys(summary.editions).map(async (locale): Promise<[string, ArticleText]> => [
      locale,
      await readArticleText(env, row, locale),
    ]),
  );
  const editions = Object.fromEntries(entries);
  const zh = editions.zh;
  if (!zh) throw new Error(`Canonical Chinese Markdown is missing for article ${row.id}`);
  return { ...summary, editions: { ...editions, zh } };
}

export async function readArticleText(
  env: CloudflareEnv,
  row: ArticleRow,
  locale: string,
): Promise<ArticleText> {
  if (row.visibility === "public") {
    const cached = await readArticleCache(env.KNOWLEDGE_CACHE, row.id, row.contentHash, locale);
    if (cached) return cached;
  }
  const object = await env.KNOWLEDGE_BUCKET.get(articleObjectKey(row.id, locale));
  if (!object) throw new Error(`Canonical ${locale} Markdown is missing for article ${row.id}`);
  if (
    object.customMetadata?.contentHash !== undefined &&
    object.customMetadata.contentHash !== row.contentHash
  )
    throw new Error(`Article version changed while reading ${row.id}`);
  const document = readArticleDocument(await object.text());
  const articleText = {
    title: document.title,
    summary: document.summary,
    markdown: document.markdown,
  };
  if (row.visibility === "public") {
    await writeArticleCache(env.KNOWLEDGE_CACHE, row.id, row.contentHash, locale, articleText);
  }
  return articleText;
}

export async function localizeArticles(
  env: CloudflareEnv,
  summaries: ArticleSummary[],
  requestedLocale: string,
): Promise<ArticleSummary[]> {
  const locale = resolveLocale(["zh", "en", "ja"], requestedLocale) ?? "zh";
  if ((locale !== "en" && locale !== "ja") || summaries.length === 0) return summaries;
  const translations = await drizzle(env.DB)
    .select()
    .from(articleTranslations)
    .where(
      and(
        eq(articleTranslations.locale, locale),
        sql`${articleTranslations.articleId} in (select value from json_each(${JSON.stringify(summaries.map(({ id }) => id))}))`,
      ),
    );
  const byId = new Map(translations.map((translation) => [translation.articleId, translation]));
  return summaries.map((article) => {
    const translation = byId.get(article.id);
    if (!translation || translation.sourceHash !== article.contentHash) return article;
    return {
      ...article,
      editions: {
        ...article.editions,
        [locale]: { title: translation.title, summary: translation.summary },
      },
    };
  });
}

export async function getArticleMetadata(env: CloudflareEnv, slug: string) {
  const row = await getArticleRow(env, "anonymous", "link", decodeURIComponent(slug));
  return row ? articleSummary(row) : null;
}

export async function getArticleEdition(
  env: CloudflareEnv,
  principal: Principal,
  slug: string,
  requestedLocale: string,
) {
  const row = await getArticleRow(env, principal, "link", decodeURIComponent(slug));
  if (!row) return null;
  const translations =
    requestedLocale === "zh"
      ? []
      : await drizzle(env.DB)
          .select()
          .from(articleTranslations)
          .where(
            and(
              eq(articleTranslations.articleId, row.id),
              eq(articleTranslations.sourceHash, row.contentHash),
            ),
          );
  const article = articleSummary(row, translations);
  const locale = resolveLocale(Object.keys(article.editions), requestedLocale) ?? "zh";
  return { article, locale, text: await readArticleText(env, row, locale) };
}

export async function getArticleRow(
  env: CloudflareEnv,
  principal: Principal,
  field: "id" | "slug" | "link",
  value: string,
) {
  const identity =
    field === "link"
      ? or(eq(articles.id, value), eq(articles.slug, value))
      : eq(articles[field], value);
  return drizzle(env.DB)
    .select()
    .from(articles)
    .where(and(identity, authorizedCondition(principal)))
    .orderBy(desc(eq(articles.id, value)))
    .get();
}

export async function getArticleById(env: CloudflareEnv, principal: Principal, id: string) {
  const row = await getArticleRow(env, principal, "id", id);
  return row ? readArticle(env, row) : undefined;
}
