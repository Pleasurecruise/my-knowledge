import { answerFromKnowledge } from "@my-knowledge/ai-core";

import { embedText, findVectorArticles } from "@/articles";
import { modelConfig } from "@/model/config";
import type { KnowledgeAnswer } from "@/search/types";

export async function answerKnowledgeQuestion(
  env: CloudflareEnv,
  query: string,
): Promise<KnowledgeAnswer> {
  const embedding = await embedText(env, query);
  const ranked = await findVectorArticles(env, "owner", embedding, 8);
  if (ranked.length === 0) {
    return { status: "insufficientEvidence" };
  }
  const answer = await answerFromKnowledge(
    modelConfig(env),
    query,
    ranked.map(({ article, markdown }) => ({
      id: article.id,
      title: article.editions.zh.title,
      markdown,
    })),
  );
  const summaries = new Map(ranked.map(({ article }) => [article.id, article]));
  return {
    status: "answered",
    result: {
      answer: answer.answer,
      citations: answer.citations.map((id) => {
        const article = summaries.get(id);
        if (!article) throw new Error(`Authorized citation is missing: ${id}`);
        return { id, slug: article.slug, title: article.editions.zh.title };
      }),
    },
  };
}
