import type { AcceptedArticleCreation } from "./types";

export const articleJobTtlSeconds = 48 * 60 * 60;

export async function submitArticleJob(
  env: CloudflareEnv,
  content: string,
): Promise<AcceptedArticleCreation> {
  const articleId = crypto.randomUUID();
  const inputKey = `article-jobs/${articleId}/input`;
  await env.KNOWLEDGE_CACHE.put(inputKey, content, { expirationTtl: articleJobTtlSeconds });
  await env.ARTICLE_JOBS.send({ type: "create", articleId });
  return { status: "accepted", articleId };
}
