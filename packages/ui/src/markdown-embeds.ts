import type { Element, ElementContent } from "hast";
import type { MarkdownEmbed } from "@my-knowledge/content";

function element(
  tagName: string,
  children: ElementContent[],
  properties: Element["properties"] = {},
): Element {
  return { type: "element", tagName, properties, children };
}

export type CardData =
  | {
      kind: "link";
      url: string;
      title: string;
      description: string;
      site: string;
      image: string | null;
    }
  | {
      kind: "github";
      description: string;
      avatar: string;
      stars: number;
      forks: number;
      issues: number;
      language: string;
    }
  | { kind: "stock"; name: string; currency: string; points: { time: number; price: number }[] }
  | { kind: "error"; message: string };

export function renderMarkdownEmbed(embed: MarkdownEmbed, data?: CardData): Element {
  const properties = {
    className: ["markdown-embed", `markdown-embed-${embed.align}`, `markdown-embed-${embed.kind}`],
  };
  if (data?.kind === "error") {
    const card = renderMarkdownEmbed(embed);
    card.children.push(
      element("p", [{ type: "text", value: data.message }], {
        role: "status",
        className: ["embed-error"],
      }),
    );
    return card;
  }
  if (embed.kind === "link" && data?.kind === "link") {
    return element(
      "aside",
      [
        element(
          "a",
          [
            element("div", [
              element("small", [{ type: "text", value: data.site }]),
              element("strong", [{ type: "text", value: data.title }]),
              element("p", [{ type: "text", value: data.description }]),
            ]),
            ...(data.image === null
              ? []
              : [
                  element("img", [], {
                    src: data.image,
                    alt: "",
                    loading: "lazy",
                    referrerPolicy: "no-referrer",
                  }),
                ]),
          ],
          {
            href: data.url,
            target: "_blank",
            rel: ["noopener", "noreferrer"],
            className: ["embed-link"],
          },
        ),
      ],
      properties,
    );
  }
  if (embed.kind === "github" && data?.kind === "github") {
    return element(
      "aside",
      [
        element(
          "a",
          [
            element("div", [
              element("strong", [{ type: "text", value: embed.repo }]),
              element("p", [{ type: "text", value: data.description }]),
              element("small", [
                {
                  type: "text",
                  value: `${data.language} · Stars ${data.stars.toLocaleString("en")} · Forks ${data.forks.toLocaleString("en")} · Issues ${data.issues.toLocaleString("en")}`,
                },
              ]),
            ]),
            element("img", [], {
              src: data.avatar,
              alt: "",
              loading: "lazy",
              referrerPolicy: "no-referrer",
            }),
          ],
          {
            href: `https://github.com/${embed.repo}`,
            target: "_blank",
            rel: ["noopener", "noreferrer"],
            className: ["embed-repo"],
          },
        ),
      ],
      properties,
    );
  }
  if (embed.kind === "stock" && data?.kind === "stock") {
    const first = data.points[0];
    const previous = data.points.at(-2);
    const latest = data.points.at(-1);
    if (!first || !previous || !latest) throw new Error("Stock cards require two prices");
    const prices = data.points.map((point) => point.price);
    const minimum = Math.min(...prices);
    const range = Math.max(...prices) - minimum;
    const points = prices
      .map(
        (price, index) =>
          `${8 + (index / (prices.length - 1)) * 304},${range === 0 ? 48 : 88 - ((price - minimum) / range) * 80}`,
      )
      .join(" ");
    const change = latest.price - previous.price;
    const sign = change >= 0 ? "+" : "";
    const percent =
      previous.price === 0 ? "" : ` (${sign}${((change / previous.price) * 100).toFixed(2)}%)`;
    const date = (time: number) => new Date(time * 1000).toISOString().slice(0, 10);
    return element(
      "aside",
      [
        element("a", [{ type: "text", value: `${data.name} · ${embed.code}` }], {
          href: `https://finance.yahoo.com/quote/${encodeURIComponent(embed.code)}/`,
          target: "_blank",
          rel: ["noopener", "noreferrer"],
        }),
        element(
          "div",
          [
            element("strong", [
              { type: "text", value: `${latest.price.toFixed(2)} ${data.currency}` },
            ]),
            element("span", [
              { type: "text", value: `${sign}${change.toFixed(2)}${percent} · daily close` },
            ]),
          ],
          { className: ["embed-quote", change >= 0 ? "embed-up" : "embed-down"] },
        ),
        element(
          "svg",
          [
            element("title", [
              {
                type: "text",
                value: `${embed.code} closing prices, ${date(first.time)} to ${date(latest.time)}`,
              },
            ]),
            element("polyline", [], {
              points,
              fill: "none",
              stroke: "currentColor",
              strokeWidth: "2",
              vectorEffect: "non-scaling-stroke",
            }),
          ],
          { viewBox: "0 0 320 96", role: "img", className: ["embed-chart"] },
        ),
        element("small", [
          { type: "text", value: `${date(first.time)} — ${date(latest.time)} · Yahoo Finance` },
        ]),
      ],
      properties,
    );
  }
  switch (embed.kind) {
    case "media": {
      const preview = embed.type === "video" && embed.poster === null;
      const src = preview && !embed.src.includes("#") ? `${embed.src}#t=0.001` : embed.src;
      const player = element(
        embed.type,
        [
          element("a", [{ type: "text", value: "Open media" }], {
            href: embed.src,
            target: "_blank",
            rel: ["noopener", "noreferrer"],
          }),
        ],
        {
          src,
          controls: true,
          preload: preview ? "metadata" : "none",
          ariaLabel: embed.title,
          ...(embed.type === "video" ? { playsInline: true } : {}),
          ...(embed.poster === null ? {} : { poster: embed.poster }),
        },
      );
      return element(
        "figure",
        [
          player,
          ...(embed.caption === null
            ? []
            : [element("figcaption", [{ type: "text", value: embed.caption }])]),
        ],
        properties,
      );
    }
    case "link":
      return element(
        "aside",
        [
          element("a", [{ type: "text", value: embed.url }], {
            href: embed.url,
            rel: ["noopener", "noreferrer"],
            target: "_blank",
          }),
        ],
        properties,
      );
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
