import { EMBEDDING_MODEL } from "@my-knowledge/ai-core";
import type { ParsedArticleDocument } from "@my-knowledge/content";

export function embeddingInput(document: ParsedArticleDocument): string {
  return `${document.title}\n${document.summary}\n\n${document.body}`;
}

export async function embedText(env: CloudflareEnv, text: string): Promise<number[]> {
  const output = await env.AI.run(EMBEDDING_MODEL, { text, truncate_inputs: false });
  if (!("data" in output) || !output.data?.[0]) throw new Error("Workers AI returned no embedding");
  const embedding = output.data[0];
  if (embedding.length !== 1_024)
    throw new Error(`Expected 1024 embedding dimensions, received ${embedding.length}`);
  return embedding;
}
