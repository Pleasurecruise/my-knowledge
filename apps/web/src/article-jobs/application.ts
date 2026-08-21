import type { AcceptedArticleCreation } from "./types";

export const articleJobTtlSeconds = 48 * 60 * 60;

export async function submitArticleJob(
  env: CloudflareEnv,
  content: string,
): Promise<AcceptedArticleCreation> {
  const articleId = crypto.randomUUID();
  const inputKey = `article-jobs/${articleId}/input`;
  await env.KNOWLEDGE_CACHE.put(inputKey, content, { expirationTtl: articleJobTtlSeconds });
  try {
    await env.ARTICLE_JOBS.send({ type: "create", articleId });
  } catch (error) {
    try {
      await env.KNOWLEDGE_CACHE.delete(inputKey);
    } catch (cleanupError) {
      throw new AggregateError([error, cleanupError], "Article submission and cleanup both failed");
    }
    throw error;
  }
  return { status: "accepted", articleId };
}
