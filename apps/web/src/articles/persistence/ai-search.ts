import { canonicalizeTags, isDailyArticle } from "@my-knowledge/content";

import type { Principal } from "@/auth/types";

import type { RankedArticle } from "../types";
import { getArticleRow, readArticleText } from "./document";
import { articleSummary, type ArticleRow } from "./record";

export const MY_KNOWLEDGE_INSTANCE = "my-knowledge";

export async function indexChineseArticle(
  env: CloudflareEnv,
  articleId: string,
  markdown: string,
  tags: readonly string[],
): Promise<void> {
  if (isDailyArticle(tags)) return;
  const item = await env.AI_SEARCH.get(MY_KNOWLEDGE_INSTANCE).items.uploadAndPoll(
    `${articleId}/zh.md`,
    markdown,
    { timeoutMs: 30_000 },
  );
  if (item.status !== "completed")
    throw new Error(`AI Search indexing incomplete for ${articleId}`);
}

export async function deleteSearchItem(env: CloudflareEnv, articleId: string): Promise<void> {
  const items = env.AI_SEARCH.get(MY_KNOWLEDGE_INSTANCE).items;
  const { result } = await items.list({ key: `${articleId}/zh.md` });
  await Promise.all(result.map((item) => items.delete(item.id)));
}

async function searchArticleCandidates(
  env: CloudflareEnv,
  principal: Principal,
  query: string,
  limit: number,
  tags: readonly string[],
) {
  const wantedTags = canonicalizeTags(tags).map((tag) => tag.toLocaleLowerCase("en-US"));
  const response = await env.AI_SEARCH.get(MY_KNOWLEDGE_INSTANCE)
    .search({
      query,
      ai_search_options: {
        cache: { enabled: false },
        retrieval: { max_num_results: 50, metadata_only: true, return_on_failure: false },
      },
    })
    .catch(() => {
      throw new Error("AI Search is unavailable");
    });
  const bestScore = new Map<string, number>();
  for (const chunk of response.chunks) {
    const [articleId = ""] = chunk.item.key.split("/");
    if (articleId.length === 0) continue;
    const current = bestScore.get(articleId);
    if (current === undefined || chunk.score > current) bestScore.set(articleId, chunk.score);
  }
  const ranked: { row: ArticleRow; score: number }[] = [];
  for (const [articleId, score] of [...bestScore].sort(([, left], [, right]) => right - left)) {
    const row = await getArticleRow(env, principal, articleId);
    if (!row) continue;
    const summary = articleSummary(row);
    if (isDailyArticle(summary.tags)) continue;
    if (
      !wantedTags.every((wanted) =>
        summary.tags.some((tag) => {
          const normalized = tag.toLocaleLowerCase("en-US");
          return normalized === wanted || normalized.startsWith(`${wanted}/`);
        }),
      )
    )
      continue;
    ranked.push({ row, score });
    if (ranked.length === limit) break;
  }
  return ranked;
}

export async function searchAiArticles(
  env: CloudflareEnv,
  principal: Principal,
  query: string,
  limit: number,
  tags: readonly string[] = [],
): Promise<RankedArticle[]> {
  const candidates = await searchArticleCandidates(env, principal, query, limit, tags);
  const results: RankedArticle[] = [];
  for (const { row, score } of candidates) {
    const text = await readArticleText(env, row, "zh");
    results.push({ article: articleSummary(row), markdown: text.markdown, score });
  }
  return results;
}

export async function searchAiSummaries(env: CloudflareEnv, query: string, limit: number) {
  const candidates = await searchArticleCandidates(env, "owner", query, limit, []);
  return candidates.map(({ row }) => articleSummary(row));
}
