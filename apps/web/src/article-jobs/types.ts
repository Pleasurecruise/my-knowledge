import type { Article, ArticleSummary } from "@my-knowledge/content";
import { z } from "zod";

export const articleJobMessageSchema = z.object({ jobId: z.uuid() }).strict();

export type ArticleJobMessage = z.infer<typeof articleJobMessageSchema>;

export function articleJobInputKey(jobId: string): string {
  return `article-jobs/${jobId}/input`;
}

export type AcceptedArticleJob = {
  status: "accepted";
  jobId: string;
};

export type ArticleJobResult =
  | { status: "pending" | "processing"; jobId: string }
  | { status: "created"; jobId: string; article: Article }
  | {
      status: "duplicate";
      jobId: string;
      similarArticle: ArticleSummary;
      score: number;
    }
  | { status: "failed"; jobId: string; error: string };
