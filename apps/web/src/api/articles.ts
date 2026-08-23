import { z } from "zod";

const expectedHashSchema = z.string().regex(/^[a-f0-9]{64}$/u);

export const articleDraftSchema = z.object({
  title: z.string().trim().min(1).max(240),
  summary: z.string().trim().min(1).max(500),
  body: z.string().trim().min(1).max(500_000),
  tags: z.array(z.string().min(1)).max(5),
});

export const articleDocumentsSchema = z
  .object({
    zh: z.string().min(1).max(500_000),
    en: z.string().min(1).max(500_000).optional(),
    ja: z.string().min(1).max(500_000).optional(),
  })
  .strict();

export const articleCreateSchema = z.union([
  articleDraftSchema.strict(),
  z.object({ documents: articleDocumentsSchema }).strict(),
]);

export const articleListQuerySchema = z.object({
  visibility: z.enum(["private", "public"]).optional(),
  tags: z.array(z.string().min(1)).max(5),
  cursor: z.string().optional(),
  limit: z.coerce.number().int().min(1).max(100).default(20),
});

export const articlePatchSchema = z.union([
  articleDraftSchema.extend({ expectedHash: expectedHashSchema }).strict(),
  z.object({ expectedHash: expectedHashSchema, documents: articleDocumentsSchema }).strict(),
  z
    .object({
      expectedHash: expectedHashSchema,
      visibility: z.enum(["private", "public"]),
    })
    .strict(),
]);

export const articleDeleteSchema = z.object({ expectedHash: expectedHashSchema }).strict();
