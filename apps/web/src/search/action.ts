"use server";

import type { ArticleSummary } from "@my-knowledge/content";
import { getCloudflareContext } from "@opennextjs/cloudflare";
import { z } from "zod";

import { localizeArticles, searchAiSummaries } from "@/articles";
import { getPrincipal } from "@/auth/owner";
import { getInterfaceI18n } from "@/i18n/server";

export type SearchState = { articles: ArticleSummary[]; status: "idle" | "ready" | "error" };

export async function searchKnowledge(
  _previous: SearchState,
  form: FormData,
): Promise<SearchState> {
  if ((await getPrincipal()) !== "owner") return { articles: [], status: "error" };
  const query = z.string().trim().min(1).max(2_000).safeParse(form.get("query"));
  if (!query.success) return { articles: [], status: "error" };
  try {
    const [{ env }, i18n] = await Promise.all([
      getCloudflareContext({ async: true }),
      getInterfaceI18n(),
    ]);
    const ranked = await searchAiSummaries(env, query.data, 50);
    return {
      articles: await localizeArticles(env, ranked, i18n.code),
      status: "ready",
    };
  } catch {
    // Provider errors may contain search material. Return a content-free failure.
    return { articles: [], status: "error" };
  }
}
