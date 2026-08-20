import { z } from "zod";

import {
  gatewayEndpoint,
  gatewayHeaders,
  gatewayConfigSchema,
  type GatewayConfig,
} from "./gateway";

export const ARTICLE_MODEL = "dynamic/article";

const completion = z.object({
  choices: z.tuple([
    z.object({
      message: z.object({ content: z.string() }),
    }),
  ]),
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
    }),
    signal: AbortSignal.timeout(120_000),
  });
  if (!response.ok) throw new Error(`Article model request failed with status ${response.status}`);
  const result = completion.parse(await response.json());
  return result.choices[0].message.content.trim();
}
