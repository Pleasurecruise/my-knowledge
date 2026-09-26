import type { Element } from "hast";
import { fromHtml } from "hast-util-from-html";
import { sanitize } from "hast-util-sanitize";
import { parseDiff } from "./diff";
import { MarkdownEmbedError } from "./embed-error";

export { MarkdownEmbedError } from "./embed-error";

type Alignment = "left" | "right" | "wide" | "narrow";
export type MarkdownEmbed = { align: Alignment } & (
  | { kind: "github"; repo: string }
  | { kind: "stock"; code: string }
  | { kind: "link"; url: string }
  | { kind: "twitter"; url: string }
  | { kind: "articleList"; urls: string[] }
  | {
      kind: "annotation";
      text: string;
      mark: string;
      note: string;
      color: "blue" | "red" | "green" | "amber" | "purple";
      url: string | null;
    }
  | { kind: "quote"; text: string; author: string; title: string | null; url: string | null }
  | {
      kind: "diff";
      title: string;
      lines: { text: string; kind: "add" | "remove" | "context" | "header" }[];
    }
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
  if (value === "left" || value === "right" || value === "wide" || value === "narrow") return value;
  throw new MarkdownEmbedError("Embed alignment must be left, right, wide, or narrow");
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
      throw new MarkdownEmbedError(`Embed line ${index + 1} requires field: value`);
    }
    return [[field, value]];
  });
}

