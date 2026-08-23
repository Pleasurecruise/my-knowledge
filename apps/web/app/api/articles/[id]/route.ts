import { getCloudflareContext } from "@opennextjs/cloudflare";
import { z } from "zod";

import {
  deleteArticle,
  getOwnerArticle,
  InvalidArticleInputError,
  setArticleVisibility,
  updateArticleFromDocuments,
  updateArticleFromDraft,
} from "@/articles/service";
import { articleDeleteSchema, articlePatchSchema } from "@/api/articles";
import { isOwnerRequest } from "@/auth/owner";

export async function GET(request: Request, { params }: RouteContext<"/api/articles/[id]">) {
  const [{ id }, { env }] = await Promise.all([params, getCloudflareContext({ async: true })]);
  if (!(await isOwnerRequest(env, request))) {
    return Response.json(
      { error: "Unauthorized" },
      { status: 401, headers: { "WWW-Authenticate": "Bearer" } },
    );
  }
  const article = await getOwnerArticle(env, id);
  return article
    ? Response.json({ article })
    : Response.json({ error: "Article not found" }, { status: 404 });
}

export async function PATCH(request: Request, { params }: RouteContext<"/api/articles/[id]">) {
  const [{ id }, { env }] = await Promise.all([params, getCloudflareContext({ async: true })]);
  if (!(await isOwnerRequest(env, request))) {
    return Response.json(
      { error: "Unauthorized" },
      { status: 401, headers: { "WWW-Authenticate": "Bearer" } },
    );
  }
  let input: z.infer<typeof articlePatchSchema>;
  try {
    const parsed = articlePatchSchema.safeParse(await request.json());
    if (!parsed.success) return Response.json({ error: "Invalid article update" }, { status: 422 });
    input = parsed.data;
  } catch {
    return Response.json({ error: "Invalid article update" }, { status: 422 });
  }
  if ("visibility" in input) {
    const article = await setArticleVisibility(env, id, input.expectedHash, input.visibility);
    return article
      ? Response.json({ article })
      : Response.json({ error: "Article changed or was not found" }, { status: 409 });
  }
  if ("documents" in input) {
    try {
      const result = await updateArticleFromDocuments(env, id, input.expectedHash, input.documents);
      if (result.status !== "updated") {
        return Response.json({ error: "Article changed or was not found" }, { status: 409 });
      }
      return Response.json({ article: result.article });
    } catch (error) {
      if (error instanceof InvalidArticleInputError) {
        return Response.json({ error: error.message }, { status: 422 });
      }
      throw error;
    }
  }
  let result: Awaited<ReturnType<typeof updateArticleFromDraft>>;
  try {
    result = await updateArticleFromDraft(env, id, input.expectedHash, input);
  } catch (error) {
    if (error instanceof InvalidArticleInputError) {
      return Response.json({ error: error.message }, { status: 422 });
    }
    throw error;
  }
  if (result.status === "notFound")
    return Response.json({ error: "Article not found" }, { status: 404 });
  if (result.status === "stale")
    return Response.json({ error: "Article changed while saving" }, { status: 409 });
  return Response.json({ article: result.article });
}

export async function DELETE(request: Request, { params }: RouteContext<"/api/articles/[id]">) {
  const [{ id }, { env }] = await Promise.all([params, getCloudflareContext({ async: true })]);
  if (!(await isOwnerRequest(env, request))) {
    return Response.json(
      { error: "Unauthorized" },
      { status: 401, headers: { "WWW-Authenticate": "Bearer" } },
    );
  }
  let input: z.infer<typeof articleDeleteSchema>;
  try {
    const parsed = articleDeleteSchema.safeParse(await request.json());
    if (!parsed.success) {
      return Response.json({ error: "Invalid article deletion" }, { status: 422 });
    }
    input = parsed.data;
  } catch {
    return Response.json({ error: "Invalid article deletion" }, { status: 422 });
  }
  return (await deleteArticle(env, id, input.expectedHash))
    ? new Response(null, { status: 204 })
    : Response.json({ error: "Article changed or was not found" }, { status: 409 });
}
