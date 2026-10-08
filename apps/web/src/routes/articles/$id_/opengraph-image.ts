import { ImageResponse } from "workers-og";
import { createFileRoute } from "@tanstack/react-router";
import { env } from "cloudflare:workers";

import { getArticleMetadata } from "@/articles";
import {
  ArticleOpenGraphCard,
  articleOpenGraphSize,
  articleOpenGraphVersion,
} from "@/articles/components/article-open-graph-card";

let coverFont: ArrayBuffer | undefined;

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
  if (!coverFont) {
    if (!env.ASSETS) throw new Error("Static asset binding is required for Open Graph fonts");
    const response = await env.ASSETS.fetch(new URL("/fonts/knowledge-og.woff", request.url));
    if (!response.ok) throw new Error("Open Graph font could not be loaded");
    coverFont = await response.arrayBuffer();
  }

  const date = new Intl.DateTimeFormat("zh-CN", {
    year: "numeric",
    month: "long",
    day: "numeric",
  }).format(new Date(article.createdAt));

  const rendered = new ImageResponse(
    ArticleOpenGraphCard({
      date,
      domain: new URL(env.BETTER_AUTH_URL).hostname,
      title: article.editions.zh.title,
    }),
    {
      ...articleOpenGraphSize,
      fonts: [{ name: "Knowledge", data: coverFont, weight: 500, style: "normal" }],
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
