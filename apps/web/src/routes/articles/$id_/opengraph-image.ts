import { ImageResponse } from "workers-og";
import { createFileRoute } from "@tanstack/react-router";
import { env } from "cloudflare:workers";

import { getArticleMetadata } from "@/articles";
import {
  ArticleOpenGraphCard,
  articleOpenGraphSize,
  articleOpenGraphVersion,
} from "@/articles/components/article-open-graph-card";

let coverBase: string | undefined;

// Old UA so Google Fonts returns ttf, the only format the renderer can parse.
const TTF_USER_AGENT =
  "Mozilla/5.0 (Macintosh; U; Intel Mac OS X 10_6_4; en-us) AppleWebKit/533.18.1 (KHTML, like Gecko) Version/5.0.2 Safari/533.18.5";
const FONT_TTL = 60 * 60 * 24 * 30;

/** LXGW WenKai, subset to the characters on this card. */
async function loadFont(text: string): Promise<ArrayBuffer> {
  const chars = Array.from(new Set(text)).sort().join("");
  const digest = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(chars));
  const cacheKey = `og-font/${Buffer.from(digest).toString("hex").slice(0, 16)}`;
  const cached = await env.KNOWLEDGE_CACHE.get(cacheKey, "arrayBuffer");
  if (cached) return cached;
  const css = await fetch(
    `https://fonts.googleapis.com/css2?family=LXGW+WenKai+TC&text=${encodeURIComponent(chars)}`,
    { headers: { "User-Agent": TTF_USER_AGENT } },
  ).then((response) => response.text());
  const source = /src:\s*url\((?<url>[^)]+)\)/.exec(css)?.groups?.url;
  if (!source) throw new Error("Open Graph font could not be loaded");
  const font = await fetch(source).then((response) => response.arrayBuffer());
  await env.KNOWLEDGE_CACHE.put(cacheKey, font, { expirationTtl: FONT_TTL });
  return font;
}

export async function renderOpenGraphImage({
  request,
  params: { id },
}: {
  request: Request;
  params: { id: string };
}) {
  const article = await getArticleMetadata(env, id);
  const version = new URL(request.url).searchParams.get("v");
  if (!article || version !== `${article.contentHash}-${articleOpenGraphVersion}`)
    return new Response(null, { status: 404, headers: { "Cache-Control": "no-store" } });
  const cacheKey = `og/${article.id}/${version}.png`;
  const headers = { "Content-Type": "image/png", "Cache-Control": "no-store" };
  const cached = await env.KNOWLEDGE_CACHE.get(cacheKey, "arrayBuffer");
  if (cached) return new Response(cached, { headers });
  if (!coverBase) {
    if (!env.ASSETS) throw new Error("Static asset binding is required for the Open Graph base");
    const response = await env.ASSETS.fetch(new URL("/og-base.jpg", request.url));
    if (!response.ok) throw new Error("Open Graph base could not be loaded");
    coverBase = `data:image/jpeg;base64,${Buffer.from(await response.arrayBuffer()).toString("base64")}`;
  }

  const date = new Intl.DateTimeFormat("zh-CN", {
    year: "numeric",
    month: "long",
    day: "numeric",
  }).format(new Date(article.createdAt));

  const rendered = new ImageResponse(
    ArticleOpenGraphCard({ base: coverBase, date, title: article.editions.zh.title }),
    {
      ...articleOpenGraphSize,
      fonts: [
        {
          name: "Knowledge",
          data: await loadFont(`${date}${article.editions.zh.title}…`),
          weight: 400,
          style: "normal",
        },
      ],
      headers,
    },
  );
  const image = await rendered.arrayBuffer();
  await env.KNOWLEDGE_CACHE.put(cacheKey, image, { expirationTtl: 86_400 });
  return new Response(image, { headers });
}

export const Route = createFileRoute("/articles/$id_/opengraph-image")({
  server: {
    handlers: {
      GET: renderOpenGraphImage,
      ANY: () => new Response(null, { status: 405, headers: { Allow: "GET, HEAD" } }),
    },
  },
});
