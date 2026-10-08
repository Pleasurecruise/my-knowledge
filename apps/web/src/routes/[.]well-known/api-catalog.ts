import { createFileRoute } from "@tanstack/react-router";
import { env } from "cloudflare:workers";

import { createApiCatalog } from "@/discovery/api-catalog";

export const Route = createFileRoute("/.well-known/api-catalog")({
  server: {
    handlers: {
      GET: () => {
        const origin = new URL(env.BETTER_AUTH_URL);
        return new Response(JSON.stringify(createApiCatalog(origin)), {
          headers: {
            "Content-Type":
              'application/linkset+json; profile="https://www.rfc-editor.org/info/rfc9727"',
            Link: `<${new URL("/.well-known/api-catalog", origin).href}>; rel="api-catalog"`,
          },
        });
      },
      ANY: () => new Response(null, { status: 405, headers: { Allow: "GET, HEAD" } }),
    },
  },
});
