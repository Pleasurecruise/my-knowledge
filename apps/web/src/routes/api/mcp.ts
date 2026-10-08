import { createFileRoute } from "@tanstack/react-router";
import { env } from "cloudflare:workers";

import { handleMcp } from "@/mcp/server";

function methodNotAllowed() {
  return new Response(null, { status: 405, headers: { Allow: "POST" } });
}

export const Route = createFileRoute("/api/mcp")({
  server: {
    handlers: {
      POST: ({ request }) => handleMcp(env, request),
      ANY: methodNotAllowed,
    },
  },
});
