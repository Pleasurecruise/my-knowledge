import { env } from "cloudflare:workers";
import { getPrincipal } from "../auth/owner";
import { getArticleRow } from "./persistence/document";
import { articleOrigin } from "./origin";
import { fetchTweet, TwitterApiError, type Tweet } from "react-tweet/api";
import { z } from "zod";
import type { MarkdownEmbed } from "@my-knowledge/content";
import {
  renderMarkdownEmbed,
  type ArticleCard,
  type CardData,
  type ResolvedEmbed,
} from "@my-knowledge/ui";

import { requestCache } from "../request";

import {
  cardProviders,
  ProviderError,
  publicLink,
  type CardProvider,
  type CardProviderKind,
} from "./card-providers";

const readCard = requestCache(async (kind: CardProviderKind, id: string): Promise<CardData> => {
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
    if (!response.body) throw new ProviderError("Provider response is empty");
    let size = 0;
    const body = response.body.pipeThrough(
      new TransformStream<Uint8Array, Uint8Array>({
        transform(chunk, controller) {
          size += chunk.byteLength;
          if (size > 524288) throw new ProviderError("Provider response is too large");
          controller.enqueue(chunk);
        },
      }),
    );
    const text = await new Response(body).text();
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

const readTweet = requestCache(async (id: string): Promise<Tweet | undefined> => {
  const key = `embed:twitter:${id}`;
  const cached = await env.KNOWLEDGE_CACHE.get<Tweet>(key, "json");
  if (cached) return cached;
  let data: Tweet | undefined;
  try {
    ({ data } = await fetchTweet(id, {
      signal: AbortSignal.timeout(6000),
      headers: { Accept: "application/json", "User-Agent": "my-knowledge" },
    }));
  } catch (error) {
    if (
      error instanceof TwitterApiError ||
      error instanceof TypeError ||
      error instanceof SyntaxError ||
      error instanceof DOMException
    )
      return undefined;
    throw error;
  }
  if (data) await env.KNOWLEDGE_CACHE.put(key, JSON.stringify(data), { expirationTtl: 3600 });
  return data;
});

const readArticleCard = requestCache(async (value: string): Promise<ArticleCard | null> => {
  const url = new URL(value);
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

export async function readEmbed(embed: MarkdownEmbed): Promise<ResolvedEmbed> {
  if (embed.kind === "articleList") {
    const items: (ArticleCard | null)[] = [];
    for (let index = 0; index < embed.urls.length; index += 4) {
      items.push(
        ...(await Promise.all(
          embed.urls.slice(index, index + 4).map((url) => readArticleCard(url)),
        )),
      );
    }
    return { kind: "card", card: renderMarkdownEmbed(embed, { kind: "articleList", items }) };
  }
  if (embed.kind === "twitter") {
    const id = new URL(embed.url).pathname.split("/")[3];
    const tweet = id ? await readTweet(id) : undefined;
    return tweet
      ? { kind: "tweet", tweet, align: embed.align }
      : {
          kind: "card",
          card: renderMarkdownEmbed(embed, {
            kind: "error",
            message: "Post preview is unavailable. Open X / Twitter to read the post.",
          }),
        };
  }
  if (embed.kind === "link")
    return { kind: "card", card: renderMarkdownEmbed(embed, await readCard("link", embed.url)) };
  if (embed.kind === "github")
    return { kind: "card", card: renderMarkdownEmbed(embed, await readCard("github", embed.repo)) };
  if (embed.kind === "stock")
    return { kind: "card", card: renderMarkdownEmbed(embed, await readCard("stock", embed.code)) };
  return { kind: "card", card: renderMarkdownEmbed(embed) };
}
