import type { Element } from "hast";
import { fromHtml } from "hast-util-from-html";
import { sanitize } from "hast-util-sanitize";

type Alignment = "left" | "right" | "wide";
export type MarkdownEmbed = { align: Alignment } & (
  | { kind: "github"; repo: string }
  | { kind: "stock"; code: string }
  | { kind: "architecture"; source: string }
  | { kind: "storyboard"; title: string; steps: { heading: string; body: string }[] }
  | { kind: "svg"; tree: Element }
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
          /^(?:node|c-(?:teal|purple|coral|blue|green|amber)|th|ts|hand|title|caption|step|note|arr|arrow|arrow-shadow|sketch-shadow|fill-(?:blue|violet|green|orange))$/u,
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
  if (!["embed:github", "embed:stock", "embed:architecture", "embed:storyboard"].includes(kind)) {
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
    if (body.startsWith("<svg")) return { kind: "svg", align, tree: parseCanvas(body) };
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
      for (const edge of diagram) {
        const nodes = edge.split("-->").map((node) => node.trim());
        if (
          nodes.length !== 2 ||
          !nodes.every((node) => /^[A-Za-z_][\w-]*(?:\[[^\][\n<>]+\])?$/u.test(node))
        ) {
          throw new Error("Architecture edges require node --> node, with optional [labels]");
        }
      }
      return { kind: "architecture", align, source: body };
    }
  }
  const fields = new Map<string, string>();
  const steps: { heading: string; body: string }[] = [];
  const allowed =
    kind === "embed:github"
      ? ["repo", "align"]
      : kind === "embed:stock"
        ? ["code", "align"]
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
