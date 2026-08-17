import { parseArticleDocument } from "@my-knowledge/content";

import type { Principal } from "@/auth/types";

import type { RankedArticle } from "../types";
import { getArticleRow } from "./document";
import { articleObjectKey, articleSummary, parseArticleVectorId } from "./record";

export async function findVectorArticles(
  env: CloudflareEnv,
  principal: Principal,
  embedding: number[],
  limit: number,
): Promise<RankedArticle[]> {
  const matches = await env.KNOWLEDGE_INDEX.query(embedding, {
    topK: limit,
    returnMetadata: true,
    returnValues: false,
  });
  const ranked: RankedArticle[] = [];
  for (const match of matches.matches) {
    const vectorId = parseArticleVectorId(match.id);
    if (!vectorId) continue;
    const { id, hash } = vectorId;
    const row = await getArticleRow(env, principal, "id", id);
    if (!row || row.contentHash !== hash) continue;
    const summary = articleSummary(row);
    const object = await env.KNOWLEDGE_BUCKET.get(articleObjectKey(row.slug, summary.tags, "zh"));
    if (!object) throw new Error(`Canonical zh Markdown is missing for article ${row.id}`);
    const document = parseArticleDocument(await object.text());
    ranked.push({ article: summary, markdown: document.markdown, score: match.score });
  }
  return ranked;
}
