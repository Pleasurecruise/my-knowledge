import { describe, expect, it, vi } from "vite-plus/test";

import { EMBEDDING_MODEL } from "@my-knowledge/ai-core";

import {
  EMBED_CHUNK_CHAR_BUDGET,
  embedText,
  meanPoolEmbeddings,
  splitEmbeddingChunks,
} from "@/articles/application/embedding";

function oneHotVector(index: number): number[] {
  const vector = Array.from({ length: 1_024 }, () => 0);
  vector[index] = 1;
  return vector;
}

function embeddingEnv(data: number[][] | Error) {
  const run = vi.fn();
  if (data instanceof Error) {
    run.mockRejectedValue(data);
  } else {
    run.mockResolvedValue({ data });
  }
  return { env: { AI: { run } } as unknown as CloudflareEnv, run };
}

describe("embedding chunk splitting", () => {
  it("keeps input within the budget as a single chunk", () => {
    const text = "短内容".repeat(10);
    expect(splitEmbeddingChunks(text)).toEqual([text]);
  });

  it("merges paragraphs greedily under the budget", () => {
    const paragraph = "a".repeat(4_000);
    const chunks = splitEmbeddingChunks(`${paragraph}\n\n${paragraph}\n\n${paragraph}`);
    expect(chunks).toHaveLength(2);
    expect(chunks[0]).toBe(`${paragraph}\n${paragraph}`);
    expect(chunks[1]).toBe(paragraph);
  });

  it("hard-splits an oversized paragraph at the last preferred sentence boundary", () => {
    const sentences = Array.from({ length: 30 }, (_, i) => `第${i}句。`);
    const text = sentences.join("");
    const chunks = splitEmbeddingChunks(text, 40);
    expect(chunks.length).toBeGreaterThan(2);
    for (const chunk of chunks) expect(chunk.length).toBeLessThanOrEqual(40);
    for (const chunk of chunks) expect(chunk.endsWith("。")).toBe(true);
  });

  it("hard-cuts when no preferred boundary exists in the window", () => {
    const text = "x".repeat(3_000);
    const chunks = splitEmbeddingChunks(text, 1_000);
    expect(chunks.map((chunk) => chunk.length)).toEqual([1_000, 1_000, 1_000]);
  });

  it("drops blank paragraphs and keeps paragraph whitespace", () => {
    expect(splitEmbeddingChunks("\n\n  内容一\n\n\n  内容二  \n")).toEqual([
      "  内容一\n  内容二  ",
    ]);
    expect(splitEmbeddingChunks("\n\n\n")).toEqual([]);
  });
});

describe("embedding mean pooling", () => {
  it("returns the single vector unchanged when only one exists", () => {
    const embedding = oneHotVector(3);
    expect(meanPoolEmbeddings([embedding])).toEqual(embedding);
  });

  it("averages vectors and renormalizes to unit norm", () => {
    const pooled = meanPoolEmbeddings([oneHotVector(1), oneHotVector(2), oneHotVector(3)]);
    const norm = Math.sqrt(pooled.reduce((sum, value) => sum + value ** 2, 0));
    expect(norm).toBeCloseTo(1);
    expect(pooled[1]).toBeCloseTo(1 / Math.sqrt(3));
    expect(pooled[2]).toBeCloseTo(1 / Math.sqrt(3));
    expect(pooled[3]).toBeCloseTo(1 / Math.sqrt(3));
  });

  it("rejects vectors with mismatched dimensions", () => {
    expect(() => meanPoolEmbeddings([oneHotVector(0), [1, 2]])).toThrow("embedding dimensions");
  });

  it("rejects an empty set and a zero-norm pool", () => {
    expect(() => meanPoolEmbeddings([])).toThrow("empty embedding set");
    const embedding = oneHotVector(0);
    expect(() => meanPoolEmbeddings([embedding, embedding.map((v) => -v)])).toThrow("zero norm");
  });
});

describe("embedText", () => {
  it("uses the single-call string path for input within the budget", async () => {
    const text = "正常提交".repeat(10);
    const { env, run } = embeddingEnv([oneHotVector(0)]);
    const result = await embedText(env, text);
    expect(run).toHaveBeenCalledWith(EMBEDDING_MODEL, { text, truncate_inputs: false });
    expect(result).toEqual(oneHotVector(0));
  });

  it("batches chunks and mean-pools the result for long input", async () => {
    const paragraph = "好".repeat(7_000);
    const text = `${paragraph}\n\n${paragraph}`;
    const { env, run } = embeddingEnv([oneHotVector(1), oneHotVector(3)]);
    const result = await embedText(env, text);
    expect(run).toHaveBeenCalledOnce();
    expect(run.mock.calls[0]?.[1]).toEqual({
      text: [paragraph, paragraph],
      truncate_inputs: false,
    });
    expect(result).toEqual(meanPoolEmbeddings([oneHotVector(1), oneHotVector(3)]));
  });

  it("propagates a model token-limit error without retrying", async () => {
    const text = "长".repeat(EMBED_CHUNK_CHAR_BUDGET * 2);
    const { env, run } = embeddingEnv(new Error("AiError: Sequence too long: 30000 > 8192"));
    await expect(embedText(env, text)).rejects.toThrow("Sequence too long");
    expect(run).toHaveBeenCalledOnce();
  });

  it("propagates non-token errors without retrying", async () => {
    const { env, run } = embeddingEnv(new Error("Workers AI is down"));
    await expect(embedText(env, "内容".repeat(100))).rejects.toThrow("Workers AI is down");
    expect(run).toHaveBeenCalledOnce();
  });
});
