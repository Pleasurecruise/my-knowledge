import { readFile } from "node:fs/promises";
import { describe, expect, it } from "vite-plus/test";

import { evaluateFrozenCorpus } from "../evaluate";

const directory = new URL("../", import.meta.url);

async function readJson(name: "baseline" | "candidate" | "corpus") {
  return JSON.parse(await readFile(new URL(`${name}.json`, directory), "utf8"));
}

describe("frozen model and retrieval evaluation", () => {
  it("scores the former multilingual pipeline's Chinese output", async () => {
    const summary = evaluateFrozenCorpus(await readJson("corpus"), await readJson("baseline"));
    expect(summary).toEqual({
      schemaSuccess: 1,
      tagCompliance: 1,
      tagReuse: 1,
      duplicatePrecision: 1,
      duplicateRecall: 1,
      hardInvariantFailures: 0,
      latencyMs: null,
      costUsd: null,
    });
  });

  it("accepts the Chinese-only candidate with no deterministic regression", async () => {
    const summary = evaluateFrozenCorpus(await readJson("corpus"), await readJson("candidate"));
    expect(summary).toEqual({
      schemaSuccess: 1,
      tagCompliance: 1,
      tagReuse: 1,
      duplicatePrecision: 1,
      duplicateRecall: 1,
      hardInvariantFailures: 0,
      latencyMs: null,
      costUsd: null,
    });
  });

  it("rejects missing per-example results", async () => {
    const corpus = await readJson("corpus");
    const candidate = await readJson("candidate");
    candidate.writing = candidate.writing.slice(0, 3);
    expect(() => evaluateFrozenCorpus(corpus, candidate)).toThrow(
      "Writing evaluation result count does not match the corpus",
    );
  });
});
