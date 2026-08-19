import { createArticleFromContent } from "@/articles";

import {
  claimArticleJob,
  finishArticleJob,
  getArticleJobRow,
  type ArticleJobTerminalResult,
  parseArticleJobResult,
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
    message.retry({ delaySeconds: 60 });
    return;
  }

  const content = await env.KNOWLEDGE_CACHE.get(articleJobInputKey(jobId));
  if (!content) throw new Error("Article job input is not available");
  const result = await createArticleFromContent(env, content);
  const terminal: ArticleJobTerminalResult =
    result.status === "created"
      ? { status: "created", articleId: result.article.id }
      : {
          status: "duplicate",
          articleId: result.similarArticle.id,
          score: result.score,
        };
  if (!(await finishArticleJob(env, jobId, terminal, new Date().toISOString()))) {
    throw new Error("Article job claim expired before completion");
  }
  await env.KNOWLEDGE_CACHE.delete(articleJobInputKey(jobId));
  message.ack();
}
