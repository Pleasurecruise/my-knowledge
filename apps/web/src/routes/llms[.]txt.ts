import { createFileRoute } from "@tanstack/react-router";
import { env } from "cloudflare:workers";

import { listPublicArticleSummaries } from "@/articles";
import { createLlmsText } from "@/discovery/publications";

export const Route = createFileRoute("/llms.txt")({
  server: {
    handlers: {
      GET: async () => {
        const origin = new URL(env.BETTER_AUTH_URL);
        const articles = await listPublicArticleSummaries(env);
        return new Response(createLlmsText(articles, origin), {
          headers: {
            "Cache-Control": "no-store",
            "Content-Type": "text/plain; charset=utf-8",
            "X-Content-Type-Options": "nosniff",
          },
        });
      },
      ANY: () => new Response(null, { status: 405, headers: { Allow: "GET, HEAD" } }),
    },
  },
});
