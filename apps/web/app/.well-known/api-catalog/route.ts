import { getCloudflareContext } from "@opennextjs/cloudflare";

import { createApiCatalog } from "@/discovery/api-catalog";

export const dynamic = "force-dynamic";

export async function GET(): Promise<Response> {
  const { env } = await getCloudflareContext({ async: true });
  const origin = new URL(env.BETTER_AUTH_URL);

  return new Response(JSON.stringify(createApiCatalog(origin)), {
    headers: {
      "Content-Type": 'application/linkset+json; profile="https://www.rfc-editor.org/info/rfc9727"',
      Link: `<${new URL("/.well-known/api-catalog", origin).href}>; rel="api-catalog"`,
    },
  });
}
