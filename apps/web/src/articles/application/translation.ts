import { translateArticle } from "@my-knowledge/ai-core";
import { parseArticleDocuments, type ArticleDocumentSet } from "@my-knowledge/content";

import { modelConfig } from "@/model/config";

export async function translateChineseDocument(
  env: CloudflareEnv,
  zhMarkdown: string,
): Promise<ArticleDocumentSet> {
  const gateway = modelConfig(env);
  const [en, ja] = await Promise.all([
    translateArticle(gateway, "en", zhMarkdown),
    translateArticle(gateway, "ja", zhMarkdown),
  ]);
  return parseArticleDocuments({ zh: zhMarkdown, en, ja });
}
