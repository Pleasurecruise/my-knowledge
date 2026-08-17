"use client";

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
import { Badge } from "@my-knowledge/ui/components/badge";
import { Button } from "@my-knowledge/ui/components/button";
import { Input } from "@my-knowledge/ui/components/input";
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
  X,
} from "@my-knowledge/ui/icons";
import { useRouter } from "next/navigation";
import { useEffect, useMemo, useState } from "react";
import { z } from "zod";

import type { ArticleEditorProps, EditorCommand, SlashMenuPosition } from "./article-editor.types";
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

const saveResponseSchema = z.object({ article: z.object({ slug: z.string() }) });

export function ArticleEditor(props: ArticleEditorProps) {
  const { messages } = props;
  const article = props.mode === "edit" ? props.article : null;
  const initialBody = props.mode === "edit" ? props.article.body : "";
  const initialSummary = props.mode === "edit" ? props.article.summary : null;
  const initialTags = props.mode === "edit" ? props.article.tags : [];
  const initialTitle = props.mode === "edit" ? props.article.title : "";
  const router = useRouter();
  const [title, setTitle] = useState(initialTitle);
  const [markdown, setMarkdown] = useState(initialBody);
  const [tags, setTags] = useState(initialTags.join(", "));
  const [saving, setSaving] = useState(false);
  const [visibilitySaving, setVisibilitySaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [discardOpen, setDiscardOpen] = useState(false);
  const [slashRange, setSlashRange] = useState<{ from: number; to: number } | null>(null);
  const [slashQuery, setSlashQuery] = useState("");
  const [slashPosition, setSlashPosition] = useState<SlashMenuPosition | null>(null);

  const extensions = useMemo(
    () => [
      StarterKit,
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
    content: initialBody,
    contentType: "markdown",
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
  const dirty =
    title !== initialTitle ||
    markdown.trimEnd() !== initialBody.trimEnd() ||
    tags !== initialTags.join(", ");
  const filteredCommands = commands.filter(
    (command) =>
      command.slash &&
      `${command.title} ${command.keywords}`.toLowerCase().includes(slashQuery.toLowerCase()),
  );

  useEffect(() => {
    function beforeUnload(event: BeforeUnloadEvent) {
      if (dirty) event.preventDefault();
    }
    window.addEventListener("beforeunload", beforeUnload);
    return () => window.removeEventListener("beforeunload", beforeUnload);
  }, [dirty]);

  const returnHref = article === null ? "/articles" : `/articles/${article.slug}`;

  function runSlashCommand(command: EditorCommand) {
    if (!editor || !slashRange) return;
    editor.chain().focus().deleteRange(slashRange).run();
    command.run(editor);
    closeSlashMenu();
  }

  async function save() {
    if (saving || !title.trim() || !markdown.trim()) return;
    setSaving(true);
    setError(null);
    try {
      const response = await fetch(
        article === null ? "/api/articles" : `/api/articles/${article.id}`,
        {
          method: article === null ? "POST" : "PATCH",
          headers: { "content-type": "application/json" },
          body: JSON.stringify({
            ...(article === null ? {} : { operation: "save", expectedHash: article.contentHash }),
            title: title.trim(),
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
      router.replace(`/articles/${result.article.slug}`);
      router.refresh();
    } finally {
      setSaving(false);
    }
  }

  async function changeVisibility() {
    if (article === null || dirty || visibilitySaving) return;
    setVisibilitySaving(true);
    setError(null);
    try {
      const response = await fetch(`/api/articles/${article.id}`, {
        method: "PATCH",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          operation: "setVisibility",
          expectedHash: article.contentHash,
          visibility: article.visibility === "public" ? "private" : "public",
        }),
      });
      if (!response.ok) {
        setError(response.status === 409 ? messages.stale : messages.saveFailed);
        return;
      }
      router.replace(returnHref);
      router.refresh();
    } finally {
      setVisibilitySaving(false);
    }
  }

  function leave() {
    if (dirty) {
      setDiscardOpen(true);
      return;
    }
    router.push(returnHref);
  }

  return (
    <section aria-label={messages.bodyLabel} className="mx-auto mt-6 w-full sm:mt-8" id="article">
      <div className="flex flex-row flex-wrap items-center gap-x-2 gap-y-1">
        <div className="min-w-0 flex-1">
          <h1 className="font-medium text-xl leading-snug tracking-normal text-foreground sm:text-2xl sm:leading-tight">
            {title.trim() || messages.titleLabel}
          </h1>
        </div>
        <div className="flex items-center">
          {article === null ? null : (
            <DeleteAction expectedHash={article.contentHash} id={article.id} messages={messages} />
          )}
          <Button
            aria-label={messages.cancel}
            className={
              article === null
                ? "h-8 w-8 rounded-r-none text-muted-foreground"
                : "-ml-px h-8 w-8 rounded-none text-muted-foreground"
            }
            disabled={saving}
            onClick={leave}
            size="icon-sm"
            variant="outline"
          >
            <X />
          </Button>
          <Button
            aria-label={messages.save}
            className="-ml-px h-8 w-8 rounded-l-none bg-foreground text-background hover:bg-foreground hover:opacity-90"
            disabled={saving || !title.trim() || !markdown.trim()}
            onClick={save}
            size="icon-sm"
          >
            <Save />
          </Button>
        </div>
      </div>

      <div
        className={`mt-5 grid grid-cols-1 gap-4 sm:grid-cols-[3fr_2fr] ${article === null ? "max-w-none" : "sm:max-w-140"}`}
      >
        <label className="grid gap-2" htmlFor="article-title">
          <span className="font-mono text-[10px] tracking-widest text-muted-foreground uppercase">
            {messages.titleLabel}
          </span>
          <Input
            autoFocus
            disabled={saving}
            id="article-title"
            onChange={(event) => setTitle(event.target.value)}
            placeholder={messages.titleLabel}
            value={title}
          />
        </label>
        <label className="grid gap-2" htmlFor="article-tags">
          <span className="font-mono text-[10px] tracking-widest text-muted-foreground uppercase">
            {messages.tagsLabel}
          </span>
          <Input
            disabled={saving}
            id="article-tags"
            onChange={(event) => setTags(event.target.value)}
            placeholder={messages.tagsHint}
            value={tags}
          />
        </label>
      </div>

      <div className={`mt-4 ${article === null ? "max-w-none" : "max-w-140"}`}>
        <div className="grid gap-2">
          <span className="text-muted-foreground text-[0.6875rem] font-medium tracking-widest uppercase">
            {messages.summaryLabel}
          </span>
          <p className="text-muted-foreground min-h-9 border-b px-0 py-2 text-sm">
            {initialSummary === null ? messages.summaryGenerated : initialSummary}
          </p>
        </div>
      </div>

      {article === null ? null : (
        <div className="mt-4 flex items-center gap-2">
          <Badge variant={article.visibility === "private" ? "destructive" : "secondary"}>
            {article.visibility === "private" ? messages.private : messages.public}
          </Badge>
          <Button
            disabled={dirty || saving || visibilitySaving}
            onClick={changeVisibility}
            size="sm"
            variant="outline"
          >
            {visibilitySaving
              ? messages.publishing
              : article.visibility === "public"
                ? messages.withdraw
                : messages.publish}
          </Button>
        </div>
      )}

      {error === null ? null : (
        <p className="text-destructive mt-4 text-sm" role="alert">
          {error}
        </p>
      )}

      <div className="mt-6 overflow-hidden rounded-lg border bg-background shadow-sm sm:mt-8">
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
                  aria-pressed={active}
                  className="size-7.5 shrink-0 text-muted-foreground hover:text-foreground"
                  disabled={editor === null || saving}
                  onClick={() => editor && command.run(editor)}
                  size="icon-sm"
                  title={command.title}
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

      <AlertDialog onOpenChange={setDiscardOpen} open={discardOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{messages.discardTitle}</AlertDialogTitle>
            <AlertDialogDescription>{messages.discardDescription}</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>{messages.cancel}</AlertDialogCancel>
            <AlertDialogAction onClick={() => router.push(returnHref)} variant="destructive">
              {messages.discard}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </section>
  );
}
