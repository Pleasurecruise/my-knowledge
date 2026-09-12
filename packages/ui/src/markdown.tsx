import type { Element, ElementContent, Root } from "hast";
import rehypeKatex from "rehype-katex";
import rehypeReact from "rehype-react";
import rehypeSanitize, { defaultSchema } from "rehype-sanitize";
import remarkFrontmatter from "remark-frontmatter";
import remarkGfm from "remark-gfm";
import remarkMath from "remark-math";
import remarkParse from "remark-parse";
import remarkRehype from "remark-rehype";
import {
  Fragment,
  Suspense,
  type ComponentType,
  type AnchorHTMLAttributes,
  type ReactNode,
} from "react";
import { jsx, jsxs } from "react/jsx-runtime";
import { unified } from "unified";
import type { Plugin } from "unified";
import { SKIP, visit } from "unist-util-visit";

import {
  extractHeadings,
  MarkdownEmbedError,
  parseMarkdownEmbed,
  type ArticleHeading,
  type MarkdownEmbed,
} from "@my-knowledge/content";

import { renderMarkdownEmbed } from "./markdown-embeds";
import { markdownHighlighter } from "./markdown-highlighter";
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

type EmbedRenderer = (embed: MarkdownEmbed) => Promise<Element>;

const structuredBlocks: Plugin<[StructuredBlockLabels, MarkdownEmbed[]?], Root> =
  (labels, embeds) => (tree: Root) => {
    visit(tree, "element", (node, index, parent) => {
      if (!parent || index === undefined || node.tagName !== "pre") return;
      const code = node.children.at(0);
      if (code?.type !== "element" || code.tagName !== "code") return;
      const classes = Array.isArray(code.properties.className)
        ? code.properties.className.filter(
            (value: unknown): value is string => typeof value === "string",
          )
        : [];
      const languageClass = classes.find((value) => value.startsWith("language-"));
      const language = languageClass?.slice("language-".length).toLowerCase();
      if (language?.startsWith("embed:")) {
        const source = code.children.at(0);
        if (source?.type !== "text") throw new Error("Embed source is missing");
        let embed: MarkdownEmbed | undefined;
        try {
          embed = parseMarkdownEmbed(language, source.value);
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

type MarkdownHighlighter = Awaited<typeof markdownHighlighter>;

const highlightCodeBlocks: Plugin<[MarkdownHighlighter], Root> = (highlighter) => (tree: Root) => {
  const languages = highlighter.getLoadedLanguages();
  visit(tree, "element", (node, index, parent) => {
    if (!parent || index === undefined || node.tagName !== "pre") return;
    const code = node.children.at(0);
    if (code?.type !== "element" || code.tagName !== "code") return;
    const classes = Array.isArray(code.properties.className)
      ? code.properties.className.filter(
          (value: unknown): value is string => typeof value === "string",
        )
      : [];
    const language = classes
      .find((value) => value.startsWith("language-"))
      ?.slice("language-".length);
    if (!language || !languages.includes(language)) return;
    const source = code.children.at(0);
    if (source?.type !== "text") throw new Error("Code block source is missing");
    const highlighted = highlighter.codeToHast(source.value, {
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

const headingAnchors: Plugin<[ArticleHeading[]], Root> = (headings) => (tree: Root) => {
  let index = 0;
  visit(tree, "element", (node) => {
    if (!/^h[1-6]$/u.test(node.tagName)) return;
    const heading = headings[index++];
    if (!heading) throw new Error("Heading anchor is missing");
    node.properties.id = heading.id;
  });
};

const tableWrappers: Plugin<[], Root> = () => (tree: Root) => {
  visit(tree, "element", (node, index, parent) => {
    if (!parent || index === undefined || node.tagName !== "table") return;
    parent.children[index] = {
      type: "element",
      tagName: "div",
      properties: { className: ["markdown-table-scroll"] },
      children: [node],
    };
    return SKIP;
  });
};

type MarkdownProps = {
  labels: StructuredBlockLabels;
  markdown: string;
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
  return embedNode(await read(embed), link);
}

export async function Markdown({ labels, markdown, structuredBlock, embeds, link }: MarkdownProps) {
  const deferredEmbeds: MarkdownEmbed[] = [];
  const processor = unified()
    .use(remarkParse)
    .use(remarkFrontmatter, ["yaml"])
    .use(remarkGfm)
    .use(remarkMath)
    .use(remarkRehype)
    .use(rehypeSanitize, mathSchema)
    .use(headingAnchors, extractHeadings(markdown))
    .use(rehypeKatex)
    .use(articleSemantics)
    .use(structuredBlocks, labels, embeds ? deferredEmbeds : undefined)
    .use(tableWrappers);

  processor.use(highlightCodeBlocks, await markdownHighlighter);

  const file = await processor
    .use(rehypeReact, {
      Fragment,
      jsx,
      jsxs,
      components: {
        ...(link ? { a: link } : {}),
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
    .process(markdown);

  return <div className="markdown-body">{file.result}</div>;
}
