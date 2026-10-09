import { createFileRoute } from "@tanstack/react-router";
import { env } from "cloudflare:workers";

export const Route = createFileRoute("/robots.txt")({
  server: {
    handlers: {
      GET: () =>
        new Response(
          [
            "User-agent: *",
            "Allow: /",
            "Allow: /api/openapi.json",
            "Disallow: /api/",
            "Disallow: /articles/new",
            "",
            `Sitemap: ${new URL("/sitemap.xml", env.BETTER_AUTH_URL).href}`,
            "",
          ].join("\n"),
          {
            headers: {
              "Cache-Control": "public, max-age=0, must-revalidate",
              "Content-Type": "text/plain",
            },
          },
        ),
      ANY: () => new Response(null, { status: 405, headers: { Allow: "GET, HEAD" } }),
    },
  },
});
