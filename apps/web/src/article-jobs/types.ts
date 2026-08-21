import type { Article } from "@my-knowledge/content";
import { z } from "zod";

export const articleJobMessageSchema = z.discriminatedUnion("type", [
  z.object({ type: z.literal("create"), articleId: z.uuid() }).strict(),
  z
    .object({
      type: z.literal("translate"),
      articleId: z.uuid(),
      locale: z.enum(["en", "ja"]),
      sourceHash: z.string().regex(/^[a-f0-9]{64}$/u),
    })
    .strict(),
]);

export const articleJobFailureSchema = z.object({ error: z.string().min(1) }).strict();

export type ArticleJobMessage = z.infer<typeof articleJobMessageSchema>;

export type AcceptedArticleJob = { status: "accepted"; jobId: string };

export type ArticleJobResult =
  | { status: "pending"; jobId: string }
  | { status: "created"; jobId: string; article: Article }
  | { status: "failed"; jobId: string; error: string };
