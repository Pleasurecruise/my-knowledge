import { z } from "zod";

import {
  gatewayEndpoint,
  gatewayHeaders,
  gatewayConfigSchema,
  type GatewayConfig,
} from "./gateway";

export const ARTICLE_MODEL = "dynamic/article";

const chunkChoice = z.object({ delta: z.object({ content: z.string().nullish() }) });
const chunk = z.object({ choices: z.array(chunkChoice) });

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
      stream: true,
    }),
    signal: AbortSignal.timeout(120_000),
  });
  if (!response.ok) throw new Error(`Article model request failed with status ${response.status}`);
  if (!response.body) throw new Error("Article model stream is empty");
  const reader = response.body.getReader();
  const decoder = new TextDecoder();
  let buffer = "";
  let text = "";
  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    buffer += decoder.decode(value, { stream: true });
    let separatorIndex = buffer.indexOf("\n\n");
    while (separatorIndex >= 0) {
      const event = buffer.slice(0, separatorIndex);
      buffer = buffer.slice(separatorIndex + 2);
      for (const line of event.split("\n")) {
        if (!line.startsWith("data: ")) continue;
        const data = line.slice(6).trim();
        if (data === "[DONE]" || data.length === 0) continue;
        const parsed = chunk.parse(JSON.parse(data));
        const delta = parsed.choices[0]?.delta.content;
        if (delta) text += delta;
      }
      separatorIndex = buffer.indexOf("\n\n");
    }
  }
  return text.trim();
}
