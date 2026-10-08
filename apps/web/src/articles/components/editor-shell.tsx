import { ClientOnly } from "@tanstack/react-router";
import { createClientOnlyFn } from "@tanstack/react-start";
import { lazy, Suspense } from "react";

import type { ArticleEditorProps } from "./article-editor.types";

const ArticleEditor = lazy(
  createClientOnlyFn(() =>
    import("./article-editor").then((module) => ({ default: module.ArticleEditor })),
  ),
);

export function ArticleEditorShell(props: ArticleEditorProps) {
  return (
    <ClientOnly>
      <Suspense fallback={null}>
        <ArticleEditor {...props} />
      </Suspense>
    </ClientOnly>
  );
}
