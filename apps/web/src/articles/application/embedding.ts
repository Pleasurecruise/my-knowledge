import { EMBEDDING_MODEL } from "@my-knowledge/ai-core";
import type { ParsedArticleDocument } from "@my-knowledge/content";

export const EMBED_CHUNK_CHAR_BUDGET = 12_000;

const PREFERRED_BOUNDARIES = ["\n", "。", "！", "？", "；", "! ", "? ", "; ", "，", ", ", " "];

export function embeddingInput(document: ParsedArticleDocument): string {
  return `${document.title}\n${document.summary}\n\n${document.body}`;
}

export function splitEmbeddingChunks(
  text: string,
  budget: number = EMBED_CHUNK_CHAR_BUDGET,
): string[] {
  const merged: string[] = [];
  let current = "";
  for (const paragraph of text.split(/\n+/u)) {
    if (!paragraph.trim()) continue;
    if (!current) {
      current = paragraph;
    } else if (current.length + 1 + paragraph.length <= budget) {
      current += `\n${paragraph}`;
    } else {
      merged.push(current);
      current = paragraph;
    }
  }
  if (current) merged.push(current);

  const chunks: string[] = [];
  for (const chunk of merged) {
    if (chunk.length <= budget) {
      chunks.push(chunk);
      continue;
    }
    let remainder = chunk;
    while (remainder.length > budget) {
      const window = remainder.slice(0, budget);
      let cut = -1;
      for (const boundary of PREFERRED_BOUNDARIES) {
        cut = Math.max(cut, window.lastIndexOf(boundary));
      }
      const end = cut >= Math.floor(budget / 2) ? cut + 1 : budget;
      chunks.push(remainder.slice(0, end).trim());
      remainder = remainder.slice(end);
    }
    if (remainder.trim()) chunks.push(remainder.trim());
  }
  return chunks;
}

export function meanPoolEmbeddings(vectors: number[][]): number[] {
  const first = vectors[0];
  if (!first) throw new Error("Cannot pool an empty embedding set");
  const dimension = first.length;
  const sums = Array.from({ length: dimension }, () => 0);
  for (const vector of vectors) {
    if (vector.length !== dimension)
      throw new Error(`Expected ${dimension} embedding dimensions, received ${vector.length}`);
    vector.forEach((value, index) => {
      sums[index] = (sums[index] ?? 0) + value;
    });
  }
  let squaredNorm = 0;
  const pooled = sums.map((sum) => {
    const value = sum / vectors.length;
    squaredNorm += value ** 2;
    return value;
  });
  const norm = Math.sqrt(squaredNorm);
  if (norm === 0) throw new Error("Pooled embedding has zero norm");
  return pooled.map((value) => value / norm);
}

export async function embedText(env: CloudflareEnv, text: string): Promise<number[]> {
  const chunks = splitEmbeddingChunks(text);
  if (chunks.length === 1) {
    const single = chunks[0];
    if (!single) throw new Error("Embedding chunk set is empty");
    const output = await env.AI.run(EMBEDDING_MODEL, { text: single, truncate_inputs: false });
    if (!("data" in output) || !output.data?.[0])
      throw new Error("Workers AI returned no embedding");
    const embedding = output.data[0];
    if (embedding.length !== 1_024)
      throw new Error(`Expected 1024 embedding dimensions, received ${embedding.length}`);
    return embedding;
  }
  const output = await env.AI.run(EMBEDDING_MODEL, { text: chunks, truncate_inputs: false });
  if (!("data" in output) || !Array.isArray(output.data))
    throw new Error("Workers AI returned no embeddings");
  if (output.data.length !== chunks.length)
    throw new Error(`Expected ${chunks.length} embeddings, received ${output.data.length}`);
  const vectors = output.data.map((embedding, index) => {
    if (embedding.length !== 1_024)
      throw new Error(
        `Expected 1024 embedding dimensions, received ${embedding.length} at chunk ${index}`,
      );
    return embedding;
  });
  return meanPoolEmbeddings(vectors);
}
