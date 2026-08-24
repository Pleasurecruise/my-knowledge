import { getCloudflareContext } from "@opennextjs/cloudflare";

import { listPublicArticleSummaries } from "@/articles";
import { createLlmsText } from "@/discovery/publications";

export const dynamic = "force-dynamic";

export async function GET(): Promise<Response> {
  const { env } = await getCloudflareContext({ async: true });
  const origin = new URL(env.BETTER_AUTH_URL);
  const articles = await listPublicArticleSummaries(env);

  return new Response(createLlmsText(articles, origin), {
    headers: {
      "Cache-Control": "no-store",
      "Content-Type": "text/plain; charset=utf-8",
      "X-Content-Type-Options": "nosniff",
    },
  });
}
