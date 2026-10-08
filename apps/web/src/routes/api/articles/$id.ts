import { createFileRoute } from "@tanstack/react-router";
import { env } from "cloudflare:workers";
import { z } from "zod";

import {
  deleteArticle,
  getOwnerArticle,
  InvalidArticleInputError,
  setArticleVisibility,
  updateArticleFromDocuments,
  updateArticleFromDraft,
  updateArticleTranslationFromDraft,
} from "@/articles/service";
import { articleDeleteSchema, articlePatchSchema } from "@/api/articles";
import { isOwnerRequest } from "@/auth/owner";

async function readArticle({
  request,
  params: { id },
}: {
  request: Request;
  params: { id: string };
}) {
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

async function updateArticle({
  request,
  params: { id },
}: {
  request: Request;
  params: { id: string };
}) {
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
  if (!("body" in input) && !("documents" in input)) {
    const article = await setArticleVisibility(
      env,
      id,
      input.expectedHash,
      input.expectedUpdatedAt,
      input.visibility,
    );
    return article
      ? Response.json({ article })
      : Response.json({ error: "Article changed or was not found" }, { status: 409 });
  }
  let result: Awaited<ReturnType<typeof updateArticleFromDraft>>;
  try {
    result =
      "documents" in input
        ? await updateArticleFromDocuments(
            env,
            id,
            input.expectedHash,
            input.expectedUpdatedAt,
            input.documents,
          )
        : "locale" in input
          ? await updateArticleTranslationFromDraft(
              env,
              id,
              input.expectedHash,
              input.expectedUpdatedAt,
              input,
            )
          : await updateArticleFromDraft(
              env,
              id,
              input.expectedHash,
              input.expectedUpdatedAt,
              input,
            );
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

async function removeArticle({
  request,
  params: { id },
}: {
  request: Request;
  params: { id: string };
}) {
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
  return (await deleteArticle(env, id, input.expectedHash, input.expectedUpdatedAt))
    ? new Response(null, { status: 204 })
    : Response.json({ error: "Article changed or was not found" }, { status: 409 });
}

export const Route = createFileRoute("/api/articles/$id")({
  server: {
    handlers: {
      GET: readArticle,
      PATCH: updateArticle,
      DELETE: removeArticle,
      ANY: () =>
        new Response(null, { status: 405, headers: { Allow: "DELETE, GET, HEAD, PATCH" } }),
    },
  },
});
