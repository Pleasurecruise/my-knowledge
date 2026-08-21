import { translateArticle, type TranslationLocale } from "@my-knowledge/ai-core";
import { parseArticleDocuments } from "@my-knowledge/content";

import { modelConfig } from "@/model/config";

export async function enqueueArticleTranslations(
  env: CloudflareEnv,
  articleId: string,
  sourceHash: string,
): Promise<void> {
  await Promise.all([
    env.ARTICLE_JOBS.send({ type: "translate", articleId, locale: "en", sourceHash }),
    env.ARTICLE_JOBS.send({ type: "translate", articleId, locale: "ja", sourceHash }),
  ]);
}

export async function translateChineseEdition(
  env: CloudflareEnv,
  locale: TranslationLocale,
  zhMarkdown: string,
) {
  const markdown = await translateArticle(modelConfig(env), locale, zhMarkdown);
  const document = await parseArticleDocuments({ zh: zhMarkdown, [locale]: markdown });
  const translation = document.editions[locale];
  if (!translation) throw new Error(`Parsed translation is missing: ${locale}`);
  return translation;
}
