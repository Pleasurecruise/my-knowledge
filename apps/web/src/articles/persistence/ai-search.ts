import { isDailyArticle, parseArticleDocument } from "@my-knowledge/content";

import type { Principal } from "@/auth/types";

import type { RankedArticle } from "../types";
import { getArticleRow } from "./document";
import { articleObjectKey, articleSummary } from "./record";

export const MY_KNOWLEDGE_INSTANCE = "my-knowledge";

export async function indexChineseArticle(
  env: CloudflareEnv,
  articleId: string,
  markdown: string,
  tags: readonly string[],
): Promise<void> {
  if (isDailyArticle(tags)) return;
  const item = await env.AI_SEARCH.get(MY_KNOWLEDGE_INSTANCE).items.upload(
    `${articleId}/zh.md`,
    markdown,
  );
  if (item.status === "error") throw new Error(`AI Search indexing failed for ${articleId}`);
}

export async function deleteSearchItem(env: CloudflareEnv, articleId: string): Promise<void> {
  const items = env.AI_SEARCH.get(MY_KNOWLEDGE_INSTANCE).items;
  const { result } = await items.list({ key: `${articleId}/zh.md` });
  await Promise.all(result.map((item) => items.delete(item.id)));
}

export async function searchAiArticles(
  env: CloudflareEnv,
  principal: Principal,
  query: string,
  limit: number,
): Promise<RankedArticle[]> {
  const response = await env.AI_SEARCH.get(MY_KNOWLEDGE_INSTANCE).search({
    query,
    ai_search_options: { retrieval: { max_num_results: limit } },
  });
  const bestScore = new Map<string, number>();
  for (const chunk of response.chunks) {
    const [articleId = ""] = chunk.item.key.split("/");
    if (articleId.length === 0) continue;
    const current = bestScore.get(articleId);
    if (current === undefined || chunk.score > current) bestScore.set(articleId, chunk.score);
  }
  const ranked: RankedArticle[] = [];
  for (const [articleId, score] of [...bestScore].sort(([, left], [, right]) => right - left)) {
    const row = await getArticleRow(env, principal, "id", articleId);
    if (!row) continue;
    const summary = articleSummary(row);
    if (isDailyArticle(summary.tags)) continue;
    const object = await env.KNOWLEDGE_BUCKET.get(articleObjectKey(row.id, "zh"));
    if (!object) continue;
    ranked.push({
      article: summary,
      markdown: parseArticleDocument(await object.text()).markdown,
      score,
    });
  }
  return ranked;
}
