import { getArticleById } from "@/articles";

import { articleJobFailureSchema, type AcceptedArticleJob, type ArticleJobResult } from "./types";

export const articleJobTtlSeconds = 48 * 60 * 60;

export async function submitArticleJob(
  env: CloudflareEnv,
  content: string,
): Promise<AcceptedArticleJob> {
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
  return { status: "accepted", jobId: articleId };
}

export async function getArticleJob(
  env: CloudflareEnv,
  jobId: string,
): Promise<ArticleJobResult | null> {
  const article = await getArticleById(env, "owner", jobId);
  if (article) return { status: "created", jobId, article };
  const failure = await env.KNOWLEDGE_CACHE.get(`article-jobs/${jobId}/failure`);
  if (failure) {
    const result: unknown = JSON.parse(failure);
    return { status: "failed", jobId, error: articleJobFailureSchema.parse(result).error };
  }
  return (await env.KNOWLEDGE_CACHE.get(`article-jobs/${jobId}/input`)) === null
    ? null
    : { status: "pending", jobId };
}
