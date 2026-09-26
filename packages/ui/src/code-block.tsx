"use client";

import { useRef, useState, type ComponentProps } from "react";
import { Copy } from "./icons";
import { Button } from "./components/button";
import { toast } from "./components/toast";

export type CodeCopyLabels = { copyCode: string; codeCopied: string; codeCopyFailed: string };

export function CodeBlock({
  labels,
  ...props
}: ComponentProps<"pre"> & { labels: CodeCopyLabels }) {
  const source = useRef<HTMLPreElement>(null);
  const [copying, setCopying] = useState(false);
  async function copy() {
    if (!source.current) return;
    setCopying(true);
    try {
      await navigator.clipboard.writeText(source.current.textContent ?? "");
      toast.add({ id: "code-copy", title: labels.codeCopied });
    } catch {
      toast.add({ id: "code-copy", title: labels.codeCopyFailed });
    } finally {
      setCopying(false);
    }
  }
  return (
    <div className="markdown-code-block">
      <pre {...props} ref={source} />
      <Button
        className="absolute right-1.5 top-1.5 text-muted-foreground"
        size="icon-xs"
        variant="ghost"
        aria-label={labels.copyCode}
        title={labels.copyCode}
        disabled={copying}
        onClick={() => void copy()}
      >
        <Copy aria-hidden="true" />
      </Button>
    </div>
  );
}
