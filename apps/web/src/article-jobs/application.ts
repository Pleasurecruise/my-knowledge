import { getArticleById } from "@/articles";

import {
  deleteArticleJob,
  getArticleJobRow,
  insertArticleJob,
  parseArticleJobResult,
} from "./persistence";
import { articleJobInputKey, type AcceptedArticleJob, type ArticleJobResult } from "./types";

export const articleJobInputTtlSeconds = 48 * 60 * 60;

export async function submitArticleJob(
  env: CloudflareEnv,
  content: string,
): Promise<AcceptedArticleJob> {
  const jobId = crypto.randomUUID();
  const inputKey = articleJobInputKey(jobId);
  const now = new Date().toISOString();
  let inserted = false;

  await env.KNOWLEDGE_CACHE.put(inputKey, content, { expirationTtl: articleJobInputTtlSeconds });
  try {
    await insertArticleJob(env, jobId, now);
    inserted = true;
    await env.ARTICLE_JOBS.send({ jobId });
  } catch (error) {
    const cleanupFailures: unknown[] = [];
    if (inserted) {
      try {
        await deleteArticleJob(env, jobId);
      } catch (cleanupError) {
        cleanupFailures.push(cleanupError);
      }
    }
    try {
      await env.KNOWLEDGE_CACHE.delete(inputKey);
    } catch (cleanupError) {
      cleanupFailures.push(cleanupError);
    }
    if (cleanupFailures.length > 0) {
      throw new AggregateError(
        [error, ...cleanupFailures],
        "Article job submission and cleanup both failed",
      );
    }
    throw error;
  }

  return { status: "accepted", jobId };
}

export async function getArticleJob(
  env: CloudflareEnv,
  jobId: string,
): Promise<ArticleJobResult | undefined> {
  const row = await getArticleJobRow(env, jobId);
  if (!row) return undefined;
  if (row.status === "pending" || row.status === "processing") {
    return { status: row.status, jobId };
  }
  const terminal = parseArticleJobResult(row);
  if (!terminal) throw new Error("Terminal article job has no parsed result");
  if (terminal.status === "failed") return { status: "failed", jobId, error: terminal.error };
  const article = await getArticleById(env, "owner", terminal.articleId);
  if (!article) throw new Error("Created article job references a missing article");
  return { status: "created", jobId, article };
}
