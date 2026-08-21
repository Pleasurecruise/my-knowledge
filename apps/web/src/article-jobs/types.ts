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

export type ArticleJobMessage = z.infer<typeof articleJobMessageSchema>;

export type AcceptedArticleCreation = { status: "accepted"; articleId: string };
