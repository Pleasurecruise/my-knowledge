import { canonicalizeTags, type ArticleSummary } from "@my-knowledge/content";
import { and, desc, eq, lt, or, sql, type SQL } from "drizzle-orm";
import { drizzle } from "drizzle-orm/d1";
import { z } from "zod";

import type { ArticleGraphRecord, ArticleListQuery, ArticlePage, TagCount } from "../types";
import type { Principal } from "@/auth/types";
import { articles } from "@/db/schema";

import { articleLinks, articleSummary, type ArticleRow } from "./record";

const cursorSchema = z.object({ updatedAt: z.string(), id: z.string() });

function encodeCursor(row: ArticleRow): string {
  return btoa(JSON.stringify({ updatedAt: row.updatedAt, id: row.id }));
}

function decodeCursor(cursor: string) {
  const parsed: unknown = JSON.parse(atob(cursor));
  return cursorSchema.parse(parsed);
}

export function authorizedCondition(principal: Principal): SQL | undefined {
  return principal === "anonymous" ? eq(articles.visibility, "public") : undefined;
}

export async function listArticles(
  env: CloudflareEnv,
  principal: Principal,
  input: ArticleListQuery,
): Promise<ArticlePage> {
  const filters: SQL[] = [];
  const authorized = authorizedCondition(principal);
  if (authorized) filters.push(authorized);
  if (input.visibility) {
    if (principal === "anonymous" && input.visibility === "private")
      return { articles: [], cursor: undefined };
    filters.push(eq(articles.visibility, input.visibility));
  }
  for (const tag of canonicalizeTags(input.tags)) {
    const normalized = tag.toLocaleLowerCase("en-US");
    filters.push(sql`exists (
        select 1 from json_each(${articles.tagsJson})
        where lower(json_each.value) = ${normalized}
           or instr(lower(json_each.value), ${`${normalized}/`}) = 1
      )`);
  }
  if (input.cursor) {
    const cursor = decodeCursor(input.cursor);
    const older = or(
      lt(articles.updatedAt, cursor.updatedAt),
      and(eq(articles.updatedAt, cursor.updatedAt), lt(articles.id, cursor.id)),
    );
    if (older) filters.push(older);
  }

  const rows = await drizzle(env.DB)
    .select()
    .from(articles)
    .where(filters.length > 0 ? and(...filters) : undefined)
    .orderBy(desc(articles.updatedAt), desc(articles.id))
    .limit(input.limit + 1);
  const pageRows = rows.slice(0, input.limit);
  const next = rows.length > input.limit ? pageRows.at(-1) : undefined;
  return {
    articles: pageRows.map((row) => articleSummary(row)),
    cursor: next ? encodeCursor(next) : undefined,
  };
}

export async function listPublicArticleSummaries(env: CloudflareEnv): Promise<ArticleSummary[]> {
  const rows = await drizzle(env.DB)
    .select()
    .from(articles)
    .where(eq(articles.visibility, "public"))
    .orderBy(desc(articles.updatedAt), desc(articles.id));
  return rows.map((row) => articleSummary(row));
}

export async function searchArticles(
  env: CloudflareEnv,
  principal: Principal,
  query: string,
  limit: number,
): Promise<ArticleSummary[]> {
  const term = query.trim().toLocaleLowerCase("en-US");
  const matches = or(
    sql`instr(lower(${articles.slug}), ${term}) > 0`,
    sql`instr(lower(${articles.title}), ${term}) > 0`,
    sql`instr(lower(${articles.summary}), ${term}) > 0`,
    sql`exists (
      select 1 from json_each(${articles.tagsJson})
      where instr(lower(json_each.value), ${term}) > 0
    )`,
  );
  const rows = await drizzle(env.DB)
    .select()
    .from(articles)
    .where(and(authorizedCondition(principal), matches))
    .orderBy(desc(articles.updatedAt), desc(articles.id))
    .limit(limit);
  return rows.map((row) => articleSummary(row));
}

export async function listGraphArticles(
  env: CloudflareEnv,
  principal: Principal,
  limit: number,
): Promise<ArticleGraphRecord[]> {
  const rows = await drizzle(env.DB)
    .select()
    .from(articles)
    .where(authorizedCondition(principal))
    .orderBy(desc(articles.updatedAt), desc(articles.id))
    .limit(limit);
  return rows.map((row) => ({ article: articleSummary(row), links: articleLinks(row) }));
}

export const tagCountQuery = `
WITH RECURSIVE
rawTags(articleId, fullPath) AS (
  SELECT articles.id, lower(json_each.value)
  FROM articles, json_each(articles.tagsJson)
  WHERE (? = 0 OR articles.visibility = 'public')
),
paths(articleId, path, rest) AS (
  SELECT
    articleId,
    CASE
      WHEN instr(fullPath, '/') = 0 THEN fullPath
      ELSE substr(fullPath, 1, instr(fullPath, '/') - 1)
    END,
    CASE
      WHEN instr(fullPath, '/') = 0 THEN ''
      ELSE substr(fullPath, instr(fullPath, '/') + 1)
    END
  FROM rawTags
  UNION ALL
  SELECT
    articleId,
    path || '/' || CASE WHEN instr(rest, '/') = 0 THEN rest ELSE substr(rest, 1, instr(rest, '/') - 1) END,
    CASE WHEN instr(rest, '/') = 0 THEN '' ELSE substr(rest, instr(rest, '/') + 1) END
  FROM paths
  WHERE rest <> ''
)
SELECT path, COUNT(DISTINCT articleId) AS count
FROM paths
GROUP BY path
ORDER BY path ASC`;

export async function listTags(env: CloudflareEnv, principal: Principal): Promise<TagCount[]> {
  const { results } = await env.DB.prepare(tagCountQuery)
    .bind(principal === "anonymous" ? 1 : 0)
    .all<TagCount>();
  return results;
}
