import { fromHtml } from "hast-util-from-html";
import { visit } from "unist-util-visit";
import { z } from "zod";
import type { CardData } from "@my-knowledge/ui";

const repository = z.object({
  description: z.string().nullable(),
  language: z.string().nullable(),
  stargazers_count: z.number().int().nonnegative(),
  forks_count: z.number().int().nonnegative(),
  open_issues_count: z.number().int().nonnegative(),
  owner: z.object({
    avatar_url: z
      .url()
      .refine((value) => new URL(value).origin === "https://avatars.githubusercontent.com"),
  }),
});
const tweet = z.object({ author_name: z.string().min(1), html: z.string().min(1) });
const twitterCard = z.object({ kind: z.literal("twitter"), author: z.string(), text: z.string() });

function parseTweet(data: unknown): Extract<CardData, { kind: "twitter" }> {
  const item = tweet.parse(data);
  const tree = fromHtml(item.html, { fragment: true });
  const quote = tree.children.find(
    (node) => node.type === "element" && node.tagName === "blockquote",
  );
  const paragraph =
    quote?.type === "element"
      ? quote.children.find((node) => node.type === "element" && node.tagName === "p")
      : undefined;
  if (!paragraph) throw new ProviderError("Post body is missing");
  let text = "";
  visit(paragraph, (node) => {
    if (node.type === "element" && ["script", "style"].includes(node.tagName)) return "skip";
    if (node.type === "text") text += node.value;
    if (node.type === "element" && node.tagName === "br") text += "\n";
  });
  if (!text.trim()) throw new ProviderError("Post body is empty");
  return { kind: "twitter", author: item.author_name, text: text.trim() };
}

const chart = z.object({
  chart: z.object({
    error: z.null(),
    result: z
      .array(
        z.object({
          meta: z.object({ shortName: z.string().optional(), currency: z.string().min(1) }),
          timestamp: z.array(z.number().int().nonnegative().max(253402300799)),
          indicators: z.object({
            quote: z
              .array(z.object({ close: z.array(z.number().nonnegative().nullable()) }))
              .min(1),
          }),
        }),
      )
      .min(1),
  }),
});

export class ProviderError extends Error {}

function repositoryCard(item: z.infer<typeof repository>): CardData {
  return {
    kind: "github",
    description: item.description === null ? "" : item.description,
    language: item.language === null ? "No primary language" : item.language,
    avatar: item.owner.avatar_url,
    stars: item.stargazers_count,
    forks: item.forks_count,
    issues: item.open_issues_count,
  };
}

export function publicLink(url: URL) {
  const host = url.hostname.replace(/\.$/u, "");
  return (
    ["http:", "https:"].includes(url.protocol) &&
    !url.username &&
    !url.password &&
    !url.port &&
    host.includes(".") &&
    !/^[\d.]+$/u.test(host) &&
    !host.includes(":") &&
    !/(^|\.)(localhost|local|internal|invalid|test)$/u.test(host)
  );
}

const linkCard = z.object({
  kind: z.literal("link"),
  url: z.url().refine((value) => publicLink(new URL(value))),
  title: z.string(),
  description: z.string(),
  site: z.string(),
  image: z
    .url()
    .refine((value) => publicLink(new URL(value)))
    .nullable(),
});

function parseLink(html: string, url: URL): Extract<CardData, { kind: "link" }> {
  const tree = fromHtml(html);
  const root = tree.children.find((node) => node.type === "element" && node.tagName === "html");
  if (root?.type !== "element") throw new ProviderError("Link HTML has no document");
  const head = root.children.find((node) => node.type === "element" && node.tagName === "head");
  if (head?.type !== "element") throw new ProviderError("Link HTML has no head");
  const tags = new Map<string, string>();
  let title = "";
  for (const node of head.children) {
    if (node.type !== "element") continue;
    if (node.tagName === "title")
      title = node.children
        .filter((child) => child.type === "text")
        .map((child) => child.value)
        .join("")
        .trim();
    if (node.tagName !== "meta") continue;
    const name = node.properties.property || node.properties.name;
    const content = node.properties.content;
    if (
      typeof name === "string" &&
      typeof content === "string" &&
      content.trim() &&
      !tags.has(name.toLowerCase())
    )
      tags.set(name.toLowerCase(), content.trim());
  }
  const image = tags.get("og:image");
  const imageUrl = image && URL.canParse(image, url) ? new URL(image, url) : null;
  return {
    kind: "link",
    url: url.href,
    title: tags.get("og:title") || title || url.hostname,
    description: tags.get("og:description") || tags.get("description") || "",
    site: tags.get("og:site_name") || url.hostname,
    image: imageUrl !== null && publicLink(imageUrl) ? imageUrl.href : null,
  };
}

