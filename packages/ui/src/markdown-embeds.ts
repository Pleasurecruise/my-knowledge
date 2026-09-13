import type { Element, ElementContent } from "hast";
import type { MarkdownEmbed } from "@my-knowledge/content";
import { layoutArchitecture } from "./architecture";

function element(
  tagName: string,
  children: ElementContent[],
  properties: Element["properties"] = {},
): Element {
  return { type: "element", tagName, properties, children };
}

export type ArticleCard = { href: string; title: string; description: string };

export type CardData =
  | { kind: "articleList"; items: (ArticleCard | null)[] }
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
  if (embed.kind === "articleList") {
    return element(
      "ul",
      embed.urls.map((_, index) => {
        const metadata = data?.kind === "articleList" ? data.items[index] : null;
        const href = metadata?.href;
        const copy = [
          element("strong", [{ type: "text", value: metadata?.title ?? "Article unavailable" }]),
          ...(metadata?.description
            ? [element("p", [{ type: "text", value: metadata.description }])]
            : []),
        ];
        if (!metadata)
          copy.push(
            element("p", [{ type: "text", value: "Article unavailable" }], { role: "status" }),
          );
        return element("li", [
          element(
            "aside",
            [
              href
                ? element(
                    "a",
                    [
                      element("span", [], {
                        className: ["article-document-icon"],
                        ariaHidden: "true",
                      }),
                      element("div", copy, { className: ["article-card-copy"] }),
                    ],
                    { href, className: ["embed-link"] },
                  )
                : element("div", copy),
            ],
            { className: ["markdown-embed", "markdown-embed-wide", "markdown-embed-article"] },
          ),
        ]);
      }),
      { className: ["markdown-article-list", `markdown-embed-${embed.align}`] },
    );
  }
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
    case "annotation": {
      const start = embed.text.indexOf(embed.mark);
      return element(
        "figure",
        [
          element("p", [
            { type: "text", value: embed.text.slice(0, start) },
            element("mark", [{ type: "text", value: embed.mark }], {
              className: ["annotation-mark"],
            }),
            { type: "text", value: embed.text.slice(start + embed.mark.length) },
          ]),
          element(
            "figcaption",
            [
              element("svg", [element("path", [], { d: "" })], {
                viewBox: "0 0 44 30",
                ariaHidden: "true",
              }),
              element(
                embed.url ? "a" : "span",
                [{ type: "text", value: embed.note }],
                embed.url ? { href: embed.url } : {},
              ),
            ],
            { className: ["annotation-note"] },
          ),
        ],
        { className: [...properties.className, "annotation-anchor", `annotation-${embed.color}`] },
      );
    }
    case "quote":
      return element(
        "figure",
        [
          element(
            "blockquote",
            [element("p", [{ type: "text", value: embed.text }])],
            embed.url ? { cite: embed.url } : {},
          ),
          element("figcaption", [
            { type: "text", value: embed.author },
            ...(embed.title
              ? [
                  { type: "text" as const, value: " · " },
                  element("cite", [{ type: "text", value: embed.title }]),
                ]
              : []),
            ...(embed.url
              ? [
                  { type: "text" as const, value: " · " },
                  element("a", [{ type: "text", value: embed.url }], {
                    href: embed.url,
                    target: "_blank",
                    rel: ["noopener", "noreferrer"],
                  }),
                ]
              : []),
          ]),
        ],
        properties,
      );
    case "diff":
      return element(
        "figure",
        [
          element("figcaption", [{ type: "text", value: embed.title }]),
          element(
            "pre",
            [
              element(
                "code",
                embed.lines.map((line) =>
                  element("span", [{ type: "text", value: `${line.text}\n` }], {
                    className: [`diff-${line.kind}`],
                  }),
                ),
              ),
            ],
            { tabIndex: 0, role: "region", ariaLabel: embed.title },
          ),
        ],
        properties,
      );
    case "media": {
      const mediaSrc = embed.src.replace(
        /^https:\/\/github\.com\/([^/]+)\/([^/]+)\/blob\//u,
        "https://raw.githubusercontent.com/$1/$2/",
      );
      const preview = embed.type === "video" && embed.poster === null;
      const src = preview && !mediaSrc.includes("#") ? `${mediaSrc}#t=0.001` : mediaSrc;
      const player = element(
        embed.type,
        [
          element("a", [{ type: "text", value: "Open media" }], {
            href: mediaSrc,
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
      const diagrams = [false, true].map((compact) => {
        const layout = layoutArchitecture(embed, compact);
        const nodes = layout.nodes.map((node) =>
          element(
            "g",
            [
              element("rect", [], {
                x: String(node.x),
                y: String(node.y),
                width: 160,
                height: 80,
                rx: String(12),
              }),
              element("text", [{ type: "text", value: node.label }], {
                x: String(node.x + 80),
                y: String(node.y + 45),
                textAnchor: "middle",
                className: ["th"],
              }),
            ],
            {
              className: [
                "node",
                node.level % 3 === 0 ? "c-blue" : node.level % 3 === 1 ? "c-green" : "c-amber",
              ],
            },
          ),
        );
        const edges = layout.edges.map((edge) =>
          element("path", [], { className: ["arr"], d: edge.path }),
        );
        return element(
          "svg",
          [
            element("title", [{ type: "text", value: "Architecture flow" }]),
            element("desc", [
              {
                type: "text",
                value: "An architecture diagram grouped by dependency.",
              },
            ]),
            ...edges,
            ...nodes,
          ],
          {
            viewBox: `0 0 ${layout.width} ${layout.height}`,
            width: layout.width,
            height: layout.height,
            role: "img",
            className: [compact ? "architecture-compact" : "architecture-wide"],
          },
        );
      });
      return element("figure", diagrams, {
        className: [...properties.className, "markdown-embed-svg", "architecture-flow"],
      });
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
