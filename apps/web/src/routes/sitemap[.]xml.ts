import { createFileRoute } from "@tanstack/react-router";
import { env } from "cloudflare:workers";

import { listPublicArticleSummaries } from "@/articles";

export const Route = createFileRoute("/sitemap.xml")({
  server: {
    handlers: {
      GET: async () => {
        const origin = new URL(env.BETTER_AUTH_URL);
        const articles = await listPublicArticleSummaries(env);
        const entries = [
          { url: origin.href, lastModified: articles.at(0)?.updatedAt },
          ...articles.map((article) => ({
            url: new URL(`/articles/${article.id}`, origin).href,
            lastModified: article.updatedAt,
          })),
        ];
        return new Response(
          [
            '<?xml version="1.0" encoding="UTF-8"?>',
            '<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">',
            ...entries.map(
              ({ url, lastModified }) =>
                `<url>\n<loc>${url}</loc>${lastModified ? `\n<lastmod>${new Date(lastModified).toISOString()}</lastmod>` : ""}\n</url>`,
            ),
            "</urlset>",
            "",
          ].join("\n"),
          {
            headers: {
              "Cache-Control": "public, max-age=0, must-revalidate",
              "Content-Type": "application/xml",
            },
          },
        );
      },
      ANY: () => new Response(null, { status: 405, headers: { Allow: "GET, HEAD" } }),
    },
  },
});