function parseCanvas(source: string): Element {
  const tree = fromHtml(source, { fragment: true });
  const nodes = tree.children.filter((node) => node.type !== "text" || node.value.trim());
  const svg = nodes[0];
  if (nodes.length !== 1 || svg?.type !== "element" || svg.tagName !== "svg") {
    throw new MarkdownEmbedError("Embed canvas requires one SVG document");
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
    throw new MarkdownEmbedError("Embed SVG requires a viewBox");
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
      throw new MarkdownEmbedError("Embed SVG requires nonempty title and desc elements");
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
      "embed:twitter",
      "embed:stock",
      "embed:link",
      "embed:article",
      "embed:media",
      "embed:architecture",
      "embed:storyboard",
      "embed:annotation",
      "embed:quote",
      "embed:diff",
    ].includes(kind)
  ) {
    throw new MarkdownEmbedError(`Unsupported embed kind: ${language}`);
  }
  if (kind === "embed:annotation" || kind === "embed:quote" || kind === "embed:diff") {
    const lines = source.replace(/\r\n/gu, "\n").split("\n");
    const separator = lines.indexOf("---");
    if (separator < 0)
      throw new MarkdownEmbedError("This embed requires metadata, then --- and a body");
    const fields = new Map<string, string>();
    const allowed =
      kind === "embed:annotation"
        ? ["mark", "note", "color", "url", "align"]
        : kind === "embed:quote"
          ? ["author", "title", "url", "align"]
          : ["title", "align"];
    for (const [field, value] of parseFields(lines.slice(0, separator).join("\n"))) {
      if (!allowed.includes(field))
        throw new MarkdownEmbedError(`Unsupported ${kind} field: ${field}`);
      if (fields.has(field)) throw new MarkdownEmbedError(`Duplicate embed field: ${field}`);
      fields.set(field, value);
    }
    const body = lines.slice(separator + 1).join("\n");
    if (!body.trim()) throw new MarkdownEmbedError("Embed body must not be empty");
    const align = parseAlignment(fields.get("align"));
    if (kind === "embed:quote" || kind === "embed:annotation") {
      const value = fields.get("url");
      let url: string | null = null;
      if (value !== undefined) {
        if (!URL.canParse(value) || /[\s\p{Cc}]/u.test(value))
          throw new MarkdownEmbedError("Invalid source URL");
        const parsed = new URL(value);
        if (!["https:", "http:"].includes(parsed.protocol) || parsed.username || parsed.password)
          throw new MarkdownEmbedError("Source URL must use HTTP(S) without credentials");
        url = parsed.href;
      }
      if (kind === "embed:annotation") {
        const mark = fields.get("mark");
        const note = fields.get("note");
        const color = fields.get("color") ?? "blue";
        if (!mark || !note) throw new MarkdownEmbedError("Annotation requires mark and note");
        if (!body.includes(mark) || body.indexOf(mark) !== body.lastIndexOf(mark))
          throw new MarkdownEmbedError("Annotation mark must occur exactly once in the body");
        if (
          color !== "blue" &&
          color !== "red" &&
          color !== "green" &&
          color !== "amber" &&
          color !== "purple"
        )
          throw new MarkdownEmbedError(
            "Annotation color must be blue, red, green, amber, or purple",
          );
        return { kind: "annotation", align, text: body, mark, note, color, url };
      }
      const author = fields.get("author");
      if (!author) throw new MarkdownEmbedError("Quote requires an author");
      return { kind: "quote", align, author, title: fields.get("title") ?? null, url, text: body };
    }
    const title = fields.get("title");
    if (!title) throw new MarkdownEmbedError("Diff requires a title");
    return { kind: "diff", align, title, lines: parseDiff(body) };
  }
  if (kind === "embed:article") {
    const lines = source
      .split(/\r?\n/u)
      .map((line) => line.trim())
      .filter(Boolean);
    let align: Alignment | undefined;
    const urls: string[] = [];
    let usesUrlField = false;
    for (const line of lines) {
      if (/^align\s*:/u.test(line)) {
        if (align !== undefined)
          throw new MarkdownEmbedError("Duplicate embed:article field: align");
        align = parseAlignment(parseFields(line)[0]?.[1]);
        continue;
      }
      const isUrlField = /^url\s*:/u.test(line);
      if ((isUrlField && urls.length > 0) || (!isUrlField && usesUrlField))
        throw new MarkdownEmbedError("Article fences require one url field or a URL list");
      usesUrlField = isUrlField;
      const value = isUrlField ? parseFields(line)[0]?.[1] : line.replace(/^[-*+]\s+/u, "");
      if (!value || !URL.canParse(value) || /[\s\p{Cc}]/u.test(value))
        throw new MarkdownEmbedError("Invalid article list URL");
      const url = new URL(value);
      if (
        !["http:", "https:"].includes(url.protocol) ||
        !url.hostname ||
        url.username ||
        url.password
      )
        throw new MarkdownEmbedError("Article URL must use HTTP(S) without credentials");
      try {
        decodeURIComponent(url.pathname);
      } catch {
        throw new MarkdownEmbedError("Article URL requires valid percent encoding");
      }
      urls.push(url.href);
    }
    if (urls.length === 0 || urls.length > 50)
      throw new MarkdownEmbedError("Article lists require 1–50 URLs");
    return { kind: "articleList", align: align ?? "wide", urls };
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
        throw new MarkdownEmbedError(
          "Architecture requires an SVG canvas or a flowchart LR diagram with an edge",
        );
      }
      const nodes = new Map<string, { id: string; label: string }>();
      const edges: { from: string; to: string }[] = [];
      for (const edge of diagram) {
        const endpoints = edge.split("-->").map((node) => node.trim());
        if (endpoints.length !== 2) {
          throw new MarkdownEmbedError(
            "Architecture edges require node --> node, with optional [labels]",
          );
        }
        const parsed = endpoints.map((value) => {
          const match = /^([^\][\n]+?)(?:\[([^\][\n]+)\])?$/u.exec(value);
          const id = match?.[1]?.trim();
          const label = match?.[2]?.trim();
          if (!id || (match?.[2] !== undefined && !label))
            throw new MarkdownEmbedError("Architecture nodes require a nonempty ID and label");
          const node = { id, label: label === undefined ? id : label };
          if (!nodes.has(id)) nodes.set(id, node);
          return node;
        });
        const [from, to] = parsed;
        if (!from || !to) throw new MarkdownEmbedError("Architecture edge endpoints are missing");
        edges.push({ from: from.id, to: to.id });
      }
      if (nodes.size < 2) throw new MarkdownEmbedError("Architecture requires at least two nodes");
      return { kind: "architecture", align, nodes: [...nodes.values()], edges };
    }
  }
  const fields = new Map<string, string>();
  const steps: { heading: string; body: string }[] = [];
  const fieldContracts: Record<string, readonly string[]> = {
    "embed:link": ["url", "align"],
    "embed:twitter": ["url", "align"],
    "embed:github": ["repo", "align"],
    "embed:stock": ["code", "align"],
    "embed:media": ["type", "src", "poster", "title", "caption", "align"],
    "embed:storyboard": ["title", "step", "align"],
  };
  const allowed = fieldContracts[kind];
  if (!allowed) throw new MarkdownEmbedError(`Unsupported field-based embed: ${language}`);
  for (const [field, value] of parseFields(source)) {
    if (!allowed.includes(field))
      throw new MarkdownEmbedError(`Unsupported ${kind} field: ${field}`);
    if (field === "step") {
      const separator = value.indexOf("|");
      const heading = value.slice(0, separator).trim();
      const body = value.slice(separator + 1).trim();
      if (separator < 1 || !heading || !body)
        throw new MarkdownEmbedError("Storyboard steps require heading | description");
      steps.push({ heading, body });
    } else {
      if (fields.has(field)) throw new MarkdownEmbedError(`Duplicate embed field: ${field}`);
      fields.set(field, value);
    }
  }
  const align = parseAlignment(fields.get("align"));
  if (kind === "embed:media") {
    const type = fields.get("type");
    if (type !== "audio" && type !== "video")
      throw new MarkdownEmbedError("Media type must be audio or video");
    const source = fields.get("src");
    if (!source) throw new MarkdownEmbedError("Media requires a src field");
    const src = parseMediaSource(source);
    const image = fields.get("poster");
    if (type === "audio" && image !== undefined)
      throw new MarkdownEmbedError("Only video supports a poster");
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
  if (kind === "embed:twitter") {
    const value = fields.get("url");
    if (!value || !URL.canParse(value) || /[\s\p{Cc}\\]/u.test(value))
      throw new MarkdownEmbedError("Twitter embeds require a post URL");
    const url = new URL(value);
    const match = /^\/([A-Za-z0-9_]{1,15})\/status\/([1-9][0-9]{0,19})\/?$/u.exec(url.pathname);
    if (
      url.protocol !== "https:" ||
      url.username ||
      url.password ||
      url.port ||
      !["x.com", "www.x.com", "twitter.com", "www.twitter.com", "mobile.twitter.com"].includes(
        url.hostname,
      ) ||
      !match
    )
      throw new MarkdownEmbedError("Twitter embeds require an HTTPS X/Twitter post URL");
    return {
      kind: "twitter",
      align,
      url: `https://x.com/${match[1]?.toLowerCase()}/status/${match[2]}`,
    };
  }
  if (kind === "embed:link") {
    const value = fields.get("url");
    if (!value || !URL.canParse(value))
      throw new MarkdownEmbedError("Link embeds require a valid HTTP(S) URL");
    const url = new URL(value);
    if (!["http:", "https:"].includes(url.protocol) || url.username || url.password) {
      throw new MarkdownEmbedError("Link embeds require an HTTP(S) URL without credentials");
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
      throw new MarkdownEmbedError("GitHub embeds require repo: owner/name");
    }
    return { kind: "github", align, repo };
  }
  if (kind === "embed:stock") {
    const code = fields.get("code")?.toUpperCase();
    if (!code || !/^[A-Z0-9.^=:-]{1,20}$/u.test(code))
      throw new MarkdownEmbedError("Stock embeds require a valid code field");
    return { kind: "stock", align, code };
  }
  const title = fields.get("title");
  if (!title || steps.length < 2 || steps.length > 6)
    throw new MarkdownEmbedError("Storyboard requires a title and two to six steps");
  return { kind: "storyboard", align, title, steps };
}

function parseMediaSource(value: string): string {
  if (!value || /[\p{Cc}\\]/u.test(value)) {
    throw new MarkdownEmbedError("Media requires an HTTP(S) URL or document-relative asset path");
  }
  if (URL.canParse(value)) {
    const url = new URL(value);
    if (
      !["https:", "http:"].includes(url.protocol) ||
      !url.hostname ||
      url.username ||
      url.password
    ) {
      throw new MarkdownEmbedError("Media requires an HTTP(S) URL without credentials");
    }
    return url.href;
  }
  if (
    /^[a-z][a-z\d+.-]*:/iu.test(value) ||
    value.startsWith("/") ||
    value.startsWith("~") ||
    /[?#]/u.test(value)
  ) {
    throw new MarkdownEmbedError("Local media requires a document-relative asset path");
  }
  return Array.from(value, (character) =>
    /[\u0020"<>`{}\u0080-\u{10ffff}]/u.test(character) ? encodeURIComponent(character) : character,
  ).join("");
}
