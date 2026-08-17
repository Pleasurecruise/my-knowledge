import { getCloudflareContext } from "@opennextjs/cloudflare";
import { z } from "zod";

import { createArticleFromDraft } from "@/articles";
import { getPrincipal } from "@/auth/owner";

const draftSchema = z.object({
  locale: z.string().min(1),
  title: z.string().trim().min(1).max(240),
  body: z.string().trim().min(1).max(500_000),
  tags: z.array(z.string().min(1)).max(5),
});

export async function POST(request: Request) {
  if ((await getPrincipal()) !== "owner") return new Response(null, { status: 404 });
  const result = draftSchema.safeParse(await request.json());
  if (!result.success) return Response.json({ error: "Invalid article draft" }, { status: 422 });
  const { env } = await getCloudflareContext({ async: true });
  return Response.json({ article: await createArticleFromDraft(env, result.data) });
}
