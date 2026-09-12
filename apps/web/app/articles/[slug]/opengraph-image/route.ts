import { getCloudflareContext } from "@opennextjs/cloudflare";
import { ImageResponse } from "next/og";

import { getArticleMetadata } from "@/articles";
import {
  ArticleOpenGraphCard,
  articleOpenGraphSize,
  articleOpenGraphVersion,
} from "@/articles/components/article-open-graph-card";

let coverFont: ArrayBuffer | undefined;

export async function GET(
  request: Request,
  { params }: RouteContext<"/articles/[slug]/opengraph-image">,
) {
  const [{ slug }, { env }] = await Promise.all([params, getCloudflareContext({ async: true })]);
  const article = await getArticleMetadata(env, slug);
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
