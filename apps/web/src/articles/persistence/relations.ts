import type { ArticleSummary } from "@my-knowledge/content";
import { and, desc, sql } from "drizzle-orm";
import { drizzle } from "drizzle-orm/d1";

import type { Principal } from "@/auth/types";
import { articles } from "@/db/schema";

import { articleLinkTargets } from "../links";

import { authorizedCondition } from "./query";
import { articleSummary } from "./record";

export async function listArticleBacklinks(
  env: CloudflareEnv,
  principal: Principal,
  article: ArticleSummary,
  limit = 4,
): Promise<ArticleSummary[]> {
  const targets = articleLinkTargets(env.BETTER_AUTH_URL, article.slug);
  const rows = await drizzle(env.DB)
    .select()
    .from(articles)
    .where(
      and(
        authorizedCondition(principal),
        sql`exists (
          select 1 from json_each(${articles.linksJson})
          where json_each.value in (${sql.join(
            targets.map((target) => sql`${target}`),
            sql`, `,
          )})
        )`,
      ),
    )
    .orderBy(desc(articles.updatedAt), desc(articles.id))
    .limit(limit);
  return rows.map((row) => articleSummary(row));
}
