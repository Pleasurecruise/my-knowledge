import type { Element, ElementContent } from "hast";
import type { MarkdownEmbed } from "@my-knowledge/content";

import type { StructuredBlockLabels } from "./structured-block.types";

function element(
  tagName: string,
  children: ElementContent[],
  properties: Element["properties"] = {},
): Element {
  return { type: "element", tagName, properties, children };
}

export function renderMarkdownEmbed(embed: MarkdownEmbed, labels: StructuredBlockLabels): Element {
  const properties = {
    className: ["markdown-embed", `markdown-embed-${embed.align}`, `markdown-embed-${embed.kind}`],
  };
  switch (embed.kind) {
    case "github":
    case "stock": {
      const label = embed.kind === "github" ? embed.repo : embed.code;
      const href =
        embed.kind === "github"
          ? `https://github.com/${embed.repo}`
          : `https://finance.yahoo.com/quote/${encodeURIComponent(embed.code)}/`;
      return element(
        "aside",
        [
          element(
            "a",
            [
              {
                type: "text",
                value: `${embed.kind === "github" ? "GitHub" : "Yahoo Finance"} · ${label}`,
              },
            ],
            { href, rel: ["noopener", "noreferrer"], target: "_blank" },
          ),
        ],
        properties,
      );
    }
    case "architecture":
      return element(
        "figure",
        [
          element("structured-block", [], {
            language: "mermaid",
            source: embed.source,
            diagram: labels.diagram,
            renderingDiagram: labels.renderingDiagram,
          }),
        ],
        properties,
      );
    case "storyboard":
      return element(
        "figure",
        [
          element("figcaption", [{ type: "text", value: embed.title }]),
          element(
            "ol",
            embed.steps.map((step) =>
              element("li", [
                element("strong", [{ type: "text", value: step.heading }]),
                element("p", [{ type: "text", value: step.body }]),
              ]),
            ),
          ),
        ],
        properties,
      );
    case "svg":
      return element("figure", [embed.tree], properties);
  }
}
