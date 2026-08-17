import { DUPLICATE_THRESHOLD } from "@my-knowledge/ai-core";
import type { Article } from "@my-knowledge/content";
import { and, desc, sql } from "drizzle-orm";
import { drizzle } from "drizzle-orm/d1";

import type { Principal } from "@/auth/types";
import { articles } from "@/db/schema";

import type { ArticleRelations, RankedArticleSummary } from "../types";
import { getArticleRow } from "./document";
import { authorizedCondition } from "./query";
import { articleSummary, articleVectorId, articleVectorMetadataSchema } from "./record";

export async function getArticleRelations(
  env: CloudflareEnv,
  principal: Principal,
  article: Article,
  limit = 4,
): Promise<ArticleRelations> {
  const backlinkRows = await drizzle(env.DB)
    .select()
    .from(articles)
    .where(
      and(
        authorizedCondition(principal),
        sql`exists (
          select 1 from json_each(${articles.linksJson})
          where json_each.value = ${article.slug}
        )`,
      ),
    )
    .orderBy(desc(articles.updatedAt), desc(articles.id))
    .limit(limit);

  let source: VectorizeVector | undefined;
  try {
    [source] = await env.KNOWLEDGE_INDEX.getByIds([
      articleVectorId(article.id, article.contentHash),
    ]);
  } catch {
    return {
      backlinks: backlinkRows.map(articleSummary),
      semantic: { status: "unavailable" },
    };
  }
  if (!source) {
    return {
      backlinks: backlinkRows.map(articleSummary),
      semantic: { status: "unavailable" },
    };
  }

  let matches: VectorizeMatches;
  try {
    matches = await env.KNOWLEDGE_INDEX.query(source.values, {
      topK: limit + 1,
      returnMetadata: "all",
      returnValues: false,
    });
  } catch {
    return {
      backlinks: backlinkRows.map(articleSummary),
      semantic: { status: "unavailable" },
    };
  }

  const related: RankedArticleSummary[] = [];
  for (const match of matches.matches) {
    const metadata = articleVectorMetadataSchema.safeParse(match.metadata);
    if (!metadata.success) continue;
    const { articleId: id, contentHash: hash } = metadata.data;
    if (id === article.id || match.score >= DUPLICATE_THRESHOLD) continue;
    const row = await getArticleRow(env, principal, "id", id);
    if (!row || row.contentHash !== hash) continue;
    related.push({ article: articleSummary(row), score: match.score });
    if (related.length === limit) break;
  }

  return {
    backlinks: backlinkRows.map(articleSummary),
    semantic: { status: "available", articles: related },
  };
}