function stockCard(data: unknown, id: string): CardData {
  const item = chart.parse(data).chart.result[0];
  const quote = item?.indicators.quote[0];
  if (!item || !quote) throw new ProviderError("Stock chart is missing");
  const points = item.timestamp
    .flatMap((time, index) => {
      const price = quote.close[index];
      return price === null || price === undefined ? [] : [{ time, price }];
    })
    .sort((a, b) => a.time - b.time);
  if (points.length < 2) throw new ProviderError("Stock chart has fewer than two prices");
  return {
    kind: "stock",
    name: item.meta.shortName === undefined ? id : item.meta.shortName,
    currency: item.meta.currency,
    points,
  };
}

async function urlKey(value: string): Promise<string> {
  const digest = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(value));
  return Array.from(new Uint8Array(digest), (byte) => byte.toString(16).padStart(2, "0")).join("");
}

export type CardProvider = {
  cacheKey(id: string): string | Promise<string>;
  address(id: string): string;
  accept: string;
  redirects: boolean;
  contentTypes: readonly string[];
  ttl: number;
  unavailable: string;
  parse(text: string, address: URL): unknown;
  render(data: unknown, id: string): CardData;
  rateLimit?: { matches(response: Response): boolean; message: string };
};

export const cardProviders = {
  github: {
    cacheKey: (id) => id.toLowerCase(),
    address: (id) => `https://api.github.com/repos/${id}`,
    accept: "application/json",
    redirects: false,
    contentTypes: [],
    ttl: 3600,
    unavailable: "Repository details are unavailable. Open GitHub to view the repository.",
    parse: (text) => repository.parse(JSON.parse(text)),
    render: (data) => repositoryCard(repository.parse(data)),
    rateLimit: {
      matches: (response) =>
        response.status === 429 ||
        (response.status === 403 && response.headers.get("x-ratelimit-remaining") === "0"),
      message: "GitHub API rate limit reached. Please try again later.",
    },
  },
  stock: {
    cacheKey: (id) => id,
    address: (id) =>
      `https://query1.finance.yahoo.com/v8/finance/chart/${encodeURIComponent(id)}?range=1mo&interval=1d`,
    accept: "application/json",
    redirects: false,
    contentTypes: [],
    ttl: 300,
    unavailable: "Stock prices are unavailable. Open Yahoo Finance to view the quote.",
    parse: (text) => JSON.parse(text),
    render: stockCard,
  },
  link: {
    cacheKey: urlKey,
    address: (id) => id,
    accept: "text/html, application/xhtml+xml",
    redirects: true,
    contentTypes: ["text/html", "application/xhtml+xml"],
    ttl: 3600,
    unavailable: "Link preview is unavailable. Open the source to read the page.",
    parse: parseLink,
    render: (data) => linkCard.parse(data),
  },
  twitter: {
    cacheKey: urlKey,
    address: (id) =>
      `https://publish.x.com/oembed?${new URLSearchParams({ url: id, omit_script: "true", dnt: "true", hide_thread: "true" })}`,
    accept: "application/json",
    redirects: false,
    contentTypes: [],
    ttl: 3600,
    unavailable: "Post preview is unavailable. Open X / Twitter to read the post.",
    parse: (text) => parseTweet(JSON.parse(text)),
    render: (data) => twitterCard.parse(data),
  },
} satisfies Record<string, CardProvider>;

export type CardProviderKind = keyof typeof cardProviders;
