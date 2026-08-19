import { parseArticleDocument, type ArticleDocumentSet } from "@my-knowledge/content";

import type { Principal } from "@/auth/types";

import type { RankedArticle } from "../types";
import { getArticleRow } from "./document";
import { articleObjectKey, articleSummary } from "./record";

export const MY_KNOWLEDGE_INSTANCE = "my-knowledge";

export async function indexArticleItems(
  env: CloudflareEnv,
  articleId: string,
  document: ArticleDocumentSet,
): Promise<void> {
  for (const [locale, value] of Object.entries(document.editions)) {
    const item = await env.AI_SEARCH.get(MY_KNOWLEDGE_INSTANCE).items.upload(
      `${articleId}/${locale}.md`,
      value.markdown,
    );
    if (item.status === "error")
      throw new Error(`AI Search indexing failed for ${articleId}/${locale}`);
  }
}

export async function deleteSearchItems(
  env: CloudflareEnv,
  articleId: string,
  locales: readonly string[],
): Promise<void> {
  const items = env.AI_SEARCH.get(MY_KNOWLEDGE_INSTANCE).items;
  const deletions = locales.map(async (locale) => {
    const { result } = await items.list({ key: `${articleId}/${locale}.md` });
    await Promise.all(result.map((item) => items.delete(item.id)));
  });
  const results = await Promise.allSettled(deletions);
  const failures = results.filter((result) => result.status === "rejected");
  if (failures.length > 0) {
    throw new AggregateError(
      failures.map((failure) => failure.reason),
      "AI Search cleanup failed",
    );
  }
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
    const object = await env.KNOWLEDGE_BUCKET.get(articleObjectKey(row.slug, summary.tags, "zh"));
    if (!object) continue;
    ranked.push({
      article: summary,
      markdown: parseArticleDocument(await object.text()).markdown,
      score,
    });
  }
  return ranked;
}

export async function chatAboutKnowledge(
  env: CloudflareEnv,
  messages: { role: "user" | "assistant"; content: string }[],
): Promise<{ answer: string; articleIds: string[] }> {
  const response = await env.AI_SEARCH.get(MY_KNOWLEDGE_INSTANCE).chatCompletions({ messages });
  const articleIds = new Set<string>();
  for (const chunk of response.chunks) {
    const [articleId = ""] = chunk.item.key.split("/");
    if (articleId.length > 0) articleIds.add(articleId);
  }
  return { answer: response.choices[0]?.message.content ?? "", articleIds: [...articleIds] };
}
