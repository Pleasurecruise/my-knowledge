import { z } from "zod";

import {
  gatewayEndpoint,
  gatewayHeaders,
  gatewayConfigSchema,
  type GatewayConfig,
} from "./gateway";

export const ARTICLE_MODEL = "deepseek-v4-flash";
export const EMBEDDING_MODEL = "@cf/baai/bge-m3";
export const DUPLICATE_THRESHOLD = 0.92;

export function isDuplicateScore(score: number): boolean {
  return score >= DUPLICATE_THRESHOLD;
}

const completionChoiceSchema = z.object({
  message: z.object({ content: z.string().trim().min(1) }),
});
const completionResponseSchema = z.object({
  choices: z.tuple([completionChoiceSchema]).rest(completionChoiceSchema),
});

export async function runModel(
  configInput: GatewayConfig,
  systemPrompt: string,
  prompt: string,
): Promise<string> {
  const config = gatewayConfigSchema.parse(configInput);
  const response = await fetch(`${gatewayEndpoint(config)}/chat/completions`, {
    method: "POST",
    headers: gatewayHeaders(config),
    body: JSON.stringify({
      model: ARTICLE_MODEL,
      messages: [
        { role: "system", content: systemPrompt },
        { role: "user", content: prompt },
      ],
      max_tokens: 12_000,
      temperature: 0.2,
      stream: false,
    }),
    signal: AbortSignal.timeout(120_000),
  });
  if (!response.ok) throw new Error(`Article model request failed with status ${response.status}`);
  return completionResponseSchema.parse(await response.json()).choices[0].message.content;
}
