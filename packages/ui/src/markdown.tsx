import {
  compiledMarkdownSchema,
  type CompiledMarkdown,
  type DeferredEmbed,
  type MarkdownCache,
} from "./markdown-artifact";
import { markdownEmoji } from "./markdown-emoji";
import { CodeBlock } from "./code-block";
import { MarkdownBody } from "./markdown-body";
import type { Element, ElementContent, Root } from "hast";
import type { Root as MarkdownRoot } from "mdast";
import rehypeKatex from "rehype-katex";
import rehypeReact from "rehype-react";
import rehypeSanitize, { defaultSchema } from "rehype-sanitize";
import remarkRehype from "remark-rehype";
import {
  isValidElement,
  type ReactElement,
  Fragment,
  Suspense,
  type ComponentType,
  type ComponentProps,
  type AnchorHTMLAttributes,
  type ReactNode,
} from "react";
import { jsx, jsxs } from "react/jsx-runtime";
import { unified } from "unified";
import { LRUCache } from "lru-cache";
import type { Plugin } from "unified";
import { SKIP, visit } from "unist-util-visit";

import {
  extractHeadings,
  markdownParser,
  MarkdownEmbedError,
  parseMarkdownEmbed,
  type MarkdownEmbed,
} from "@my-knowledge/content";

import { renderMarkdownEmbed } from "./markdown-embeds";
import type { HighlighterCore } from "@shikijs/core";
import type { StructuredBlockLabels, StructuredBlockProps } from "./structured-block.types";

declare module "unified" {
  interface CompileResultMap {
    ReactNode: ReactNode;
  }
}

const sanitizerAttributes = defaultSchema.attributes;
if (!sanitizerAttributes) throw new Error("Sanitizer attributes are missing");
const sanitizerDivAttributes = sanitizerAttributes.div;
if (!sanitizerDivAttributes) throw new Error("Sanitizer div attributes are missing");
const mathSchema = {
  ...defaultSchema,
  attributes: {
    ...defaultSchema.attributes,
    div: [...sanitizerDivAttributes, ["className", /^(?:math|katex)/u]],
    span: [["className", /^(?:math|katex)/u], "ariaHidden"],
  },
};

const articleSemantics: Plugin<[], Root> = () => (tree: Root) => {
  visit(tree, "element", (node) => {
    if (node.tagName === "code" || node.tagName === "pre" || node.tagName === "a") return SKIP;
    if (node.tagName === "blockquote") {
      const paragraph = node.children.find((child) => child.type === "element");
      const firstText = paragraph?.tagName === "p" ? paragraph.children[0] : undefined;
      const match =
        firstText?.type === "text"
          ? /^\[!(NOTE|TIP|WARNING|IMPORTANT|CAUTION)\]\s*/u.exec(firstText.value)
          : null;
      if (match?.[1] && firstText?.type === "text") {
        node.properties.className = ["callout", `callout-${match[1].toLocaleLowerCase("en-US")}`];
        firstText.value = firstText.value.slice(match[0].length);
        node.children.unshift({
          type: "element",
          tagName: "p",
          properties: { className: ["callout-title"] },
          children: [{ type: "text", value: match[1] }],
        });
      }
    }

    node.children = node.children.flatMap((child): ElementContent[] => {
      if (child.type !== "text" || !child.value) return [child];
      const parts: ElementContent[] = [];
      let offset = 0;
      const pattern = /\[\[([^\]|\n]+)(?:\|([^\]\n]+))?\]\]/gu;
      for (const match of child.value.matchAll(pattern)) {
        const index = match.index;
        const target = match[1]?.trim();
        if (index > offset) parts.push({ type: "text", value: child.value.slice(offset, index) });
        if (target) {
          parts.push({
            type: "element",
            tagName: "a",
            properties: { href: `/articles/${encodeURIComponent(target)}` },
            children: [{ type: "text", value: match[2]?.trim() || target }],
          });
        }
        offset = index + match[0].length;
      }
      if (offset === 0) return [child];
      if (offset < child.value.length)
        parts.push({ type: "text", value: child.value.slice(offset) });
      return parts;
    });
  });
};

type EmbedRenderer = (embed: MarkdownEmbed) => Promise<Element | ReactElement>;

