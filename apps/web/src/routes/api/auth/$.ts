import { createFileRoute } from "@tanstack/react-router";

import { createAuth } from "@/auth/server";

async function handleAuth({ request }: { request: Request }) {
  const auth = await createAuth();
  return auth.handler(request);
}

export const Route = createFileRoute("/api/auth/$")({
  server: {
    handlers: {
      GET: handleAuth,
      POST: handleAuth,
      ANY: () => new Response(null, { status: 405, headers: { Allow: "GET, HEAD, POST" } }),
    },
  },
});
