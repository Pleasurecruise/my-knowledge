import { type Article, type ArticleText, parseArticleDocument } from "@my-knowledge/content";
import { and, eq } from "drizzle-orm";
import { drizzle } from "drizzle-orm/d1";

import { readArticleCache, writeArticleCache } from "./cache";
import { authorizedCondition } from "./query";
import { articleObjectKey, articleSummary, type ArticleRow } from "./record";
import type { Principal } from "@/auth/types";
import { articles } from "@/db/schema";

export async function readArticle(env: CloudflareEnv, row: ArticleRow): Promise<Article> {
  const summary = articleSummary(row);
  const entries = await Promise.all(
    Object.keys(summary.editions).map(async (locale): Promise<[string, ArticleText]> => {
      if (summary.visibility === "public") {
        try {
          const cached = await readArticleCache(
            env.KNOWLEDGE_CACHE,
            row.id,
            row.contentHash,
            locale,
          );
          if (cached) return [locale, cached];
        } catch (error) {
          console.error("Article cache read failed", error);
        }
      }
      const object = await env.KNOWLEDGE_BUCKET.get(
        articleObjectKey(row.slug, summary.tags, locale),
      );
      if (!object) throw new Error(`Canonical ${locale} Markdown is missing for article ${row.id}`);
      const document = parseArticleDocument(await object.text());
      const articleText = {
        title: document.title,
        summary: document.summary,
        markdown: document.markdown,
      };
      if (summary.visibility === "public") {
        try {
          await writeArticleCache(
            env.KNOWLEDGE_CACHE,
            row.id,
            row.contentHash,
            locale,
            articleText,
          );
        } catch (error) {
          console.error("Article cache write failed", error);
        }
      }
      return [locale, articleText];
    }),
  );
  const editions = Object.fromEntries(entries);
  const zh = editions.zh;
  if (!zh) throw new Error(`Canonical Chinese Markdown is missing for article ${row.id}`);
  return { ...summary, editions: { ...editions, zh } };
}

export async function getArticleRow(
  env: CloudflareEnv,
  principal: Principal,
  field: "id" | "slug",
  value: string,
) {
  const identity = field === "id" ? eq(articles.id, value) : eq(articles.slug, value);
  return drizzle(env.DB)
    .select()
    .from(articles)
    .where(and(identity, authorizedCondition(principal)))
    .get();
}

export async function getArticleById(env: CloudflareEnv, principal: Principal, id: string) {
  const row = await getArticleRow(env, principal, "id", id);
  return row ? readArticle(env, row) : undefined;
}

export async function getArticleBySlug(env: CloudflareEnv, principal: Principal, slug: string) {
  const row = await getArticleRow(env, principal, "slug", slug);
  return row ? readArticle(env, row) : undefined;
}

export async function hasArticleVersion(
  env: CloudflareEnv,
  id: string,
  expectedHash: string,
): Promise<boolean> {
  const row = await getArticleRow(env, "owner", "id", id);
  return row?.contentHash === expectedHash;
}
