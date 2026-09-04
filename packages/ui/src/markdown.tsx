import { decode } from "entities";
import type { Element, ElementContent, Root, Text } from "hast";
import type { Code, InlineCode, Root as MarkdownRoot } from "mdast";
import rehypeKatex from "rehype-katex";
import rehypeReact from "rehype-react";
import rehypeSanitize, { defaultSchema } from "rehype-sanitize";
import remarkFrontmatter from "remark-frontmatter";
import remarkGfm from "remark-gfm";
import remarkMath from "remark-math";
import remarkParse from "remark-parse";
import remarkRehype from "remark-rehype";
import { Fragment, type ComponentType, type ReactNode } from "react";
import { jsx, jsxs } from "react/jsx-runtime";
import { unified } from "unified";
import type { Plugin } from "unified";
import { SKIP, visit } from "unist-util-visit";

import { createSlug, parseMarkdownEmbed } from "@my-knowledge/content";

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

const decodeCodeEntities: Plugin<[], MarkdownRoot> = () => (tree: MarkdownRoot) => {
  visit(tree, "code", (node: Code) => {
    if (!node.lang?.toLowerCase().startsWith("embed:")) {
      node.value = decode(node.value).replace(/\n+$/u, "");
    }
  });
  visit(tree, "inlineCode", (node: InlineCode) => {
    node.value = decode(node.value).replace(/\n+$/u, "");
  });
};

const articleSemantics: Plugin<[], Root> = () => (tree: Root) => {
  function firstMeaningfulText(node: Element): Text | undefined {
    for (const child of node.children) {
      if (child.type === "text" && child.value.trim()) return child;
      if (child.type === "element") {
        const found = firstMeaningfulText(child);
        if (found) return found;
      }
    }
    return undefined;
  }

  visit(tree, "element", (node) => {
    if (node.tagName === "code" || node.tagName === "pre") return SKIP;
    if (node.tagName === "blockquote") {
      const firstText = firstMeaningfulText(node);
      const match = firstText
        ? /^\[!(NOTE|TIP|WARNING|IMPORTANT|CAUTION)\]\s*/u.exec(firstText.value)
        : null;
      if (match?.[1] && firstText) {
        node.properties.className = ["callout", `callout-${match[1].toLocaleLowerCase("en-US")}`];
        firstText.value = firstText.value.slice(match[0].length);
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

const structuredBlocks: Plugin<[StructuredBlockLabels], Root> = (labels) => (tree: Root) => {
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
      const embed = parseMarkdownEmbed(language, source.value);
      if (embed) parent.children[index] = renderMarkdownEmbed(embed, labels);
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

function headingText(node: Element): string {
  let text = "";
  for (const child of node.children) {
    if (child.type === "text") text += child.value;
    if (child.type === "element") text += headingText(child);
  }
  return text;
}

const headingAnchors: Plugin<[], Root> = () => (tree: Root) => {
  const counts = new Map<string, number>();
  visit(tree, "element", (node) => {
    if (!/^h[1-6]$/u.test(node.tagName)) return;
    const title = headingText(node).trim();
    if (!title) return;
    const base = createSlug(title);
    const previous = counts.get(base);
    const count = previous === undefined ? 1 : previous + 1;
    counts.set(base, count);
    node.properties.id = count === 1 ? base : `${base}-${count}`;
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
};

export async function Markdown({ labels, markdown, structuredBlock }: MarkdownProps) {
  const processor = unified()
    .use(remarkParse)
    .use(remarkFrontmatter, ["yaml"])
    .use(remarkGfm)
    .use(remarkMath)
    .use(decodeCodeEntities)
    .use(remarkRehype)
    .use(rehypeSanitize, mathSchema)
    .use(rehypeKatex)
    .use(articleSemantics)
    .use(structuredBlocks, labels)
    .use(headingAnchors)
    .use(tableWrappers);

  if (/(^|\n)```[^\s`\n]+/u.test(markdown)) {
    const highlighter = await markdownHighlighter;
    processor.use(highlightCodeBlocks, highlighter);
  }

  const file = await processor
    .use(rehypeReact, {
      Fragment,
      jsx,
      jsxs,
      components: { "structured-block": structuredBlock },
    })
    .process(markdown);

  return <div className="markdown-body">{file.result}</div>;
}
