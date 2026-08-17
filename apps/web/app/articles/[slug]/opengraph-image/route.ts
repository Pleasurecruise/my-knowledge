import { getCloudflareContext } from "@opennextjs/cloudflare";
import { ImageResponse } from "next/og";
import { notFound } from "next/navigation";

import { getArticleBySlug } from "@/articles";
import {
  ArticleOpenGraphCard,
  articleOpenGraphSize,
} from "@/articles/components/article-open-graph-card";

export async function GET(
  request: Request,
  { params }: RouteContext<"/articles/[slug]/opengraph-image">,
) {
  const [{ slug }, { env }] = await Promise.all([params, getCloudflareContext({ async: true })]);
  const article = await getArticleBySlug(env, "anonymous", slug);
  const version = new URL(request.url).searchParams.get("v");
  if (!article || version !== article.contentHash) notFound();

  const date = new Intl.DateTimeFormat("zh-CN", {
    year: "numeric",
    month: "long",
    day: "numeric",
  }).format(new Date(article.updatedAt));

  return new ImageResponse(
    ArticleOpenGraphCard({
      date,
      domain: new URL(env.BETTER_AUTH_URL).hostname.toUpperCase(),
      tags: article.tags,
      title: article.editions.zh.title,
    }),
    {
      ...articleOpenGraphSize,
      headers: { "Cache-Control": "public, max-age=31536000, immutable" },
    },
  );
}
