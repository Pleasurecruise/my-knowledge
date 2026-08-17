import { summarizeArticle, translateArticle } from "@my-knowledge/ai-core";
import {
  canonicalizeTags,
  normalizeLocale,
  parseArticleDocuments,
  serializeArticleDocument,
} from "@my-knowledge/content";
import { skillRegistry } from "@my-knowledge/skills";

import { modelConfig } from "@/model/config";

import { getArticleById } from "../persistence/document";
import { createArticle, updateArticle } from "../persistence/write";
import { embedText, embeddingInput } from "./embedding";
import type { ArticleDraft, UpdateArticleDraftResult } from "./authoring.types";

async function synchronizedDocuments(
  env: CloudflareEnv,
  draft: ArticleDraft,
  locales: readonly string[],
) {
  const locale = normalizeLocale(draft.locale);
  const tags = canonicalizeTags(draft.tags);
  const gateway = modelConfig(env);
  const summary = await summarizeArticle(gateway, draft.title, draft.body, locale);
  const source = serializeArticleDocument({
    title: draft.title,
    summary,
    tags,
    body: draft.body,
  });
  const translateSkill = skillRegistry.get("translate");
  if (!translateSkill) throw new Error("Runtime skill is missing: translate");
  const targets = [...new Set(locales.map(normalizeLocale))];
  const translated = await Promise.all(
    targets
      .filter((target) => target !== locale)
      .map(async (target): Promise<[string, string]> => [
        target,
        await translateArticle(gateway, source, target, translateSkill, locale),
      ]),
  );
  return parseArticleDocuments({ [locale]: source, ...Object.fromEntries(translated) });
}

export async function createArticleFromDraft(env: CloudflareEnv, draft: ArticleDraft) {
  const locale = normalizeLocale(draft.locale);
  const document = await synchronizedDocuments(env, draft, ["zh", "en", locale]);
  const embedding = await embedText(env, embeddingInput(document.editions.zh));
  return createArticle(env, document, embedding);
}

export async function updateArticleFromDraft(
  env: CloudflareEnv,
  id: string,
  expectedHash: string,
  draft: ArticleDraft,
): Promise<UpdateArticleDraftResult> {
  const current = await getArticleById(env, "owner", id);
  if (!current) return { status: "notFound" };
  if (current.contentHash !== expectedHash) return { status: "stale" };
  const locale = normalizeLocale(draft.locale);
  if (!current.editions[locale]) return { status: "notFound" };
  const document = await synchronizedDocuments(env, draft, Object.keys(current.editions));
  const embedding = await embedText(env, embeddingInput(document.editions.zh));
  const updated = await updateArticle(env, id, expectedHash, document, embedding);
  return updated ? { status: "updated", article: updated } : { status: "stale" };
}
