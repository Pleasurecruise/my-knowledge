import { and, eq, lt, or } from "drizzle-orm";
import { drizzle } from "drizzle-orm/d1";
import { z } from "zod";

import { articleJobs } from "@/db/schema";

const terminalResultSchema = z.discriminatedUnion("status", [
  z.object({ status: z.literal("created"), articleId: z.uuid() }).strict(),
  z.object({ status: z.literal("failed"), error: z.string().min(1) }).strict(),
]);

export type ArticleJobRow = typeof articleJobs.$inferSelect;
export type ArticleJobTerminalResult = z.infer<typeof terminalResultSchema>;

export async function insertArticleJob(env: CloudflareEnv, id: string, now: string): Promise<void> {
  await drizzle(env.DB).insert(articleJobs).values({
    id,
    status: "pending",
    resultJson: null,
    createdAt: now,
    updatedAt: now,
  });
}

export async function deleteArticleJob(env: CloudflareEnv, id: string): Promise<void> {
  await drizzle(env.DB).delete(articleJobs).where(eq(articleJobs.id, id));
}

export async function getArticleJobRow(
  env: CloudflareEnv,
  id: string,
): Promise<ArticleJobRow | undefined> {
  return drizzle(env.DB).select().from(articleJobs).where(eq(articleJobs.id, id)).get();
}

export async function claimArticleJob(
  env: CloudflareEnv,
  id: string,
  now: string,
  staleBefore: string,
): Promise<boolean> {
  const claimed = await drizzle(env.DB)
    .update(articleJobs)
    .set({ status: "processing", updatedAt: now })
    .where(
      and(
        eq(articleJobs.id, id),
        or(
          eq(articleJobs.status, "pending"),
          and(eq(articleJobs.status, "processing"), lt(articleJobs.updatedAt, staleBefore)),
        ),
      ),
    )
    .returning({ id: articleJobs.id })
    .get();
  return Boolean(claimed);
}

export async function releaseArticleJob(
  env: CloudflareEnv,
  id: string,
  now: string,
): Promise<void> {
  await drizzle(env.DB)
    .update(articleJobs)
    .set({ status: "pending", updatedAt: now })
    .where(and(eq(articleJobs.id, id), eq(articleJobs.status, "processing")));
}

export async function finishArticleJob(
  env: CloudflareEnv,
  id: string,
  result: ArticleJobTerminalResult,
  now: string,
): Promise<boolean> {
  const updated = await drizzle(env.DB)
    .update(articleJobs)
    .set({ status: result.status, resultJson: JSON.stringify(result), updatedAt: now })
    .where(and(eq(articleJobs.id, id), eq(articleJobs.status, "processing")))
    .returning({ id: articleJobs.id })
    .get();
  return Boolean(updated);
}

export function parseArticleJobResult(row: ArticleJobRow): ArticleJobTerminalResult | undefined {
  if (row.status === "pending" || row.status === "processing") return undefined;
  if (!row.resultJson) throw new Error("Terminal article job has no result");
  const parsed: unknown = JSON.parse(row.resultJson);
  const result = terminalResultSchema.parse(parsed);
  if (result.status !== row.status) throw new Error("Article job status does not match its result");
  return result;
}