const structuredBlocks: Plugin<[StructuredBlockLabels, DeferredEmbed[]?], Root> =
  (labels, embeds) => (tree: Root) => {
    visit(tree, "element", (node, index, parent) => {
      if (!parent || index === undefined || node.tagName !== "pre") return;
      const code = node.children.at(0);
      if (code?.type !== "element" || code.tagName !== "code") return;
      const classes = Array.isArray(code.properties.className)
        ? code.properties.className.map(String)
        : [];
      const languageClass = classes.find((value) => value.startsWith("language-"));
      const language = languageClass?.slice("language-".length).toLowerCase();
      if (language?.startsWith("embed:")) {
        const source = code.children.at(0);
        if (source?.type !== "text") throw new Error("Embed source is missing");
        let embed: MarkdownEmbed | undefined;
        try {
          // remark-rehype adds a terminal newline to fenced code text.
          embed = parseMarkdownEmbed(language, source.value.replace(/\n$/u, ""));
        } catch (error) {
          if (!(error instanceof MarkdownEmbedError)) throw error;
          parent.children[index] = {
            type: "element",
            tagName: "section",
            properties: { className: ["markdown-block-error"] },
            children: [
              {
                type: "element",
                tagName: "p",
                properties: { role: "alert" },
                children: [{ type: "text", value: `${language}: ${error.message}` }],
              },
              node,
            ],
          };
          return SKIP;
        }
        if (embed) {
          if (
            embeds &&
            (embed.kind === "link" ||
              embed.kind === "github" ||
              embed.kind === "twitter" ||
              embed.kind === "stock" ||
              embed.kind === "articleList")
          ) {
            parent.children[index] = {
              type: "element",
              tagName: "deferred-embed",
              properties: { embedIndex: embeds.length },
              children: [],
            };
            embeds.push(embed);
          } else parent.children[index] = renderMarkdownEmbed(embed);
        }
        return SKIP;
      }
      if (
        language !== "mermaid" &&
        language !== "vega" &&
        language !== "vega-lite" &&
        language !== "json-canvas"
      )
        return;
      const source = code.children.at(0);
      if (source?.type !== "text") throw new Error("Structured block source is missing");
      let properties: StructuredBlockProps;
      if (language === "mermaid") {
        properties = {
          language,
          source: source.value,
          diagram: labels.diagram,
          renderingDiagram: labels.renderingDiagram,
        };
      } else if (language === "vega" || language === "vega-lite") {
        properties = {
          language,
          source: source.value,
          chart: labels.chart,
        };
      } else {
        properties = {
          language,
          source: source.value,
          canvas: labels.canvas,
          canvasRelationships: labels.canvasRelationships,
          canvasViewport: labels.canvasViewport,
          spatialView: labels.spatialView,
        };
      }
      parent.children[index] = {
        type: "element",
        tagName: "structured-block",
        properties,
        children: [],
      };
      return SKIP;
    });
  };

const highlightCodeBlocks: Plugin<[HighlighterCore], Root> = (highlighter) => (tree: Root) => {
  const languages = highlighter.getLoadedLanguages();
  visit(tree, "element", (node, index, parent) => {
    if (!parent || index === undefined || node.tagName !== "pre") return;
    const code = node.children.at(0);
    if (code?.type !== "element" || code.tagName !== "code") return;
    const classes = Array.isArray(code.properties.className)
      ? code.properties.className.map(String)
      : [];
    const language = classes
      .find((value) => value.startsWith("language-"))
      ?.slice("language-".length);
    if (!language || !languages.includes(language)) return;
    const source = code.children.at(0);
    if (source?.type !== "text") throw new Error("Code block source is missing");
    // remark-rehype appends one newline; it is not part of the authored code.
    const highlighted = highlighter.codeToHast(source.value.replace(/\n$/u, ""), {
      lang: language,
      defaultColor: false,
      themes: { light: "github-light", dark: "github-dark" },
      transformers: [
        {
          pre(highlighted) {
            highlighted.properties.dataLanguage = language;
          },
        },
      ],
    });
    const pre = highlighted.children.at(0);
    if (pre?.type !== "element" || pre.tagName !== "pre")
      throw new Error("Highlighted code block is missing");
    parent.children[index] = pre;
    return SKIP;
  });
};

const headingAnchors: Plugin<[], MarkdownRoot> = () => (tree: MarkdownRoot) => {
  const headings = extractHeadings(tree);
  let index = 0;
  visit(tree, "heading", (node) => {
    const heading = headings[index++];
    if (!heading) throw new Error("Heading anchor is missing");
    node.data = { ...node.data, hProperties: { ...node.data?.hProperties, id: heading.id } };
  });
};

const tableWrappers: Plugin<[], Root> = () => (tree: Root) => {
  visit(tree, "element", (node, index, parent) => {
    if (!parent || index === undefined || node.tagName !== "table") return;
    parent.children[index] = {
      type: "element",
      tagName: "div",
      properties: { className: ["markdown-table-scroll"], tabIndex: 0 },
      children: [node],
    };
    return SKIP;
  });
};

