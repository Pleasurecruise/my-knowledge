"use client";

import CodeBlock from "@tiptap/extension-code-block";
import Placeholder from "@tiptap/extension-placeholder";
import { TableKit } from "@tiptap/extension-table";
import { Markdown as MarkdownExtension } from "@tiptap/markdown";
import { EditorContent, useEditor, useEditorState } from "@tiptap/react";
import StarterKit from "@tiptap/starter-kit";
import type { Editor } from "@tiptap/core";
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
import {
  Bold,
  Code2,
  Heading1,
  Heading2,
  Italic,
  List,
  ListOrdered,
  Minus,
  Quote,
  Save,
  Strikethrough,
  Table2,
  Type,
  X,
} from "@my-knowledge/ui/icons";
import { useRouter, useSearchParams } from "next/navigation";
import { useEffect, useMemo, useRef, useState } from "react";
import { z } from "zod";
import {
  markdownCodeFence,
  markdownForEditor,
  markdownEquivalent,
  visibilitySchema,
} from "@my-knowledge/content";

import type { ArticleEditorProps, EditorCommand, SlashMenuPosition } from "./article-editor.types";
import { articleReturnHref } from "@/articles/navigation";
import { DeleteAction } from "./delete-action";

const commands: EditorCommand[] = [
  {
    kind: "toggle",
    separatorBefore: false,
    slash: false,
    title: "Bold",
    icon: Bold,
    active: (editor) => editor.isActive("bold"),
    run: (editor) => editor.chain().focus().toggleBold().run(),
  },
  {
    kind: "toggle",
    separatorBefore: false,
    slash: false,
    title: "Italic",
    icon: Italic,
    active: (editor) => editor.isActive("italic"),
    run: (editor) => editor.chain().focus().toggleItalic().run(),
  },
  {
    kind: "toggle",
    separatorBefore: false,
    slash: false,
    title: "Strikethrough",
    icon: Strikethrough,
    active: (editor) => editor.isActive("strike"),
    run: (editor) => editor.chain().focus().toggleStrike().run(),
  },
  {
    kind: "toggle",
    hint: "Large section heading",
    keywords: "h1 heading title",
    separatorBefore: true,
    slash: true,
    title: "Heading 1",
    icon: Heading1,
    active: (editor) => editor.isActive("heading", { level: 1 }),
    run: (editor) => editor.chain().focus().toggleHeading({ level: 1 }).run(),
  },
  {
    kind: "toggle",
    hint: "Subsection heading",
    keywords: "h2 heading subtitle",
    separatorBefore: false,
    slash: true,
    title: "Heading 2",
    icon: Heading2,
    active: (editor) => editor.isActive("heading", { level: 2 }),
    run: (editor) => editor.chain().focus().toggleHeading({ level: 2 }).run(),
  },
  {
    kind: "toggle",
    hint: "Simple unordered list",
    keywords: "bullet list ul",
    separatorBefore: false,
    slash: true,
    title: "Bulleted list",
    icon: List,
    active: (editor) => editor.isActive("bulletList"),
    run: (editor) => editor.chain().focus().toggleBulletList().run(),
  },
  {
    kind: "toggle",
    hint: "Ordered list",
    keywords: "number ordered list ol",
    separatorBefore: false,
    slash: true,
    title: "Numbered list",
    icon: ListOrdered,
    active: (editor) => editor.isActive("orderedList"),
    run: (editor) => editor.chain().focus().toggleOrderedList().run(),
  },
  {
    kind: "toggle",
    hint: "Indented quotation block",
    keywords: "quote blockquote",
    separatorBefore: false,
    slash: true,
    title: "Quote",
    icon: Quote,
    active: (editor) => editor.isActive("blockquote"),
    run: (editor) => editor.chain().focus().toggleBlockquote().run(),
  },
  {
    kind: "toggle",
    hint: "Preformatted code",
    keywords: "code pre fenced",
    separatorBefore: false,
    slash: true,
    title: "Code block",
    icon: Code2,
    active: (editor) => editor.isActive("codeBlock"),
    run: (editor) => editor.chain().focus().toggleCodeBlock().run(),
  },
  {
    kind: "action",
    hint: "Horizontal rule",
    keywords: "divider hr rule",
    separatorBefore: false,
    slash: true,
    title: "Divider",
    icon: Minus,
    run: (editor) => editor.chain().focus().setHorizontalRule().run(),
  },
  {
    kind: "action",
    hint: "3 by 3 table",
    keywords: "table grid",
    separatorBefore: false,
    slash: true,
    title: "Table",
    icon: Table2,
    run: (editor) =>
      editor.chain().focus().insertTable({ rows: 3, cols: 3, withHeaderRow: true }).run(),
  },
];

const saveResponseSchema = z.object({ article: z.object({ id: z.string() }) });

