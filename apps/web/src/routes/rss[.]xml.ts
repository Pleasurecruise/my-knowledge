import { createFileRoute } from "@tanstack/react-router";
import { env } from "cloudflare:workers";

import { listPublicArticleSummaries } from "@/articles";
import { createRssFeed } from "@/discovery/publications";

export const Route = createFileRoute("/rss.xml")({
  server: {
    handlers: {
      GET: async () => {
        const origin = new URL(env.BETTER_AUTH_URL);
        const articles = await listPublicArticleSummaries(env);
        return new Response(createRssFeed(articles, origin), {
          headers: {
            "Cache-Control": "no-store",
            "Content-Type": "application/rss+xml; charset=utf-8",
            "X-Content-Type-Options": "nosniff",
          },
        });
      },
      ANY: () => new Response(null, { status: 405, headers: { Allow: "GET, HEAD" } }),
    },
  },
});
