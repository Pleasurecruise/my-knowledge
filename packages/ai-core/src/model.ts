import type { Model } from "@earendil-works/pi-ai";
import { stream } from "@earendil-works/pi-ai/api/openai-completions";

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

const articleModel: Model<"openai-completions"> = {
  id: ARTICLE_MODEL,
  name: ARTICLE_MODEL,
  api: "openai-completions",
  provider: "custom-opencode",
  baseUrl: "",
  reasoning: false,
  input: ["text"],
  cost: { input: 0, output: 0, cacheRead: 0, cacheWrite: 0 },
  contextWindow: 128_000,
  maxTokens: 16_384,
  compat: {
    supportsDeveloperRole: false,
    supportsStore: false,
    supportsUsageInStreaming: false,
    maxTokensField: "max_tokens",
  },
};

export async function runModel(
  configInput: GatewayConfig,
  systemPrompt: string,
  prompt: string,
): Promise<string> {
  const config = gatewayConfigSchema.parse(configInput);
  const model = {
    ...articleModel,
    baseUrl: gatewayEndpoint(config),
  };
  const response = await stream(
    model,
    {
      systemPrompt,
      messages: [{ role: "user", content: prompt, timestamp: Date.now() }],
    },
    {
      apiKey: "gateway-managed-provider-key",
      headers: gatewayHeaders(config),
      maxRetries: 1,
      timeoutMs: 120_000,
      maxTokens: 12_000,
      temperature: 0.2,
    },
  ).result();
  if (response.stopReason === "error" || response.stopReason === "aborted") {
    if (response.errorMessage) throw new Error(response.errorMessage);
    throw new Error("The article model failed");
  }
  const text = response.content
    .filter((block) => block.type === "text")
    .map((block) => block.text)
    .join("\n")
    .trim();
  if (!text) throw new Error("The article model returned no text");
  return text;
}
