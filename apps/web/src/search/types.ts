import { z } from "zod";

export const aiResultSchema = z.object({
  answer: z.string(),
  citations: z.array(z.object({ id: z.string(), slug: z.string(), title: z.string() })),
});

export type AiResult = z.infer<typeof aiResultSchema>;

export type KnowledgeAnswer =
  | { status: "insufficientEvidence" }
  | { status: "answered"; result: AiResult };
