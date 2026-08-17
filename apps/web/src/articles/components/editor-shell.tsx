"use client";

import dynamic from "next/dynamic";

import type { ArticleEditorProps } from "./article-editor.types";

const ArticleEditor = dynamic(
  () => import("./article-editor").then((module) => module.ArticleEditor),
  { ssr: false },
);

export function ArticleEditorShell(props: ArticleEditorProps) {
  return <ArticleEditor {...props} />;
}
