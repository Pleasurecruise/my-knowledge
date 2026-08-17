import { getCloudflareContext } from "@opennextjs/cloudflare";
import { z } from "zod";

import { deleteArticle, setArticleVisibility, updateArticleFromDraft } from "@/articles";
import { getPrincipal } from "@/auth/owner";

const deleteSchema = z.object({ expectedHash: z.string().regex(/^[a-f0-9]{64}$/u) });
const expectedHash = z.string().regex(/^[a-f0-9]{64}$/u);
const patchSchema = z.discriminatedUnion("operation", [
  z.object({
    operation: z.literal("save"),
    expectedHash,
    locale: z.string().min(1),
    title: z.string().trim().min(1).max(240),
    body: z.string().trim().min(1).max(500_000),
    tags: z.array(z.string().min(1)).max(5),
  }),
  z.object({
    operation: z.literal("setVisibility"),
    expectedHash,
    visibility: z.enum(["private", "public"]),
  }),
]);

export async function PATCH(request: Request, { params }: RouteContext<"/api/articles/[id]">) {
  if ((await getPrincipal()) !== "owner") return new Response(null, { status: 404 });
  const input = patchSchema.safeParse(await request.json());
  if (!input.success) return Response.json({ error: "Invalid article update" }, { status: 422 });
  const [{ id }, { env }] = await Promise.all([params, getCloudflareContext({ async: true })]);
  if (input.data.operation === "setVisibility") {
    const article = await setArticleVisibility(
      env,
      id,
      input.data.expectedHash,
      input.data.visibility,
    );
    return article
      ? Response.json({ article })
      : Response.json({ error: "Article changed or was not found" }, { status: 409 });
  }
  const result = await updateArticleFromDraft(env, id, input.data.expectedHash, input.data);
  if (result.status === "notFound")
    return Response.json({ error: "Article not found" }, { status: 404 });
  if (result.status === "stale")
    return Response.json({ error: "Article changed while saving" }, { status: 409 });
  return Response.json({ article: result.article });
}

export async function DELETE(request: Request, { params }: RouteContext<"/api/articles/[id]">) {
  if ((await getPrincipal()) !== "owner") return new Response(null, { status: 404 });
  const [{ id }, input, { env }] = await Promise.all([
    params,
    request.json().then((value) => deleteSchema.parse(value)),
    getCloudflareContext({ async: true }),
  ]);
  return (await deleteArticle(env, id, input.expectedHash))
    ? new Response(null, { status: 204 })
    : new Response(null, { status: 404 });
}
