import { getCloudflareContext } from "@opennextjs/cloudflare";
import { getPrincipal } from "../auth/owner";
import { getArticleRow } from "./persistence/document";
import { articleOrigin } from "./origin";
import { cache } from "react";
import { z } from "zod";
import type { MarkdownEmbed } from "@my-knowledge/content";
import { renderMarkdownEmbed, type ArticleCard, type CardData } from "@my-knowledge/ui";

import {
  cardProviders,
  ProviderError,
  publicLink,
  type CardProvider,
  type CardProviderKind,
} from "./card-providers";

const readCard = cache(async (kind: CardProviderKind, id: string): Promise<CardData> => {
  const { env } = await getCloudflareContext({ async: true });
  const provider: CardProvider = cardProviders[kind];
  const cacheKey = `embed:${kind}:${await provider.cacheKey(id)}`;
  const cached = await env.KNOWLEDGE_CACHE.get(cacheKey);
  if (cached !== null) return provider.render(JSON.parse(cached), id);
  const url = provider.address(id);
  try {
    let address = new URL(url);
    const options = {
      signal: AbortSignal.timeout(6000),
      redirect: "manual",
      headers: {
        Accept: provider.accept,
        "User-Agent": "my-knowledge",
      },
    } satisfies RequestInit;
    if (provider.redirects && !publicLink(address))
      throw new ProviderError("Link must use a public HTTP(S) hostname");
    let response: Response;
    for (let count = 0; ; count++) {
      try {
        response = await fetch(address.href, options);
      } catch (error) {
        if (error instanceof TypeError || error instanceof DOMException)
          throw new ProviderError("Provider request failed", { cause: error });
        throw error;
      }
      if (!provider.redirects || ![301, 302, 303, 307, 308].includes(response.status)) break;
      const location = response.headers.get("location");
      await response.body?.cancel();
      if (count === 5 || location === null || !URL.canParse(location, address))
        throw new ProviderError("Link redirect is invalid");
      address = new URL(location, address);
      if (!publicLink(address)) throw new ProviderError("Link redirect is not public");
    }
    if (provider.contentTypes.length) {
      const mime = response.headers.get("content-type")?.split(";")[0]?.trim().toLowerCase();
      if (!mime || !provider.contentTypes.includes(mime))
        throw new ProviderError("Link response is not HTML");
    }
    if (provider.rateLimit?.matches(response)) {
      await response.body?.cancel();
      return { kind: "error", message: provider.rateLimit.message };
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
    let data: unknown;
    try {
      data = provider.parse(text, address);
    } catch (error) {
      if (error instanceof SyntaxError)
        throw new ProviderError("Provider returned invalid JSON", { cause: error });
      throw error;
    }
    const card = provider.render(data, id);
    await env.KNOWLEDGE_CACHE.put(cacheKey, JSON.stringify(data), { expirationTtl: provider.ttl });
    return card;
  } catch (error) {
    if (!(error instanceof ProviderError) && !(error instanceof z.ZodError)) throw error;
    return { kind: "error", message: provider.unavailable };
  }
});

const readArticleCard = cache(async (value: string): Promise<ArticleCard | null> => {
  const url = new URL(value);
  const { env } = await getCloudflareContext({ async: true });
  if (url.origin !== new URL(env.BETTER_AUTH_URL).origin && url.origin !== articleOrigin)
    return null;
  const match = /^\/articles\/([^/]+)\/?$/u.exec(url.pathname);
  if (!match?.[1]) return null;
  const identity = decodeURIComponent(match[1]);
  const row = await getArticleRow(env, await getPrincipal(), identity);
  return row
    ? {
        href: `/articles/${encodeURIComponent(row.id)}${url.hash}`,
        title: row.title,
        description: row.summary,
      }
    : null;
});

export async function readEmbed(embed: MarkdownEmbed) {
  if (embed.kind === "articleList") {
    const items: (ArticleCard | null)[] = [];
    for (let index = 0; index < embed.urls.length; index += 4) {
      items.push(
        ...(await Promise.all(
          embed.urls.slice(index, index + 4).map((url) => readArticleCard(url)),
        )),
      );
    }
    return renderMarkdownEmbed(embed, { kind: "articleList", items });
  }
  if (embed.kind === "twitter")
    return renderMarkdownEmbed(embed, await readCard("twitter", embed.url));
  if (embed.kind === "link") return renderMarkdownEmbed(embed, await readCard("link", embed.url));
  if (embed.kind === "github")
    return renderMarkdownEmbed(embed, await readCard("github", embed.repo));
  if (embed.kind === "stock")
    return renderMarkdownEmbed(embed, await readCard("stock", embed.code));
  return renderMarkdownEmbed(embed);
}