type MarkdownProps = {
  labels: StructuredBlockLabels;
  markdown: string;
  cache?: MarkdownCache | null;
  structuredBlock: ComponentType<StructuredBlockProps>;
  embeds?: EmbedRenderer;
  link?: ComponentType<AnchorHTMLAttributes<HTMLAnchorElement>>;
};

function embedNode(node: Element, link: MarkdownProps["link"]) {
  return unified()
    .use(rehypeReact, { Fragment, jsx, jsxs, components: link ? { a: link } : {} })
    .stringify({ type: "root", children: [node] });
}

async function EnrichedEmbed({
  embed,
  read,
  link,
}: {
  embed: MarkdownEmbed;
  read: EmbedRenderer;
  link: MarkdownProps["link"];
}) {
  const result = await read(embed);
  return isValidElement(result) ? result : embedNode(result, link);
}

async function compileMarkdown(
  labels: StructuredBlockLabels,
  markdown: string,
  enrich: boolean,
): Promise<CompiledMarkdown> {
  const deferredEmbeds: DeferredEmbed[] = [];
  const processor = markdownParser()
    .use(headingAnchors)
    .use(remarkRehype)
    // IDs come from the heading compiler and remark's prefixed footnotes, not source HTML.
    .use(rehypeSanitize, { ...mathSchema, clobberPrefix: "" })
    .use(articleSemantics)
    .use(rehypeKatex)
    .use(markdownEmoji)
    .use(structuredBlocks, labels, enrich ? deferredEmbeds : undefined)
    .use(tableWrappers);

  const { markdownHighlighter } = await import("./markdown-highlighter");
  processor.use(highlightCodeBlocks, await markdownHighlighter);

  const tree = await processor.run(processor.parse(markdown));
  return { tree, deferredEmbeds };
}

type CompilationInput = {
  labels: StructuredBlockLabels;
  markdown: string;
  enrich: boolean;
};

const privateCompilations = {};
const compilations = new WeakMap<object, LRUCache<string, CompiledMarkdown, CompilationInput>>();

export async function Markdown({
  labels,
  markdown,
  structuredBlock,
  embeds,
  link,
  cache,
}: MarkdownProps) {
  const scope = cache ?? privateCompilations;
  let memory = compilations.get(scope);
  if (!memory) {
    memory = new LRUCache<string, CompiledMarkdown, CompilationInput>({
      max: 16,
      maxSize: 8 * 1024 * 1024,
      maxEntrySize: 524_288,
      ttl: 30_000,
      ttlResolution: 0,
      perf: { now: () => Date.now() },
      ignoreFetchAbort: true,
      sizeCalculation: (compiled, key) =>
        key.length > 131_072 ? 524_289 : key.length + JSON.stringify(compiled).length,
      fetchMethod: async (input, _previous, { context }) => {
        let key: string | undefined;
        if (cache) {
          const digest = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(input));
          const hash = Array.from(new Uint8Array(digest), (byte) =>
            byte.toString(16).padStart(2, "0"),
          ).join("");
          key = `compiled/${hash}.json`;
          const stored = await cache.get(key);
          if (stored !== null) return compiledMarkdownSchema.parse(JSON.parse(stored));
        }
        const compiled = await compileMarkdown(context.labels, context.markdown, context.enrich);
        if (cache && key) {
          const artifact = JSON.stringify(compiledMarkdownSchema.parse(compiled));
          if (new TextEncoder().encode(artifact).byteLength <= 20 * 1024 * 1024)
            await cache.put(key, artifact, { expirationTtl: 86_400 });
        }
        return compiled;
      },
    });
    compilations.set(scope, memory);
  }
  const enrich = Boolean(embeds);
  const compiled = await memory.forceFetch(JSON.stringify([markdown, labels, enrich]), {
    context: { labels, markdown, enrich },
  });
  const { tree, deferredEmbeds } = compiled;
  const result = unified()
    .use(rehypeReact, {
      Fragment,
      jsx,
      jsxs,
      components: {
        ...(link ? { a: link } : {}),
        pre: (props: ComponentProps<"pre">) => <CodeBlock {...props} labels={labels} />,
        "structured-block": structuredBlock,
        "deferred-embed": ({ embedIndex }: { embedIndex: number }) => {
          const embed = deferredEmbeds[embedIndex];
          if (!embed || !embeds) throw new Error("Deferred embed is missing");
          return (
            <Suspense
              fallback={
                embed.kind === "articleList" ? null : embedNode(renderMarkdownEmbed(embed), link)
              }
            >
              <EnrichedEmbed embed={embed} read={embeds} link={link} />
            </Suspense>
          );
        },
      },
    })
    .stringify(tree);

  return <MarkdownBody>{result}</MarkdownBody>;
}
