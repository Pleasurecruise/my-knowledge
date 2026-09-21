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
    richText: string;
    markdownSource: string;
    sourceRequired: string;
    formatting: string;
    slashCommands: string;
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
