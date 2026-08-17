import { getCloudflareContext } from "@opennextjs/cloudflare";

import { handleMcp } from "@/mcp/server";

export async function POST(request: Request) {
  const { env } = await getCloudflareContext({ async: true });
  return handleMcp(env, request);
}

function methodNotAllowed() {
  return new Response(null, { status: 405, headers: { Allow: "POST" } });
}

export const GET = methodNotAllowed;
export const DELETE = methodNotAllowed;
