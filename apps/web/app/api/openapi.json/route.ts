import { getCloudflareContext } from "@opennextjs/cloudflare";

import { createOpenApiDocument } from "@/discovery/api-catalog";

export const dynamic = "force-dynamic";

export async function GET(): Promise<Response> {
  const { env } = await getCloudflareContext({ async: true });

  return Response.json(createOpenApiDocument(new URL(env.BETTER_AUTH_URL)));
}
