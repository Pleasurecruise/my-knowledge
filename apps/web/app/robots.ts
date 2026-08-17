import { getCloudflareContext } from "@opennextjs/cloudflare";
import type { MetadataRoute } from "next";

export const dynamic = "force-dynamic";

export default async function robots(): Promise<MetadataRoute.Robots> {
  const { env } = await getCloudflareContext({ async: true });
  const origin = new URL(env.BETTER_AUTH_URL);

  return {
    rules: {
      userAgent: "*",
      allow: "/",
      disallow: ["/api/", "/articles/new"],
    },
    sitemap: new URL("/sitemap.xml", origin).href,
    host: origin.origin,
  };
}
