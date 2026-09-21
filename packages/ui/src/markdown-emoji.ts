import type { ElementContent, Root } from "hast";
import type { Plugin } from "unified";
import { SKIP, visit } from "unist-util-visit";
import { imageEmojis, type ImageEmoji } from "@my-knowledge/content";

export const markdownEmoji: Plugin<[ReadonlyMap<string, ImageEmoji>?], Root> =
  (catalog = imageEmojis) =>
  (tree: Root) => {
    visit(tree, "element", (node) => {
      if (["code", "pre", "a", "img", "math"].includes(node.tagName)) return SKIP;
      const classes = node.properties.className;
      if (
        Array.isArray(classes) &&
        classes.some((value) => typeof value === "string" && value.startsWith("katex"))
      )
        return SKIP;
      node.children = node.children.flatMap((child): ElementContent[] => {
        if (child.type !== "text") return [child];
        const parts: ElementContent[] = [];
        let cursor = 0;
        for (const match of child.value.matchAll(/:[a-z0-9]+_[^:\s]+:/giu)) {
          const emoji = catalog.get(match[0]);
          if (!emoji) continue;
          if (match.index > cursor)
            parts.push({ type: "text", value: child.value.slice(cursor, match.index) });
          parts.push({
            type: "element",
            tagName: "img",
            properties: {
              className: ["markdown-emoji", `markdown-emoji-${emoji.display}`],
              src: emoji.value,
              alt: `[${emoji.name}]`,
              title: emoji.name,
              loading: "lazy",
              decoding: "async",
              referrerPolicy: "no-referrer",
            },
            children: [],
          });
          cursor = match.index + match[0].length;
        }
        if (cursor === 0) return [child];
        if (cursor < child.value.length)
          parts.push({ type: "text", value: child.value.slice(cursor) });
        return parts;
      });
    });
  };
