import { fromHtml } from "hast-util-from-html";
import { cache } from "react";
import { z } from "zod";
import type { MarkdownEmbed } from "@my-knowledge/content";
import { renderMarkdownEmbed, type CardData } from "@my-knowledge/ui";

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

class ProviderError extends Error {}

function publicLink(url: URL) {
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

function parseLink(html: string, url: URL): CardData {
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

const readCard = cache(async (kind: "github" | "stock" | "link", id: string): Promise<CardData> => {
  const url =
    kind === "github"
      ? `https://api.github.com/repos/${id}`
      : kind === "stock"
        ? `https://query1.finance.yahoo.com/v8/finance/chart/${encodeURIComponent(id)}?range=1mo&interval=1d`
        : id;
  try {
    let address = new URL(url);
    const options = {
      signal: AbortSignal.timeout(6000),
      redirect: "manual",
      headers: {
        Accept: kind === "link" ? "text/html, application/xhtml+xml" : "application/json",
        "User-Agent": "my-knowledge",
      },
    } satisfies RequestInit;
    if (kind === "link" && !publicLink(address))
      throw new ProviderError("Link must use a public HTTP(S) hostname");
    let response = await fetch(address.href, options);
    if (kind === "link") {
      for (let count = 0; [301, 302, 303, 307, 308].includes(response.status); count++) {
        const location = response.headers.get("location");
        await response.body?.cancel();
        if (count === 5 || location === null || !URL.canParse(location, address))
          throw new ProviderError("Link redirect is invalid");
        address = new URL(location, address);
        if (!publicLink(address)) throw new ProviderError("Link redirect is not public");
        response = await fetch(address.href, options);
      }
      const mime = response.headers.get("content-type")?.split(";")[0]?.trim().toLowerCase();
      if (mime !== "text/html" && mime !== "application/xhtml+xml")
        throw new ProviderError("Link response is not HTML");
    }
    if (!response.ok) throw new ProviderError("Provider request failed");
    const reader = response.body?.getReader();
    if (!reader) throw new ProviderError("Provider response is empty");
    const chunks: Uint8Array[] = [];
    let size = 0;
    try {
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        size += value.length;
        if (size > 524288) {
          await reader.cancel();
          throw new ProviderError("Provider response is too large");
        }
        chunks.push(value);
      }
    } finally {
      reader.releaseLock();
    }
    const bytes = new Uint8Array(size);
    let offset = 0;
    for (const chunk of chunks) {
      bytes.set(chunk, offset);
      offset += chunk.length;
    }
    const text = new TextDecoder().decode(bytes);
    if (kind === "link") return parseLink(text, address);
    if (kind === "github") {
      const item = repository.parse(JSON.parse(text));
      return {
        kind,
        description: item.description === null ? "" : item.description,
        language: item.language === null ? "No primary language" : item.language,
        avatar: item.owner.avatar_url,
        stars: item.stargazers_count,
        forks: item.forks_count,
        issues: item.open_issues_count,
      };
    }
    const item = chart.parse(JSON.parse(text)).chart.result[0];
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
      kind,
      name: item.meta.shortName === undefined ? id : item.meta.shortName,
      currency: item.meta.currency,
      points,
    };
  } catch (error) {
    if (
      !(error instanceof ProviderError) &&
      !(error instanceof TypeError) &&
      !(error instanceof SyntaxError) &&
      !(error instanceof DOMException) &&
      !(error instanceof z.ZodError)
    )
      throw error;
    return {
      kind: "error",
      message:
        kind === "github"
          ? "Repository details are unavailable. Open GitHub to view the repository."
          : kind === "stock"
            ? "Stock prices are unavailable. Open Yahoo Finance to view the quote."
            : "Link preview is unavailable. Open the source to read the page.",
    };
  }
});

export async function readEmbed(embed: MarkdownEmbed) {
  if (embed.kind === "link") return renderMarkdownEmbed(embed, await readCard("link", embed.url));
  if (embed.kind === "github")
    return renderMarkdownEmbed(embed, await readCard("github", embed.repo));
  if (embed.kind === "stock")
    return renderMarkdownEmbed(embed, await readCard("stock", embed.code));
  return renderMarkdownEmbed(embed);
}
