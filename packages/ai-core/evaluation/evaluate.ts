import { z } from "zod";

import { isDuplicateScore } from "../src/index";

const idSchema = z.string().min(1);
const stringListSchema = z.array(z.string());
const writingCaseSchema = z.object({
  id: idSchema,
  domain: z.enum(["technology", "politics", "economics", "mixed"]),
  existingTags: stringListSchema,
  requiredReusedTag: z.string(),
  maxNewTags: z.number().int().min(0),
});
const translationCaseSchema = z.object({
  id: idSchema,
  targetLocale: z.string(),
  requiredTags: stringListSchema,
  requiredLinks: stringListSchema,
  requiredBlocks: stringListSchema,
});
const duplicateCaseSchema = z.object({ id: idSchema, label: z.boolean() });
const answerCaseSchema = z.object({
  id: idSchema,
  allowedIds: stringListSchema,
  expectedRefusal: z.boolean(),
});
const corpusSchema = z.object({
  version: z.number().int().positive(),
  synthetic: z.literal(true),
  writing: z.array(writingCaseSchema).min(4),
  translations: z.array(translationCaseSchema).min(2),
  duplicates: z.array(duplicateCaseSchema).min(4),
  answers: z.array(answerCaseSchema).min(2),
});

const evaluationSchema = z.object({
  name: z.string().min(1),
  corpusVersion: z.number().int().positive(),
  writing: z
    .array(z.object({ id: idSchema, schemaSuccess: z.boolean(), tags: stringListSchema }))
    .refine((entries) => new Set(entries.map((entry) => entry.id)).size === entries.length, {
      message: "Writing result IDs must be unique",
    }),
  translations: z
    .array(
      z.object({
        id: idSchema,
        schemaSuccess: z.boolean(),
        tags: stringListSchema,
        links: stringListSchema,
        blocks: stringListSchema,
      }),
    )
    .refine((entries) => new Set(entries.map((entry) => entry.id)).size === entries.length, {
      message: "Translation result IDs must be unique",
    }),
  duplicates: z
    .array(z.object({ id: idSchema, score: z.number().min(-1).max(1) }))
    .refine((entries) => new Set(entries.map((entry) => entry.id)).size === entries.length, {
      message: "Duplicate result IDs must be unique",
    }),
  answers: z
    .array(
      z.object({
        id: idSchema,
        schemaSuccess: z.boolean(),
        refused: z.boolean(),
        citations: stringListSchema,
        claims: z.array(z.object({ text: z.string().min(1), sourceIds: stringListSchema })),
      }),
    )
    .refine((entries) => new Set(entries.map((entry) => entry.id)).size === entries.length, {
      message: "Answer result IDs must be unique",
    }),
});

export type EvaluationSummary = {
  schemaSuccess: number;
  tagCompliance: number;
  tagReuse: number;
  translationStructure: number;
  duplicatePrecision: number;
  duplicateRecall: number;
  citationPrecision: number;
  unsupportedClaimRate: number;
  refusalCorrectness: number;
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
  if (evaluation.translations.length !== corpus.translations.length)
    throw new Error("Translation evaluation result count does not match the corpus");
  if (evaluation.duplicates.length !== corpus.duplicates.length)
    throw new Error("Duplicate evaluation result count does not match the corpus");
  if (evaluation.answers.length !== corpus.answers.length)
    throw new Error("Answer evaluation result count does not match the corpus");

  let schemaSuccesses = 0;
  let schemaTotal = 0;
  let tagCompliance = 0;
  let tagReuse = 0;
  let translationStructure = 0;
  let truePositives = 0;
  let falsePositives = 0;
  let falseNegatives = 0;
  let authorizedCitations = 0;
  let citationTotal = 0;
  let supportedClaims = 0;
  let claimTotal = 0;
  let correctRefusals = 0;
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

  for (const expected of corpus.translations) {
    const result = evaluation.translations.find((entry) => entry.id === expected.id);
    if (!result) throw new Error(`Translation evaluation result is missing: ${expected.id}`);
    schemaTotal += 1;
    if (result.schemaSuccess) schemaSuccesses += 1;
    const structurePreserved =
      result.tags.length === expected.requiredTags.length &&
      result.tags.every((tag, index) => tag === expected.requiredTags[index]) &&
      result.links.length === expected.requiredLinks.length &&
      result.links.every((link, index) => link === expected.requiredLinks[index]) &&
      result.blocks.length === expected.requiredBlocks.length &&
      result.blocks.every((block, index) => block === expected.requiredBlocks[index]);
    if (structurePreserved) translationStructure += 1;
    if (!result.schemaSuccess || !structurePreserved) hardInvariantFailures += 1;
  }

  for (const expected of corpus.duplicates) {
    const result = evaluation.duplicates.find((entry) => entry.id === expected.id);
    if (!result) throw new Error(`Duplicate evaluation result is missing: ${expected.id}`);
    const predicted = isDuplicateScore(result.score);
    if (predicted && expected.label) truePositives += 1;
    if (predicted && !expected.label) falsePositives += 1;
    if (!predicted && expected.label) falseNegatives += 1;
  }

  for (const expected of corpus.answers) {
    const result = evaluation.answers.find((entry) => entry.id === expected.id);
    if (!result) throw new Error(`Answer evaluation result is missing: ${expected.id}`);
    schemaTotal += 1;
    if (result.schemaSuccess) schemaSuccesses += 1;
    const allowed = new Set(expected.allowedIds);
    const citationsAuthorized = result.citations.every((id) => allowed.has(id));
    citationTotal += result.citations.length;
    authorizedCitations += result.citations.filter((id) => allowed.has(id)).length;
    for (const claim of result.claims) {
      claimTotal += 1;
      if (claim.sourceIds.length > 0 && claim.sourceIds.every((id) => allowed.has(id)))
        supportedClaims += 1;
    }
    if (result.refused === expected.expectedRefusal) correctRefusals += 1;
    if (!result.schemaSuccess || !citationsAuthorized) hardInvariantFailures += 1;
  }

  const predictedDuplicates = truePositives + falsePositives;
  const labeledDuplicates = truePositives + falseNegatives;
  if (predictedDuplicates === 0) throw new Error("Evaluation has no predicted duplicate");
  if (labeledDuplicates === 0) throw new Error("Evaluation has no labeled duplicate");
  if (citationTotal === 0) throw new Error("Evaluation has no citations to score");
  if (claimTotal === 0) throw new Error("Evaluation has no claims to score");

  return {
    schemaSuccess: schemaSuccesses / schemaTotal,
    tagCompliance: tagCompliance / corpus.writing.length,
    tagReuse: tagReuse / corpus.writing.length,
    translationStructure: translationStructure / corpus.translations.length,
    duplicatePrecision: truePositives / predictedDuplicates,
    duplicateRecall: truePositives / labeledDuplicates,
    citationPrecision: authorizedCitations / citationTotal,
    unsupportedClaimRate: 1 - supportedClaims / claimTotal,
    refusalCorrectness: correctRefusals / corpus.answers.length,
    hardInvariantFailures,
    latencyMs: null,
    costUsd: null,
  };
}
