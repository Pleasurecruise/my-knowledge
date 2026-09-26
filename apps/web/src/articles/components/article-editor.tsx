"use client";

import { visibilitySchema } from "@my-knowledge/content";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@my-knowledge/ui/components/alert-dialog";
import { Button } from "@my-knowledge/ui/components/button";
import { Input } from "@my-knowledge/ui/components/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@my-knowledge/ui/components/select";
import { Code2, Eye, Save, X } from "@my-knowledge/ui/icons";
import dynamic from "next/dynamic";
import { useRouter, useSearchParams } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { z } from "zod";

import { articleReturnHref } from "@/articles/navigation";
import type { ArticleEditorProps } from "./article-editor.types";
import { DeleteAction } from "./delete-action";

const MarkdownPreview = dynamic(
  () => import("./markdown-preview").then((module) => module.MarkdownPreview),
  { ssr: false },
);

const saveResponseSchema = z.object({ article: z.object({ id: z.string() }) });

export function ArticleEditor(props: ArticleEditorProps) {
  const { messages } = props;
  const article = props.mode === "edit" ? props.article : null;
  const translationLocale = article && article.locale !== "zh" ? article.locale : null;
  const initialBody = props.mode === "edit" ? props.article.body : "";
  const initialSummary = props.mode === "edit" ? props.article.summary : "";
  const initialTags = props.mode === "edit" ? props.article.tags : [];
  const initialTitle = props.mode === "edit" ? props.article.title : "";
  const router = useRouter();
  const leaving = useRef(false);
  const saveInFlight = useRef(false);
  const params = useSearchParams();
  const source = articleReturnHref(params.get("from") ?? undefined);
  const context = source === "/" ? "" : `?${new URLSearchParams({ from: source })}`;
  const [title, setTitle] = useState(initialTitle);
  const [summary, setSummary] = useState(initialSummary);
  const [markdown, setMarkdown] = useState(initialBody);
  const [editorMode, setEditorMode] = useState<"preview" | "source">("source");
  const [tags, setTags] = useState(initialTags.join(", "));
  const [saving, setSaving] = useState(false);
  const [visibility, setVisibility] = useState(article?.visibility ?? "public");
  const [error, setError] = useState<string | null>(null);
  const [discardOpen, setDiscardOpen] = useState(false);
  const [leaveHref, setLeaveHref] = useState<string | null>(null);
  const dirty =
    title !== initialTitle ||
    summary !== initialSummary ||
    markdown.trimEnd() !== initialBody.trimEnd() ||
    tags !== initialTags.join(", ") ||
    visibility !== (article?.visibility ?? "public");
  useEffect(() => {
    function beforeUnload(event: BeforeUnloadEvent) {
      if (dirty && !leaving.current) event.preventDefault();
    }
    function beforeLink(event: MouseEvent) {
      if (
        !dirty ||
        event.defaultPrevented ||
        event.button !== 0 ||
        event.metaKey ||
        event.ctrlKey ||
        event.shiftKey ||
        event.altKey
      )
        return;
      const anchor = event.target instanceof Element ? event.target.closest("a[href]") : null;
      if (
        !(anchor instanceof HTMLAnchorElement) ||
        anchor.target === "_blank" ||
        anchor.hasAttribute("download")
      )
        return;
      const destination = new URL(anchor.href);
      if (
        destination.origin === location.origin &&
        destination.pathname === location.pathname &&
        destination.search === location.search
      )
        return;
      event.preventDefault();
      event.stopPropagation();
      setLeaveHref(anchor.href);
      setDiscardOpen(true);
    }
    window.addEventListener("beforeunload", beforeUnload);
    document.addEventListener("click", beforeLink, true);
    return () => {
      window.removeEventListener("beforeunload", beforeUnload);
      document.removeEventListener("click", beforeLink, true);
    };
  }, [dirty]);

  const returnHref = article === null ? "/" : `/articles/${article.id}${context}`;

  async function save() {
    if (saveInFlight.current || !title.trim() || !summary.trim() || !markdown.trim()) return;
    saveInFlight.current = true;
    setSaving(true);
    setError(null);
    try {
      const response = await fetch(
        article === null ? "/api/articles" : `/api/articles/${article.id}`,
        {
          method: article === null ? "POST" : "PATCH",
          headers: { "content-type": "application/json" },
          body: JSON.stringify({
            ...(article === null
              ? {}
              : {
                  expectedHash: article.contentHash,
                  expectedUpdatedAt: article.updatedAt,
                  visibility,
                }),
            title: title.trim(),
            summary: summary.trim(),
            body: markdown.trimEnd(),
            ...(translationLocale
              ? { locale: translationLocale }
              : {
                  tags: [
                    ...new Set(
                      tags
                        .split(",")
                        .map((tag) => tag.trim())
                        .filter(Boolean),
                    ),
                  ],
                }),
          }),
        },
      );
      if (!response.ok) {
        setError(response.status === 409 ? messages.stale : messages.saveFailed);
        return;
      }
      const result = saveResponseSchema.parse(await response.json());
      leaving.current = true;
      // Reset the client route cache so reopening the editor cannot restore the pre-save draft.
      window.location.replace(`/articles/${result.article.id}${context}${window.location.hash}`);
    } catch {
      setError(messages.saveFailed);
    } finally {
      if (!leaving.current) {
        saveInFlight.current = false;
        setSaving(false);
      }
    }
  }

  function leave() {
    if (dirty) {
      setLeaveHref(null);
      setDiscardOpen(true);
      return;
    }
    router.push(returnHref);
  }

  return (
    <section
      aria-label={messages.bodyLabel}
      className="mx-auto w-full"
      id="article"
      lang={article?.locale ?? "zh"}
    >
      <div className="flex flex-row flex-wrap items-center gap-x-2 gap-y-1">
        <div className="min-w-0 flex-1">
          <h1 className="font-medium text-xl leading-snug tracking-normal text-foreground sm:text-2xl sm:leading-tight">
            {title.trim() || messages.titleLabel}
          </h1>
        </div>
        <div className="flex items-center gap-1">
          {article === null ? null : (
            <DeleteAction
              expectedUpdatedAt={article.updatedAt}
              expectedHash={article.contentHash}
              id={article.id}
              messages={messages}
            />
          )}
          <Button
            aria-label={messages.cancel}
            className="h-8 w-8 text-muted-foreground"
            disabled={saving}
            onClick={leave}
            size="icon-sm"
            variant="outline"
          >
            <X />
          </Button>
          <Button
            aria-label={messages.save}
            className="h-8 w-8"
            disabled={saving || !title.trim() || !summary.trim() || !markdown.trim()}
            onClick={save}
            size="icon-sm"
            variant="inverse"
          >
            <Save />
          </Button>
        </div>
      </div>

      <div className="mt-4 grid grid-cols-1 gap-3 sm:grid-cols-[3fr_2fr]">
        <label className="grid gap-1.5" htmlFor="article-title">
          <span className="font-mono text-[10px] tracking-widest text-muted-foreground uppercase">
            {messages.titleLabel}
          </span>
          <Input
            className="h-8 px-2.5"
            autoFocus
            disabled={saving}
            id="article-title"
            onChange={(event) => setTitle(event.target.value)}
            placeholder={messages.titleLabel}
            value={title}
          />
        </label>
        <label className="grid gap-1.5" htmlFor="article-tags">
          <span className="font-mono text-[10px] tracking-widest text-muted-foreground uppercase">
            {messages.tagsLabel}
          </span>
          <Input
            className="h-8 px-2.5"
            disabled={saving}
            id="article-tags"
            readOnly={translationLocale !== null}
            onChange={(event) => setTags(event.target.value)}
            placeholder={messages.tagsHint}
            value={tags}
          />
        </label>
      </div>

      <div className="mt-3">
        <div className="grid gap-1.5">
          <label
            className="text-muted-foreground text-[0.6875rem] font-medium tracking-widest uppercase"
            htmlFor="article-summary"
          >
            {messages.summaryLabel}
          </label>
          <Input
            className="h-8 px-2.5"
            disabled={saving}
            id="article-summary"
            onChange={(event) => setSummary(event.target.value)}
            placeholder={messages.summaryHint}
            value={summary}
          />
        </div>
      </div>

      {article === null ? null : (
        <label className="mt-3 grid max-w-40 gap-1.5" htmlFor="article-visibility">
          <span className="font-mono text-[10px] tracking-widest text-muted-foreground uppercase">
            {messages.visibility}
          </span>
          <Select
            disabled={saving}
            value={visibility}
            items={[
              { value: "public", label: messages.public },
              { value: "private", label: messages.private },
            ]}
            onValueChange={(value) => {
              if (value !== null) setVisibility(visibilitySchema.parse(value));
            }}
          >
            <SelectTrigger id="article-visibility" size="sm" className="w-full">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="public">{messages.public}</SelectItem>
              <SelectItem value="private">{messages.private}</SelectItem>
            </SelectContent>
          </Select>
        </label>
      )}

      {error === null ? null : (
        <p className="text-destructive mt-4 text-sm" role="alert">
          {error}
        </p>
      )}

      <div className="mt-4 overflow-hidden rounded-lg border bg-background">
        <div
          className="flex items-center gap-1 border-b bg-muted/40 p-1"
          role="group"
          aria-label={messages.editorMode}
        >
          <Button
            size="sm"
            variant={editorMode === "preview" ? "secondary" : "ghost"}
            aria-pressed={editorMode === "preview"}
            disabled={saving}
            onClick={() => setEditorMode("preview")}
          >
            <Eye className="size-4" />
            {messages.preview}
          </Button>
          <Button
            size="sm"
            variant={editorMode === "source" ? "secondary" : "ghost"}
            aria-pressed={editorMode === "source"}
            disabled={saving}
            onClick={() => setEditorMode("source")}
          >
            <Code2 className="size-4" />
            {messages.markdownSource}
          </Button>
        </div>
        {editorMode === "preview" ? (
          <MarkdownPreview
            markdown={markdown}
            label={messages.preview}
            failure={messages.previewFailed}
          />
        ) : null}
        {editorMode === "source" ? (
          <textarea
            aria-label={messages.markdownSource}
            className="article-writing-area block w-full resize-y bg-background p-4 font-mono text-foreground outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-ring sm:p-5"
            disabled={saving}
            spellCheck={false}
            placeholder={messages.writePlaceholder}
            value={markdown}
            onChange={(event) => {
              setMarkdown(event.target.value);
            }}
          />
        ) : null}
      </div>

      <AlertDialog onOpenChange={setDiscardOpen} open={discardOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{messages.discardTitle}</AlertDialogTitle>
            <AlertDialogDescription>{messages.discardDescription}</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>{messages.cancel}</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => {
                leaving.current = true;
                if (leaveHref && new URL(leaveHref).origin !== location.origin)
                  window.location.assign(leaveHref);
                else router.push(leaveHref ?? returnHref);
              }}
              variant="destructive"
            >
              {messages.discard}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </section>
  );
}
