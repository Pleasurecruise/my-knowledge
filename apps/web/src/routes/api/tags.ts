import { createFileRoute } from "@tanstack/react-router";
import { env } from "cloudflare:workers";
import { z } from "zod";

import { listOwnerTags } from "@/articles/service";
import { isOwnerRequest } from "@/auth/owner";

const tagQuerySchema = z.object({ parent: z.string().min(1).optional() });

async function listTags({ request }: { request: Request }) {
  if (!(await isOwnerRequest(env, request))) {
    return Response.json(
      { error: "Unauthorized" },
      { status: 401, headers: { "WWW-Authenticate": "Bearer" } },
    );
  }
  const query = tagQuerySchema.safeParse(
    Object.fromEntries(new URL(request.url).searchParams.entries()),
  );
  if (!query.success) return Response.json({ error: "Invalid tag query" }, { status: 422 });
  return Response.json({ tags: await listOwnerTags(env, query.data.parent) });
}

export const Route = createFileRoute("/api/tags")({
  server: {
    handlers: {
      GET: listTags,
      ANY: () => new Response(null, { status: 405, headers: { Allow: "GET, HEAD" } }),
    },
  },
});
