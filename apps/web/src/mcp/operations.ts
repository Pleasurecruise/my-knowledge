import { z } from "zod";

import { searchArticles } from "@/articles";
import {
  createArticleFromDocuments,
  deleteArticle,
  getOwnerArticle,
  listOwnerArticles,
  listOwnerTags,
  setArticleVisibility,
  updateArticleFromDocuments,
} from "@/articles/service";

type McpResult<Value extends object> = {
  content: [{ type: "text"; text: string }];
  structuredContent: Value;
};

type McpError = {
  isError: true;
  content: [{ type: "text"; text: string }];
};

function result<Value extends object>(value: Value): McpResult<Value> {
  return {
    content: [{ type: "text", text: JSON.stringify(value) }],
    structuredContent: value,
  };
}

function notFound(): McpError {
  return {
    isError: true,
    content: [{ type: "text", text: "Article not found" }],
  };
}

export const createArticleInput = z.object({
  document: z.string().min(1).max(500_000),
});

export async function createArticleOperation(
  env: CloudflareEnv,
  input: z.infer<typeof createArticleInput>,
) {
  return result(await createArticleFromDocuments(env, { zh: input.document }));
}

export const getArticleInput = z.object({ id: z.string().uuid() });

export async function getArticleOperation(
  env: CloudflareEnv,
  input: z.infer<typeof getArticleInput>,
) {
  const article = await getOwnerArticle(env, input.id);
  return article ? result(article) : notFound();
}

export const listArticlesInput = z.object({
  visibility: z.enum(["private", "public"]).optional(),
  tags: z.array(z.string().min(1)).max(5).default([]),
  cursor: z.string().optional(),
  limit: z.number().int().min(1).max(100).default(20),
});

export async function listArticlesOperation(
  env: CloudflareEnv,
  input: z.infer<typeof listArticlesInput>,
) {
  return result(
    await listOwnerArticles(env, {
      cursor: input.cursor,
      limit: input.limit,
      tags: input.tags,
      visibility: input.visibility,
    }),
  );
}

export const updateArticleInput = z.object({
  id: z.string().uuid(),
  expectedHash: z.string().regex(/^[a-f0-9]{64}$/u),
  expectedUpdatedAt: z.iso.datetime(),
  document: z.string().min(1).max(500_000),
});

export async function updateArticleOperation(
  env: CloudflareEnv,
  input: z.infer<typeof updateArticleInput>,
) {
  const updated = await updateArticleFromDocuments(
    env,
    input.id,
    input.expectedHash,
    input.expectedUpdatedAt,
    {
      zh: input.document,
    },
  );
  if (updated.status === "notFound") return notFound();
  if (updated.status === "stale") {
    return {
      isError: true,
      content: [{ type: "text", text: "Article changed while saving" }],
    } satisfies McpError;
  }
  return result(updated.article);
}

export const deleteArticleInput = z.object({
  id: z.string().uuid(),
  expectedHash: z.string().regex(/^[a-f0-9]{64}$/u),
  expectedUpdatedAt: z.iso.datetime(),
});

export async function deleteArticleOperation(
  env: CloudflareEnv,
  input: z.infer<typeof deleteArticleInput>,
) {
  return (await deleteArticle(env, input.id, input.expectedHash, input.expectedUpdatedAt))
    ? result({ deleted: true })
    : ({
        isError: true,
        content: [{ type: "text", text: "Article changed or was not found" }],
      } satisfies McpError);
}

export const searchArticlesInput = z.strictObject({
  query: z.string().trim().min(1).max(2_000),
  limit: z.number().int().min(1).max(50).default(10),
});

export async function searchArticlesOperation(
  env: CloudflareEnv,
  input: z.infer<typeof searchArticlesInput>,
) {
  return result({ articles: await searchArticles(env, "owner", input.query, input.limit) });
}

export const listTagsInput = z.object({ parent: z.string().min(1).optional() });

export async function listTagsOperation(env: CloudflareEnv, input: z.infer<typeof listTagsInput>) {
  return result({ tags: await listOwnerTags(env, input.parent) });
}

export const setVisibilityInput = z.object({
  id: z.string().uuid(),
  visibility: z.enum(["private", "public"]),
  expectedHash: z.string().regex(/^[a-f0-9]{64}$/u),
  expectedUpdatedAt: z.iso.datetime(),
});

export async function setVisibilityOperation(
  env: CloudflareEnv,
  input: z.infer<typeof setVisibilityInput>,
) {
  const article = await setArticleVisibility(
    env,
    input.id,
    input.expectedHash,
    input.expectedUpdatedAt,
    input.visibility,
  );
  return article
    ? result(article)
    : ({
        isError: true,
        content: [{ type: "text", text: "Article changed or was not found" }],
      } satisfies McpError);
}
