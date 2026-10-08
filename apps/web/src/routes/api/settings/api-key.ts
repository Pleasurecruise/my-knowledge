import { createFileRoute } from "@tanstack/react-router";
import { env } from "cloudflare:workers";

import { generateApiKey, getApiKeyStatus } from "@/auth/api-key";
import { getPrincipal } from "@/auth/owner";

const noStoreHeaders = { "Cache-Control": "no-store" };

export const Route = createFileRoute("/api/settings/api-key")({
  server: {
    handlers: {
      GET: async () => {
        if ((await getPrincipal()) !== "owner") return new Response(null, { status: 404 });
        return Response.json(await getApiKeyStatus(env.API_KEY), { headers: noStoreHeaders });
      },
      POST: async () => {
        if ((await getPrincipal()) !== "owner") return new Response(null, { status: 404 });
        const status = await getApiKeyStatus(env.API_KEY);
        if (status.configured) {
          return Response.json(
            { error: "API key already exists." },
            { status: 409, headers: noStoreHeaders },
          );
        }
        return Response.json(await generateApiKey(env.API_KEY), { headers: noStoreHeaders });
      },
      PUT: async () => {
        if ((await getPrincipal()) !== "owner") return new Response(null, { status: 404 });
        return Response.json(await generateApiKey(env.API_KEY), { headers: noStoreHeaders });
      },
      ANY: () => new Response(null, { status: 405, headers: { Allow: "GET, HEAD, POST, PUT" } }),
    },
  },
});
