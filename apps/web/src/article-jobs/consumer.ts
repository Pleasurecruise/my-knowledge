import {
  createArticleFromContent,
  enqueueArticleTranslations,
  getArticleById,
  hasCurrentTranslation,
  saveArticleTranslation,
  translateChineseEdition,
} from "@/articles";

import { articleJobTtlSeconds } from "./application";
import { articleJobMessageSchema, type ArticleJobMessage } from "./types";

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
  if (parsed.data.type === "create") {
    const { articleId } = parsed.data;
    try {
      const existing = await getArticleById(env, "owner", articleId);
      if (existing) {
        await enqueueArticleTranslations(env, articleId, existing.contentHash);
      } else {
        const content = await env.KNOWLEDGE_CACHE.get(`article-jobs/${articleId}/input`);
        if (!content) throw new Error("Article job input is not available");
        const article = await createArticleFromContent(env, articleId, content);
        await enqueueArticleTranslations(env, articleId, article.contentHash);
      }
      await Promise.all([
        env.KNOWLEDGE_CACHE.delete(`article-jobs/${articleId}/input`),
        env.KNOWLEDGE_CACHE.delete(`article-jobs/${articleId}/failure`),
      ]);
      message.ack();
    } catch {
      if (message.attempts <= 3) {
        message.retry();
        return;
      }
      await env.KNOWLEDGE_CACHE.put(
        `article-jobs/${articleId}/failure`,
        JSON.stringify({ error: "Article creation failed" }),
        { expirationTtl: articleJobTtlSeconds },
      );
      await env.KNOWLEDGE_CACHE.delete(`article-jobs/${articleId}/input`);
      message.ack();
    }
    return;
  }
  try {
    const article = await getArticleById(env, "owner", parsed.data.articleId);
    if (!article || article.contentHash !== parsed.data.sourceHash) {
      message.ack();
      return;
    }
    if (
      await hasCurrentTranslation(
        env,
        parsed.data.articleId,
        parsed.data.locale,
        parsed.data.sourceHash,
      )
    ) {
      message.ack();
      return;
    }
    const translation = await translateChineseEdition(
      env,
      parsed.data.locale,
      article.editions.zh.markdown,
    );
    await saveArticleTranslation(
      env,
      parsed.data.articleId,
      parsed.data.locale,
      parsed.data.sourceHash,
      translation,
    );
    message.ack();
  } catch {
    if (message.attempts <= 3) message.retry();
    else message.ack();
  }
}
