import { canonicalizeTags, parseArticleDocuments } from "@my-knowledge/content";
import { z } from "zod";

import {
  deleteArticle,
  enqueueArticleTranslations,
  getArticleById,
  hasArticleVersion,
  listArticles,
  listTags,
  searchAiArticles,
  setArticleVisibility,
  updateArticle,
} from "@/articles";
import { submitArticleJob } from "@/article-jobs";

type McpResult = {
  content: [{ type: "text"; text: string }];
  structuredContent: object;
};

type McpError = {
  isError: true;
  content: [{ type: "text"; text: string }];
};

function result(value: object): McpResult {
  return {
    content: [{ type: "text", text: JSON.stringify(value) }],
    structuredContent: value,
  };
}

function notFound(message: string): McpError {
  return {
    isError: true,
    content: [{ type: "text", text: message }],
  };
}

export const createArticleInput = z.object({
  content: z.string().min(1).max(500_000),
});

export async function createArticleOperation(
  env: CloudflareEnv,
  input: z.infer<typeof createArticleInput>,
) {
  return result(await submitArticleJob(env, input.content));
}

export const getArticleInput = z.object({ id: z.string().uuid() });

export async function getArticleOperation(
  env: CloudflareEnv,
  input: z.infer<typeof getArticleInput>,
) {
  const article = await getArticleById(env, "owner", input.id);
  return article ? result(article) : notFound("Article not found");
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
    await listArticles(env, "owner", {
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
  document: z.string().min(1),
});

export async function updateArticleOperation(
  env: CloudflareEnv,
  input: z.infer<typeof updateArticleInput>,
) {
  if (!(await hasArticleVersion(env, input.id, input.expectedHash))) {
    return notFound("Article not found");
  }
  const document = await parseArticleDocuments({ zh: input.document });
  const article = await updateArticle(env, input.id, input.expectedHash, document);
  if (article) await enqueueArticleTranslations(env, article.id, article.contentHash);
  return article ? result(article) : notFound("Article not found");
}

export const deleteArticleInput = z.object({
  id: z.string().uuid(),
  expectedHash: z.string().regex(/^[a-f0-9]{64}$/u),
});

export async function deleteArticleOperation(
  env: CloudflareEnv,
  input: z.infer<typeof deleteArticleInput>,
) {
  return (await deleteArticle(env, input.id, input.expectedHash))
    ? result({ deleted: true })
    : notFound("Article not found");
}

export const searchArticlesInput = z.object({
  query: z.string().trim().min(1).max(2_000),
  tags: z.array(z.string().min(1)).max(5).optional(),
  limit: z.number().int().min(1).max(50).default(10),
});

export async function searchArticlesOperation(
  env: CloudflareEnv,
  input: z.infer<typeof searchArticlesInput>,
) {
  const wantedTags = input.tags
    ? canonicalizeTags(input.tags).map((tag) => tag.toLocaleLowerCase("en-US"))
    : undefined;
  const ranked = await searchAiArticles(env, "owner", input.query, wantedTags ? 50 : input.limit);
  const filtered = wantedTags
    ? ranked.filter(({ article }) =>
        wantedTags.every((wanted) =>
          article.tags.some((tag) => {
            const normalized = tag.toLocaleLowerCase("en-US");
            return normalized === wanted || normalized.startsWith(`${wanted}/`);
          }),
        ),
      )
    : ranked;
  return result({
    articles: filtered.slice(0, input.limit).map(({ article, markdown, score }) => ({
      id: article.id,
      slug: article.slug,
      title: article.editions.zh.title,
      summary: article.editions.zh.summary,
      tags: article.tags,
      excerpt: markdown.slice(0, 320),
      score,
    })),
  });
}

export const listTagsInput = z.object({ parent: z.string().min(1).optional() });

export async function listTagsOperation(env: CloudflareEnv, input: z.infer<typeof listTagsInput>) {
  const tags = await listTags(env, "owner");
  let normalizedParent: string | undefined;
  if (input.parent) {
    const value = canonicalizeTags([input.parent]).at(0);
    if (!value) throw new Error("Tag parent is missing after validation");
    normalizedParent = value.toLocaleLowerCase("en-US");
  }
  return result({
    tags: normalizedParent
      ? tags.filter((tag) => tag.path.toLocaleLowerCase("en-US").startsWith(`${normalizedParent}/`))
      : tags,
  });
}

export const setVisibilityInput = z.object({
  id: z.string().uuid(),
  visibility: z.enum(["private", "public"]),
  expectedHash: z.string().regex(/^[a-f0-9]{64}$/u),
});

export async function setVisibilityOperation(
  env: CloudflareEnv,
  input: z.infer<typeof setVisibilityInput>,
) {
  const article = await setArticleVisibility(env, input.id, input.expectedHash, input.visibility);
  return article ? result(article) : notFound("Article not found");
}
