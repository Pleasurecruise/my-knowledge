import { en } from "./messages/en";
import { ja } from "./messages/ja";
import { zh } from "./messages/zh";

export type InterfaceMessages = {
  shell: {
    subtitle: string;
    home: string;
    articles: string;
    graph: string;
    navigation: string;
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
    checkingSession: string;
    accountMenu: string;
    signInMenu: string;
    signOut: string;
    anonymous: string;
    signInDescription: string;
    signIn: string;
    signInFailed: string;
    signOutFailed: string;
  };
  home: {
    title: string;
    introduction: string;
  };
  articles: {
    title: string;
    description: string;
    empty: string;
    entryUnit: string;
    newArticle: string;
  };
  search: {
    articleLabel: string;
    submit: string;
    articlePlaceholder: string;
    results: string;
    noResults: string;
  };
  article: {
    previousPage: string;
    allArticles: string;
    backlinks: string;
    related: string;
    read: string;
    backToTop: string;
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
    tableOfContents: string;
    noBacklinks: string;
    noRelated: string;
    relationsUnavailable: string;
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
    saved: string;
    publish: string;
    withdraw: string;
    publishing: string;
    discardTitle: string;
    discardDescription: string;
    discard: string;
    saveFailed: string;
    deleteNotFound: string;
    deleteFailed: string;
    stale: string;
    formatting: string;
    slashCommands: string;
  };
  graph: {
    title: string;
    description: string;
    links: string;
    sharedTags: string;
    canvas: string;
    inspect: string;
    selected: string;
    readArticle: string;
    relationships: string;
    tags: string;
    empty: string;
    noRelationships: string;
  };
  notFound: {
    code: string;
    title: string;
    description: string;
    home: string;
    articles: string;
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
