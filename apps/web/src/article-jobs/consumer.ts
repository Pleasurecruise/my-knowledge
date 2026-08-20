import { createArticleFromContent } from "@/articles";

import {
  claimArticleJob,
  finishArticleJob,
  getArticleJobRow,
  parseArticleJobResult,
  releaseArticleJob,
} from "./persistence";
import { articleJobInputKey, articleJobMessageSchema, type ArticleJobMessage } from "./types";

const claimLeaseMilliseconds = 20 * 60 * 1_000;

async function settleKnownTerminalJob(
  env: CloudflareEnv,
  jobId: string,
  message: Message<ArticleJobMessage>,
): Promise<boolean> {
  const row = await getArticleJobRow(env, jobId);
  if (!row || parseArticleJobResult(row)) {
    await env.KNOWLEDGE_CACHE.delete(articleJobInputKey(jobId));
    message.ack();
    return true;
  }
  return false;
}

export async function consumeArticleJob(
  env: CloudflareEnv,
  message: Message<ArticleJobMessage>,
): Promise<void> {
  const parsed = articleJobMessageSchema.safeParse(message.body);
  if (!parsed.success) {
    console.error("Rejected an invalid article job message", parsed.error);
    message.ack();
    return;
  }

  const { jobId } = parsed.data;
  const now = new Date();
  const claimed = await claimArticleJob(
    env,
    jobId,
    now.toISOString(),
    new Date(now.getTime() - claimLeaseMilliseconds).toISOString(),
  );
  if (!claimed) {
    if (await settleKnownTerminalJob(env, jobId, message)) return;
    message.retry();
    return;
  }

  try {
    const content = await env.KNOWLEDGE_CACHE.get(articleJobInputKey(jobId));
    if (!content) throw new Error("Article job input is not available");
    const article = await createArticleFromContent(env, content);
    if (
      !(await finishArticleJob(
        env,
        jobId,
        { status: "created", articleId: article.id },
        new Date().toISOString(),
      ))
    ) {
      throw new Error("Article job claim expired before completion");
    }
  } catch {
    const failedAt = new Date().toISOString();
    if (message.attempts <= 3) {
      await releaseArticleJob(env, jobId, failedAt);
      message.retry();
      return;
    }
    if (
      !(await finishArticleJob(
        env,
        jobId,
        { status: "failed", error: "Article creation failed" },
        failedAt,
      ))
    ) {
      throw new Error("Article job could not record its terminal failure");
    }
    await env.KNOWLEDGE_CACHE.delete(articleJobInputKey(jobId));
    message.ack();
    return;
  }
  await env.KNOWLEDGE_CACHE.delete(articleJobInputKey(jobId));
  message.ack();
}
