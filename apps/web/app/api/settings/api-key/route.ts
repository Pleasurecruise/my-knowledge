import { getCloudflareContext } from "@opennextjs/cloudflare";

import { generateApiKey, getApiKeyStatus } from "@/auth/api-key";
import { getPrincipal } from "@/auth/owner";

const noStoreHeaders = { "Cache-Control": "no-store" };

export async function GET() {
  if ((await getPrincipal()) !== "owner") return new Response(null, { status: 404 });
  const { env } = await getCloudflareContext({ async: true });
  return Response.json(await getApiKeyStatus(env.API_KEY), {
    headers: noStoreHeaders,
  });
}

export async function POST() {
  if ((await getPrincipal()) !== "owner") return new Response(null, { status: 404 });
  const { env } = await getCloudflareContext({ async: true });
  const status = await getApiKeyStatus(env.API_KEY);
  if (status.configured) {
    return Response.json(
      { error: "API key already exists." },
      { status: 409, headers: noStoreHeaders },
    );
  }
  return Response.json(await generateApiKey(env.API_KEY), { headers: noStoreHeaders });
}

export async function PUT() {
  if ((await getPrincipal()) !== "owner") return new Response(null, { status: 404 });
  const { env } = await getCloudflareContext({ async: true });
  return Response.json(await generateApiKey(env.API_KEY), {
    headers: noStoreHeaders,
  });
}
