import { createFileRoute } from "@tanstack/react-router";
import { env } from "cloudflare:workers";

import { createOpenApiDocument } from "@/discovery/api-catalog";

export const Route = createFileRoute("/api/openapi.json")({
  server: {
    handlers: {
      GET: () => Response.json(createOpenApiDocument(new URL(env.BETTER_AUTH_URL))),
      ANY: () => new Response(null, { status: 405, headers: { Allow: "GET, HEAD" } }),
    },
  },
});
