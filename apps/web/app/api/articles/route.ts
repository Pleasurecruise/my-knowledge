import { getCloudflareContext } from "@opennextjs/cloudflare";
import { z } from "zod";

import {
  createArticleFromDocuments,
  createArticleFromDraft,
  InvalidArticleInputError,
  listOwnerArticles,
} from "@/articles/service";
import { articleCreateSchema, articleListQuerySchema } from "@/api/articles";
import { isOwnerRequest } from "@/auth/owner";

export async function GET(request: Request) {
  const { env } = await getCloudflareContext({ async: true });
  if (!(await isOwnerRequest(env, request))) {
    return Response.json(
      { error: "Unauthorized" },
      { status: 401, headers: { "WWW-Authenticate": "Bearer" } },
    );
  }
  const url = new URL(request.url);
  const query = articleListQuerySchema.safeParse({
    ...Object.fromEntries(url.searchParams.entries()),
    tags: url.searchParams.getAll("tag"),
  });
  if (!query.success) return Response.json({ error: "Invalid article query" }, { status: 422 });
  return Response.json(
    await listOwnerArticles(env, {
      visibility: query.data.visibility,
      tags: query.data.tags,
      cursor: query.data.cursor,
      limit: query.data.limit,
    }),
  );
}

export async function POST(request: Request) {
  const { env } = await getCloudflareContext({ async: true });
  if (!(await isOwnerRequest(env, request))) {
    return Response.json(
      { error: "Unauthorized" },
      { status: 401, headers: { "WWW-Authenticate": "Bearer" } },
    );
  }
  let input: z.infer<typeof articleCreateSchema>;
  try {
    const parsed = articleCreateSchema.safeParse(await request.json());
    if (!parsed.success) return Response.json({ error: "Invalid article input" }, { status: 422 });
    input = parsed.data;
  } catch {
    return Response.json({ error: "Invalid article input" }, { status: 422 });
  }
  try {
    const article =
      "documents" in input
        ? await createArticleFromDocuments(env, input.documents)
        : await createArticleFromDraft(env, input);
    return Response.json({ article }, { status: 201 });
  } catch (error) {
    if (error instanceof InvalidArticleInputError) {
      return Response.json({ error: error.message }, { status: 422 });
    }
    throw error;
  }
}
