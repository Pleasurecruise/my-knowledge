import { z } from "zod";

import type { GatewayConfig } from "./gateway";
import { runModel } from "./model";

export type GroundedAnswer = { answer: string; citations: string[] };

const groundedAnswerSchema = z.object({
  answer: z.string().min(1),
  citations: z
    .array(z.string())
    .max(8)
    .refine((citations) => new Set(citations).size === citations.length, {
      message: "Citations must be unique",
    }),
});

export function parseGroundedAnswer(raw: string, allowedIds: readonly string[]): GroundedAnswer {
  const parsed: unknown = JSON.parse(raw);
  const answer = groundedAnswerSchema.parse(parsed);
  const allowed = new Set(allowedIds);
  if (answer.citations.some((id) => !allowed.has(id)))
    throw new Error("Model returned an unauthorized citation");
  return answer;
}

export async function answerFromKnowledge(
  config: GatewayConfig,
  question: string,
  context: readonly { id: string; title: string; markdown: string }[],
): Promise<GroundedAnswer> {
  const raw = await runModel(
    config,
    `Answer only from the supplied authorized articles. If evidence is insufficient, say so plainly.
Return JSON only: {"answer":"...","citations":["article-id"]}. Cite only supplied article IDs.`,
    `Question: ${question}\n\n${context
      .map((article) => `ARTICLE ${article.id}: ${article.title}\n${article.markdown}`)
      .join("\n\n")}`,
  );
  return parseGroundedAnswer(
    raw,
    context.map((article) => article.id),
  );
}
