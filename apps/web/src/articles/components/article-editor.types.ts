import type { TranslationLocale, Visibility } from "@my-knowledge/content";

import type { InterfaceMessages } from "@/i18n/registry";

export type ExistingArticleEditor = {
  locale: "zh" | TranslationLocale;
  body: string;
  contentHash: string;
  updatedAt: string;
  id: string;
  summary: string;
  tags: string[];
  title: string;
  visibility: Visibility;
};

export type ArticleEditorProps = {
  messages: InterfaceMessages["article"];
} & ({ mode: "create" } | { mode: "edit"; article: ExistingArticleEditor });
