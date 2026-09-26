"use client";

import { Editor, defaultValueCtx, editorViewOptionsCtx, rootCtx } from "@milkdown/kit/core";
import { commonmark, codeBlockAttr, imageAttr, imageSchema } from "@milkdown/kit/preset/commonmark";
import { gfm } from "@milkdown/kit/preset/gfm";
import { useEffect, useRef, useState } from "react";

export function MarkdownPreview({
  markdown,
  label,
  failure,
}: {
  markdown: string;
  label: string;
  failure: string;
}) {
  const root = useRef<HTMLDivElement>(null);
  const [failed, setFailed] = useState(false);
  useEffect(() => {
    const element = root.current;
    if (!element) return;
    let disposed = false;
    const editor = Editor.make()
      .config((ctx) => {
        ctx.set(rootCtx, element);
        ctx.set(defaultValueCtx, markdown);
        ctx.update(editorViewOptionsCtx, (options) => ({
          ...options,
          editable: () => false,
          attributes: {
            "aria-label": label,
            "aria-readonly": "true",
            "aria-multiline": "true",
            tabindex: "0",
          },
        }));
        ctx.set(imageAttr.key, () => ({ loading: "lazy", referrerpolicy: "no-referrer" }));
        ctx.set(codeBlockAttr.key, () => ({ pre: { tabindex: "0" }, code: {} }));
        ctx.update(imageSchema.key, (schema) => (context) => ({
          ...schema(context),
          parseMarkdown: {
            match: (node) => node.type === "image",
            runner: (state, node, type) => {
              state.addNode(type, { src: node.url, alt: node.alt ?? "", title: node.title ?? "" });
            },
          },
        }));
      })
      .use(commonmark)
      .use(gfm);
    const ready = editor.create();
    void ready.catch(() => {
      if (!disposed) setFailed(true);
    });
    return () => {
      disposed = true;
      void ready
        .then(
          () => editor.destroy(),
          // Initialization failures are already presented above.
          () => undefined,
        )
        .catch(() => console.error("Markdown preview cleanup failed"));
    };
  }, [markdown, label]);
  return (
    <div className="markdown-preview">
      {failed ? (
        <p role="status" className="p-4 text-sm text-destructive">
          {failure}
        </p>
      ) : null}
      <div ref={root} />
    </div>
  );
}
