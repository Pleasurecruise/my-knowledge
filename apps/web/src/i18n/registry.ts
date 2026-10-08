import { en } from "./messages/en";
import { ja } from "./messages/ja";
import { zh } from "./messages/zh";

export type InterfaceMessages = {
  shell: {
    subtitle: string;
    explore: string;
    articles: string;
    navigation: string;
    moreActions: string;
    changeLanguage: string;
    theme: string;
    generateApiKey: string;
    regenerateApiKey: string;
    apiKeyStatusFailed: string;
    apiKeyGenerationFailed: string;
    regenerateApiKeyTitle: string;
    regenerateApiKeyDescription: string;
    cancel: string;
    regenerate: string;
    apiKeyGeneratedTitle: string;
    apiKeyGeneratedDescription: string;
    copyApiKey: string;
    apiKeyCopied: string;
    apiKeyCopyFailed: string;
    done: string;
    accountMenu: string;
    signOut: string;
    signInUnavailable: string;
    signInFailed: string;
    signOutFailed: string;
  };
  articles: {
    title: string;
    description: string;
    empty: string;
    newArticle: string;
  };
  search: {
    title: string;
    articleLabel: string;
    submit: string;
    articlePlaceholder: string;
    results: string;
    noResults: string;
  };
  article: {
    previousPage: string;
    copyLink: string;
    linkCopied: string;
    linkCopyFailed: string;
    allArticles: string;
    visibility: string;
    private: string;
    public: string;
    delete: string;
    deleteTitle: string;
    deleteDescription: string;
    cancel: string;
    deleting: string;
    diagram: string;
    chart: string;
    canvas: string;
    canvasViewport: string;
    canvasRelationships: string;
    spatialView: string;
    renderingDiagram: string;
    copyCode: string;
    codeCopied: string;
    codeCopyFailed: string;
    edit: string;
    titleLabel: string;
    bodyLabel: string;
    tagsLabel: string;
    tagsHint: string;
    summaryLabel: string;
    summaryHint: string;
    writePlaceholder: string;
    save: string;
    saving: string;
    discardTitle: string;
    discardDescription: string;
    discard: string;
    saveFailed: string;
    deleteNotFound: string;
    deleteFailed: string;
    stale: string;
    editorMode: string;
    preview: string;
    markdownSource: string;
    previewFailed: string;
  };
  notFound: {
    code: string;
    title: string;
    description: string;
    home: string;
    navigation: string;
  };
};

type InterfaceLocale = {
  code: string;
  label: string;
  messages: InterfaceMessages;
};

export const defaultInterfaceLocale = "zh-CN";

export const interfaceLocales: readonly InterfaceLocale[] = [
  { code: "zh-CN", label: "简体中文", messages: zh },
  { code: "en", label: "English", messages: en },
  { code: "ja", label: "日本語", messages: ja },
];

export function resolveInterfaceI18n(stored: string | undefined, acceptLanguage: string | null) {
  const locale = interfaceLocales.find(({ code }) => code === stored);
  if (locale) return locale;

  let selected = interfaceLocales.find(({ code }) => code === defaultInterfaceLocale);
  if (!selected) throw new Error("The default interface locale is not registered");
  let priority = 0;
  for (const entry of acceptLanguage?.split(",") ?? []) {
    const [range, weight] = entry.trim().split(/\s*;\s*q\s*=\s*/iu);
    const language = range?.split("-")[0]?.toLowerCase();
    const quality = weight === undefined ? 1 : Number(weight);
    const candidate = interfaceLocales.find(({ code }) => code.split("-")[0] === language);
    if (candidate && quality > priority && quality <= 1) {
      selected = candidate;
      priority = quality;
    }
  }
  return selected;
}
