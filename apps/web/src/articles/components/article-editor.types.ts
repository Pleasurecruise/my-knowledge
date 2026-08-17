import type { Editor } from "@tiptap/core";
import type { LucideIcon } from "@my-knowledge/ui/icons";

import type { Visibility } from "@my-knowledge/content";

import type { InterfaceMessages } from "@/i18n/registry";

export type ExistingArticleEditor = {
  body: string;
  contentHash: string;
  id: string;
  slug: string;
  summary: string;
  tags: string[];
  title: string;
  visibility: Visibility;
};

export type ArticleEditorProps = {
  locale: string;
  messages: InterfaceMessages["article"];
} & ({ mode: "create" } | { mode: "edit"; article: ExistingArticleEditor });

export type EditorCommand = {
  icon: LucideIcon;
  run: (editor: Editor) => void;
  separatorBefore: boolean;
  title: string;
} & ({ kind: "toggle"; active: (editor: Editor) => boolean } | { kind: "action" }) &
  ({ slash: false } | { slash: true; hint: string; keywords: string });

export type SlashMenuPosition = {
  left: number;
  maxHeight: number;
  top: number;
  width: number;
};
