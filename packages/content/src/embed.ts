import type { Element } from "hast";
import { fromHtml } from "hast-util-from-html";
import { sanitize } from "hast-util-sanitize";

type Alignment = "left" | "right" | "wide";
export type MarkdownEmbed = { align: Alignment } & (
  | { kind: "github"; repo: string }
  | { kind: "stock"; code: string }
  | { kind: "link"; url: string }
  | {
      kind: "media";
      type: "audio" | "video";
      src: string;
      poster: string | null;
      title: string;
      caption: string | null;
    }
  | {
      kind: "architecture";
      nodes: { id: string; label: string }[];
      edges: { from: string; to: string }[];
    }
  | { kind: "storyboard"; title: string; steps: { heading: string; body: string }[] }
  | { kind: "svg"; profile: "architecture" | "storyboard"; tree: Element }
);

function parseAlignment(value = "wide"): Alignment {
  if (value === "left" || value === "right" || value === "wide") return value;
  throw new Error("Embed alignment must be left, right, or wide");
}

function parseFields(source: string): [string, string][] {
  return source.split(/\r?\n/u).flatMap((raw, index) => {
    if (!raw.trim()) return [];
    const separator = raw.indexOf(":");
    const field = raw.slice(0, separator).trim();
    const value = raw
      .slice(separator + 1)
      .trim()
      .replace(/^(["'])(.*)\1$/u, "$2");
    if (separator < 1 || !field || !value) {
      throw new Error(`Embed line ${index + 1} requires field: value`);
    }
    return [[field, value]];
  });
}

function parseCanvas(source: string): Element {
  const tree = fromHtml(source, { fragment: true });
  const nodes = tree.children.filter((node) => node.type !== "text" || node.value.trim());
  const svg = nodes[0];
  if (nodes.length !== 1 || svg?.type !== "element" || svg.tagName !== "svg") {
    throw new Error("Embed canvas requires one SVG document");
  }
  const clean = sanitize(svg, {
    tagNames: [
      "svg",
      "title",
      "desc",
      "g",
      "path",
      "rect",
      "circle",
      "ellipse",
      "line",
      "polyline",
      "polygon",
      "text",
      "tspan",
    ],
    strip: ["script", "style", "foreignObject", "image", "use"],
    attributes: {
      "*": [
        [
          "className",
          /^(?:node|c-(?:teal|purple|coral|blue|green|amber|red|gray)|th|t|ts|box|leader|hand|title|caption|step|note|arr|arrow|arrow-shadow|sketch|sketch-shadow|scribble|accent|muted|fill-(?:blue|violet|green|orange))$/u,
        ],
        "x",
        "y",
        "dx",
        "dy",
        "x1",
        "y1",
        "x2",
        "y2",
        "cx",
        "cy",
        "r",
        "rx",
        "ry",
        "width",
        "height",
        "d",
        "points",
        "transform",
        "opacity",
        "fillOpacity",
        "strokeOpacity",
        "strokeWidth",
        "strokeLinecap",
        "strokeLinejoin",
        "strokeDasharray",
        "textAnchor",
        "dominantBaseline",
        "fontSize",
        ["fill", /^(?:#[\da-f]{3,8}|[a-z]+)$/iu],
        ["stroke", /^(?:#[\da-f]{3,8}|[a-z]+)$/iu],
      ],
      svg: ["viewBox", "role", "preserveAspectRatio"],
    },
  });
  if (clean.type !== "element" || !clean.properties.viewBox) {
    throw new Error("Embed SVG requires a viewBox");
  }
  for (const name of ["title", "desc"]) {
    if (
      !clean.children.some(
        (node) =>
          node.type === "element" &&
          node.tagName === name &&
          node.children.some((child) => child.type === "text" && child.value.trim()),
      )
    ) {
      throw new Error("Embed SVG requires nonempty title and desc elements");
    }
  }
  clean.properties.role = "img";
  return clean;
}

/** Parses the embed namespace; ordinary fenced languages remain ordinary code. */
export function parseMarkdownEmbed(language: string, source: string): MarkdownEmbed | undefined {
  const kind = language.toLowerCase();
  if (!kind.startsWith("embed:")) return undefined;
  if (
    ![
      "embed:github",
      "embed:stock",
      "embed:link",
      "embed:media",
      "embed:architecture",
      "embed:storyboard",
    ].includes(kind)
  ) {
    throw new Error(`Unsupported embed kind: ${language}`);
  }
  if (kind === "embed:architecture" || kind === "embed:storyboard") {
    const lines = source.trim().split(/\r?\n/u);
    let align: Alignment = "wide";
    if (lines[0]?.trim().startsWith("align:")) {
      const first = lines.shift();
      if (first) align = parseAlignment(parseFields(first)[0]?.[1]);
    }
    const body = lines.join("\n").trim();
    if (body.startsWith("<svg"))
      return {
        kind: "svg",
        profile: kind === "embed:architecture" ? "architecture" : "storyboard",
        align,
        tree: parseCanvas(body),
      };
    if (kind === "embed:architecture") {
      const diagram = body
        .split("\n")
        .map((line) => line.trim())
        .filter(Boolean);
      const header = diagram.shift();
      if ((header !== "flowchart LR" && header !== "graph LR") || diagram.length === 0) {
        throw new Error(
          "Architecture requires an SVG canvas or a flowchart LR diagram with an edge",
        );
      }
      const nodes = new Map<string, { id: string; label: string }>();
      const edges: { from: string; to: string }[] = [];
      for (const edge of diagram) {
        const endpoints = edge.split("-->").map((node) => node.trim());
        if (endpoints.length !== 2) {
          throw new Error("Architecture edges require node --> node, with optional [labels]");
        }
        const parsed = endpoints.map((value) => {
          const match = /^([^\][\n]+?)(?:\[([^\][\n]+)\])?$/u.exec(value);
          const id = match?.[1]?.trim();
          const label = match?.[2]?.trim();
          if (!id || (match?.[2] !== undefined && !label))
            throw new Error("Architecture nodes require a nonempty ID and label");
          const node = { id, label: label === undefined ? id : label };
          if (!nodes.has(id)) nodes.set(id, node);
          return node;
        });
        const [from, to] = parsed;
        if (!from || !to) throw new Error("Architecture edge endpoints are missing");
        edges.push({ from: from.id, to: to.id });
      }
      if (nodes.size < 2) throw new Error("Architecture requires at least two nodes");
      return { kind: "architecture", align, nodes: [...nodes.values()], edges };
    }
  }
  const fields = new Map<string, string>();
  const steps: { heading: string; body: string }[] = [];
  const allowed =
    kind === "embed:link"
      ? ["url", "align"]
      : kind === "embed:github"
        ? ["repo", "align"]
        : kind === "embed:stock"
          ? ["code", "align"]
          : kind === "embed:media"
            ? ["type", "src", "poster", "title", "caption", "align"]
            : ["title", "step", "align"];
  for (const [field, value] of parseFields(source)) {
    if (!allowed.includes(field)) throw new Error(`Unsupported ${kind} field: ${field}`);
    if (field === "step") {
      const separator = value.indexOf("|");
      const heading = value.slice(0, separator).trim();
      const body = value.slice(separator + 1).trim();
      if (separator < 1 || !heading || !body)
        throw new Error("Storyboard steps require heading | description");
      steps.push({ heading, body });
    } else {
      if (fields.has(field)) throw new Error(`Duplicate embed field: ${field}`);
      fields.set(field, value);
    }
  }
  const align = parseAlignment(fields.get("align"));
  if (kind === "embed:media") {
    const type = fields.get("type");
    if (type !== "audio" && type !== "video") throw new Error("Media type must be audio or video");
    const source = fields.get("src");
    if (!source) throw new Error("Media requires a src field");
    const src = parseMediaSource(source);
    const image = fields.get("poster");
    if (type === "audio" && image !== undefined) throw new Error("Only video supports a poster");
    const poster = image === undefined ? null : parseMediaSource(image);
    const title = fields.get("title");
    const caption = fields.get("caption");
    return {
      kind: "media",
      type,
      src,
      poster,
      align,
      title: title === undefined ? (type === "audio" ? "Audio player" : "Video player") : title,
      caption: caption === undefined ? null : caption,
    };
  }
  if (kind === "embed:link") {
    const value = fields.get("url");
    if (!value || !URL.canParse(value)) throw new Error("Link embeds require a valid HTTP(S) URL");
    const url = new URL(value);
    if (!["http:", "https:"].includes(url.protocol) || url.username || url.password) {
      throw new Error("Link embeds require an HTTP(S) URL without credentials");
    }
    return { kind: "link", align, url: url.href };
  }
  if (kind === "embed:github") {
    const repo = fields.get("repo");
    if (
      !repo ||
      !/^[\w.-]{1,39}\/[\w.-]{1,100}$/u.test(repo) ||
      repo.split("/").some((part) => part === "." || part === "..")
    ) {
      throw new Error("GitHub embeds require repo: owner/name");
    }
    return { kind: "github", align, repo };
  }
  if (kind === "embed:stock") {
    const code = fields.get("code")?.toUpperCase();
    if (!code || !/^[A-Z0-9.^=:-]{1,20}$/u.test(code))
      throw new Error("Stock embeds require a valid code field");
    return { kind: "stock", align, code };
  }
  const title = fields.get("title");
  if (!title || steps.length < 2 || steps.length > 6)
    throw new Error("Storyboard requires a title and two to six steps");
  return { kind: "storyboard", align, title, steps };
}

function parseMediaSource(value: string): string {
  if (!value || /[\p{Cc}\\]/u.test(value)) {
    throw new Error("Media requires an HTTP(S) URL or document-relative asset path");
  }
  if (URL.canParse(value)) {
    const url = new URL(value);
    if (
      !["https:", "http:"].includes(url.protocol) ||
      !url.hostname ||
      url.username ||
      url.password
    ) {
      throw new Error("Media requires an HTTP(S) URL without credentials");
    }
    return url.href;
  }
  if (
    /^[a-z][a-z\d+.-]*:/iu.test(value) ||
    value.startsWith("/") ||
    value.startsWith("~") ||
    /[?#]/u.test(value)
  ) {
    throw new Error("Local media requires a document-relative asset path");
  }
  return Array.from(value, (character) =>
    /[\u0020"<>`{}\u0080-\u{10ffff}]/u.test(character) ? encodeURIComponent(character) : character,
  ).join("");
}
