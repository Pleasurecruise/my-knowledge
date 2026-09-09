import type { Element, ElementContent } from "hast";
import type { MarkdownEmbed } from "@my-knowledge/content";

function element(
  tagName: string,
  children: ElementContent[],
  properties: Element["properties"] = {},
): Element {
  return { type: "element", tagName, properties, children };
}

export function renderMarkdownEmbed(embed: MarkdownEmbed): Element {
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
    case "architecture": {
      const nodes = embed.nodes.map((node, index) =>
        element(
          "g",
          [
            element("rect", [], {
              x: String(24 + index * 224),
              y: String(50),
              width: 160,
              height: 80,
              rx: String(12),
            }),
            element("text", [{ type: "text", value: node.label }], {
              x: String(104 + index * 224),
              y: String(95),
              textAnchor: "middle",
              className: ["th"],
            }),
          ],
          {
            className: ["node", index % 2 === 0 ? "c-teal" : "c-purple"],
          },
        ),
      );
      const edges = embed.edges.map((edge) => {
        const from = embed.nodes.findIndex((node) => node.id === edge.from);
        const to = embed.nodes.findIndex((node) => node.id === edge.to);
        const start = 184 + from * 224;
        const end = 24 + to * 224;
        const direction = end > start ? 1 : -1;
        return element("path", [], {
          className: ["arr"],
          d: `M${start} 90 L${end} 90 M${end - 8 * direction} 84 L${end} 90 L${end - 8 * direction} 96`,
        });
      });
      return element(
        "figure",
        [
          element(
            "svg",
            [
              element("title", [{ type: "text", value: "Architecture flow" }]),
              element("desc", [
                { type: "text", value: "A left-to-right system architecture diagram." },
              ]),
              ...edges,
              ...nodes,
            ],
            { viewBox: `0 0 ${embed.nodes.length * 224 - 16} 180`, role: "img" },
          ),
        ],
        {
          className: [...properties.className, "markdown-embed-svg"],
        },
      );
    }
    case "storyboard": {
      const notes = embed.steps.flatMap((step, index) => {
        const x = 24 + index * 228;
        const y = index % 2 === 0 ? 40 : 46;
        const outline = `M${x} ${y} Q${x + 85} ${y - 8} ${x + 174} ${y + 2} L${x + 170} ${y + 132} Q${x + 85} ${y + 125} ${x - 2} ${y + 130} Z`;
        const note = element(
          "g",
          [
            element("path", [], { className: ["note"], d: outline }),
            element("path", [], {
              className: ["sketch-shadow"],
              d: outline,
              transform: "translate(2 2)",
            }),
            element("text", [{ type: "text", value: String(index + 1).padStart(2, "0") }], {
              x: String(x + 12),
              y: String(y + 22),
              className: ["hand", "step"],
            }),
            element("text", [{ type: "text", value: step.heading }], {
              x: String(x + 87),
              y: String(y + 58),
              textAnchor: "middle",
              className: ["hand", "title"],
            }),
            element("text", [{ type: "text", value: step.body }], {
              x: String(x + 87),
              y: String(y + 85),
              textAnchor: "middle",
              className: ["hand", "caption"],
            }),
          ],
          { className: [index % 2 === 0 ? "fill-blue" : "fill-violet"] },
        );
        if (index === embed.steps.length - 1) return [note];
        const arrow = `M${x + 184} ${y + 70} Q${x + 200} ${y + 57} ${x + 216} ${y + 70} M${x + 209} ${y + 63} L${x + 216} ${y + 70} L${x + 209} ${y + 77}`;
        return [
          note,
          element("path", [], {
            className: ["arrow-shadow"],
            d: arrow,
            transform: "translate(1 2)",
          }),
          element("path", [], { className: ["arrow"], d: arrow }),
        ];
      });
      return element(
        "figure",
        [
          element(
            "svg",
            [
              element("title", [{ type: "text", value: embed.title }]),
              element("desc", [
                {
                  type: "text",
                  value: embed.steps.map((step) => `${step.heading}: ${step.body}`).join(" → "),
                },
              ]),
              ...notes,
            ],
            { viewBox: `0 0 ${embed.steps.length * 228 - 6} 220`, role: "img" },
          ),
        ],
        {
          className: [...properties.className, "markdown-embed-svg"],
        },
      );
    }
    case "svg":
      return element("figure", [embed.tree], {
        className: [...properties.className, `markdown-embed-${embed.profile}`],
      });
  }
}