export function ArticleEditor(props: ArticleEditorProps) {
  const { messages } = props;
  const article = props.mode === "edit" ? props.article : null;
  const initialBody = props.mode === "edit" ? props.article.body : "";
  const editorBody = useMemo(() => markdownForEditor(initialBody), [initialBody]);
  const initialSummary = props.mode === "edit" ? props.article.summary : "";
  const initialTags = props.mode === "edit" ? props.article.tags : [];
  const initialTitle = props.mode === "edit" ? props.article.title : "";
  const router = useRouter();
  const leaving = useRef(false);
  const params = useSearchParams();
  const source = articleReturnHref(params.get("from") ?? undefined);
  const context = source === "/" ? "" : `?${new URLSearchParams({ from: source })}`;
  const [title, setTitle] = useState(initialTitle);
  const [summary, setSummary] = useState(initialSummary);
  const [markdown, setMarkdown] = useState(initialBody);
  const [editorMode, setEditorMode] = useState<"rich" | "source">("rich");
  const [modeError, setModeError] = useState(false);
  const [tags, setTags] = useState(initialTags.join(", "));
  const [saving, setSaving] = useState(false);
  const [visibility, setVisibility] = useState(article?.visibility ?? "public");
  const [error, setError] = useState<string | null>(null);
  const [discardOpen, setDiscardOpen] = useState(false);
  const [leaveHref, setLeaveHref] = useState<string | null>(null);
  const [slashRange, setSlashRange] = useState<{ from: number; to: number } | null>(null);
  const [slashQuery, setSlashQuery] = useState("");
  const [slashPosition, setSlashPosition] = useState<SlashMenuPosition | null>(null);

  const extensions = useMemo(
    () => [
      StarterKit.configure({ codeBlock: false }),
      CodeBlock.extend({
        renderMarkdown(node, helpers) {
          const value = node.content ? helpers.renderChildren(node.content) : "";
          const fence = markdownCodeFence(value);
          return `${fence}${node.attrs?.language || ""}\n${value}\n${fence}`;
        },
      }),
      Placeholder.configure({ placeholder: messages.writePlaceholder }),
      TableKit.configure({ table: { resizable: false } }),
      MarkdownExtension,
    ],
    [messages.writePlaceholder],
  );
  function closeSlashMenu() {
    setSlashRange(null);
    setSlashQuery("");
    setSlashPosition(null);
  }

  function updateSlashMenu(current: Editor) {
    const { from, empty } = current.state.selection;
    if (!empty) {
      closeSlashMenu();
      return;
    }
    const text = current.state.doc.textBetween(Math.max(0, from - 32), from, "\n", "\0");
    const match = text.match(/(?:^|\s)\/([\p{L}\p{N}-]*)$/u);
    if (!match) {
      closeSlashMenu();
      return;
    }
    const query = match[1];
    if (query === undefined) throw new Error("Slash query capture is missing");
    const matchingCount = commands.filter(
      (command) =>
        command.slash &&
        `${command.title} ${command.keywords}`.toLowerCase().includes(query.toLowerCase()),
    ).length;
    const coordinates = current.view.coordsAtPos(from);
    const width = Math.min(256, window.innerWidth - 16);
    const estimatedHeight = Math.min(320, matchingCount * 56);
    const left = Math.min(Math.max(8, coordinates.left), window.innerWidth - width - 8);
    const roomBelow = window.innerHeight - coordinates.bottom - 14;
    const below = roomBelow >= estimatedHeight;
    setSlashQuery(query);
    setSlashRange({ from: from - query.length - 1, to: from });
    setSlashPosition(
      matchingCount === 0
        ? null
        : {
            left,
            maxHeight: below ? estimatedHeight : Math.max(40, coordinates.top - 14),
            top: below
              ? coordinates.bottom + 6
              : Math.max(8, coordinates.top - estimatedHeight - 6),
            width,
          },
    );
  }
  const editor = useEditor({
    immediatelyRender: false,
    extensions,
    content: editorBody,
    contentType: "markdown",
    onCreate: ({ editor: current }) => {
      if (!markdownEquivalent(initialBody, current.getMarkdown())) setEditorMode("source");
    },
    editorProps: {
      handleKeyDown: (view, event) => {
        if (event.key !== "Escape" && (event.key !== "Enter" || event.shiftKey)) return false;
        const { from } = view.state.selection;
        const text = view.state.doc.textBetween(Math.max(0, from - 32), from, "\n", "\0");
        if (!/(?:^|\s)\/([\p{L}\p{N}-]*)$/u.test(text)) return false;
        closeSlashMenu();
        return true;
      },
    },
    onUpdate: ({ editor: current }) => {
      setMarkdown(current.getMarkdown().trimEnd());
      updateSlashMenu(current);
    },
    onSelectionUpdate: ({ editor: current }) => updateSlashMenu(current),
  });
  const activeCommands = useEditorState({
    editor,
    selector: ({ editor: current }) =>
      commands.map(
        (command) => current !== null && command.kind === "toggle" && command.active(current),
      ),
  });
  function changeEditorMode(mode: "rich" | "source") {
    if (mode === editorMode) return;
    closeSlashMenu();
    setModeError(false);
    if (mode === "rich") {
      if (!editor) return;
      editor.commands.setContent(markdownForEditor(markdown), {
        contentType: "markdown",
        emitUpdate: false,
      });
      if (!markdownEquivalent(markdown, editor.getMarkdown())) {
        setModeError(true);
        return;
      }
    }
    setEditorMode(mode);
  }
  const dirty =
    title !== initialTitle ||
    summary !== initialSummary ||
    markdown.trimEnd() !== initialBody.trimEnd() ||
    tags !== initialTags.join(", ") ||
    visibility !== (article?.visibility ?? "public");
  const filteredCommands = commands.filter(
    (command) =>
      command.slash &&
      `${command.title} ${command.keywords}`.toLowerCase().includes(slashQuery.toLowerCase()),
  );

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

  function runSlashCommand(command: EditorCommand) {
    if (!editor || !slashRange) return;
    editor.chain().focus().deleteRange(slashRange).run();
    command.run(editor);
    closeSlashMenu();
  }

  async function save() {
    if (saving || !title.trim() || !summary.trim() || !markdown.trim()) return;
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
            tags: [
              ...new Set(
                tags
                  .split(",")
                  .map((tag) => tag.trim())
                  .filter(Boolean),
              ),
            ],
          }),
        },
      );
      if (!response.ok) {
        setError(response.status === 409 ? messages.stale : messages.saveFailed);
        return;
      }
      const result = saveResponseSchema.parse(await response.json());
      router.replace(`/articles/${result.article.id}${context}`);
      router.refresh();
    } catch {
      setError(messages.saveFailed);
    } finally {
      setSaving(false);
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
    <section aria-label={messages.bodyLabel} className="mx-auto w-full" id="article">
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
            variant={editorMode === "rich" ? "secondary" : "ghost"}
            aria-pressed={editorMode === "rich"}
            disabled={!editor || saving}
            onClick={() => changeEditorMode("rich")}
          >
            <Type className="size-4" />
            {messages.richText}
          </Button>
          <Button
            size="sm"
            variant={editorMode === "source" ? "secondary" : "ghost"}
            aria-pressed={editorMode === "source"}
            disabled={saving}
            onClick={() => changeEditorMode("source")}
          >
            <Code2 className="size-4" />
            {messages.markdownSource}
          </Button>
        </div>
        {modeError ? (
          <p className="border-b px-4 py-2 text-sm text-destructive" role="status">
            {messages.sourceRequired}
          </p>
        ) : null}
        <div hidden={editorMode !== "rich"}>
          <div
            aria-label={messages.formatting}
            className="flex flex-nowrap items-center gap-1 overflow-x-auto border-b px-2 py-2 sm:flex-wrap"
            role="toolbar"
          >
            {commands.map((command, index) => {
              const Icon = command.icon;
              const active = activeCommands ? activeCommands[index] === true : false;
              return (
                <span className="contents" key={command.title}>
                  {command.separatorBefore ? <span className="mx-1 h-5 w-px bg-border" /> : null}
                  <Button
                    aria-label={command.title}
                    aria-pressed={active}
                    className="size-7.5 shrink-0 text-muted-foreground"
                    disabled={editor === null || saving}
                    onClick={() => editor && command.run(editor)}
                    size="icon-sm"
                    type="button"
                    variant={active ? "secondary" : "ghost"}
                  >
                    <Icon className="size-4" />
                  </Button>
                </span>
              );
            })}
          </div>
          <div className="relative">
            <EditorContent editor={editor} />
            {slashPosition === null ? null : (
              <div
                aria-label={messages.slashCommands}
                className="fixed z-50 overflow-y-auto rounded-md border border-border bg-background shadow-lg"
                role="menu"
                style={slashPosition}
              >
                {filteredCommands.map((command) => {
                  const Icon = command.icon;
                  return (
                    <button
                      className="flex w-full items-center gap-2 px-3 py-2 text-left text-sm text-foreground transition-colors hover:bg-muted focus-visible:bg-muted"
                      key={command.title}
                      onClick={() => runSlashCommand(command)}
                      role="menuitem"
                      type="button"
                    >
                      <Icon className="size-4 text-muted-foreground" />
                      <span className="min-w-0 flex-1">
                        <span className="block leading-tight">{command.title}</span>
                        <span className="block truncate text-xs text-muted-foreground">
                          {command.slash ? command.hint : ""}
                        </span>
                      </span>
                    </button>
                  );
                })}
              </div>
            )}
          </div>
        </div>
        {editorMode === "source" ? (
          <textarea
            aria-label={messages.markdownSource}
            className="article-writing-area block w-full resize-y bg-background p-4 font-mono text-foreground outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-ring sm:p-5"
            disabled={saving}
            spellCheck={false}
            value={markdown}
            onChange={(event) => {
              setMarkdown(event.target.value);
              setModeError(false);
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
