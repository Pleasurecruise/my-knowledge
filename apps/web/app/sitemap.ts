import { getCloudflareContext } from "@opennextjs/cloudflare";
import type { MetadataRoute } from "next";

import { listPublicArticleSummaries } from "@/articles";

export const dynamic = "force-dynamic";

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const { env } = await getCloudflareContext({ async: true });
  const origin = new URL(env.BETTER_AUTH_URL);
  const articles = await listPublicArticleSummaries(env);

  return [
    { url: origin.href },
    { url: new URL("/articles", origin).href },
    { url: new URL("/graph", origin).href },
    ...articles.map((article) => ({
      url: new URL(`/articles/${article.slug}`, origin).href,
      lastModified: article.updatedAt,
    })),
  ];
}
