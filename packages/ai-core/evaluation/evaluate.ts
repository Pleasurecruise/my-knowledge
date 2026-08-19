import { z } from "zod";

const idSchema = z.string().min(1);
const stringListSchema = z.array(z.string());
const writingCaseSchema = z.object({
  id: idSchema,
  domain: z.enum(["technology", "politics", "economics", "mixed"]),
  existingTags: stringListSchema,
  requiredReusedTag: z.string(),
  maxNewTags: z.number().int().min(0),
});
const corpusSchema = z.object({
  version: z.number().int().positive(),
  synthetic: z.literal(true),
  writing: z.array(writingCaseSchema).min(4),
});

const evaluationSchema = z.object({
  name: z.string().min(1),
  corpusVersion: z.number().int().positive(),
  writing: z
    .array(z.object({ id: idSchema, schemaSuccess: z.boolean(), tags: stringListSchema }))
    .refine((entries) => new Set(entries.map((entry) => entry.id)).size === entries.length, {
      message: "Writing result IDs must be unique",
    }),
});

export type EvaluationSummary = {
  schemaSuccess: number;
  tagCompliance: number;
  tagReuse: number;
  hardInvariantFailures: number;
  latencyMs: null;
  costUsd: null;
};

export function evaluateFrozenCorpus(
  corpusInput: unknown,
  evaluationInput: unknown,
): EvaluationSummary {
  const corpus = corpusSchema.parse(corpusInput);
  const evaluation = evaluationSchema.parse(evaluationInput);
  if (evaluation.corpusVersion !== corpus.version)
    throw new Error("Evaluation corpus version does not match");
  if (evaluation.writing.length !== corpus.writing.length)
    throw new Error("Writing evaluation result count does not match the corpus");

  let schemaSuccesses = 0;
  let schemaTotal = 0;
  let tagCompliance = 0;
  let tagReuse = 0;
  let hardInvariantFailures = 0;

  for (const expected of corpus.writing) {
    const result = evaluation.writing.find((entry) => entry.id === expected.id);
    if (!result) throw new Error(`Writing evaluation result is missing: ${expected.id}`);
    schemaTotal += 1;
    if (result.schemaSuccess) schemaSuccesses += 1;
    const newTags = result.tags.filter((tag) => !expected.existingTags.includes(tag));
    const compliant = result.tags.length <= 5 && newTags.length <= expected.maxNewTags;
    if (compliant) tagCompliance += 1;
    if (result.tags.includes(expected.requiredReusedTag)) tagReuse += 1;
    if (!result.schemaSuccess || !compliant) hardInvariantFailures += 1;
  }

  return {
    schemaSuccess: schemaSuccesses / schemaTotal,
    tagCompliance: tagCompliance / corpus.writing.length,
    tagReuse: tagReuse / corpus.writing.length,
    hardInvariantFailures,
    latencyMs: null,
    costUsd: null,
  };
}
