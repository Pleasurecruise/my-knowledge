import { canonicalizeTags, type Visibility } from "@my-knowledge/content";

import { InvalidArticleInputError } from "./input-error";
import { getArticleById } from "./persistence/document";
import { listArticles, listTags } from "./persistence/query";
import type {
  ArticleDocuments,
  ArticleDraft,
  ArticleListQuery,
  ArticleTranslationDraft,
} from "./types";
import type { ArticleWriteResult } from "./writer";

export { InvalidArticleInputError };

export async function getOwnerArticle(env: CloudflareEnv, id: string) {
  return getArticleById(env, "owner", id);
}

export async function listOwnerArticles(env: CloudflareEnv, input: ArticleListQuery) {
  return listArticles(env, "owner", input);
}

export async function listOwnerTags(env: CloudflareEnv, parent: string | undefined) {
  const tags = await listTags(env, "owner");
  if (parent === undefined) return tags;
  const normalizedParent = canonicalizeTags([parent])[0];
  if (!normalizedParent) throw new InvalidArticleInputError();
  const prefix = `${normalizedParent.toLocaleLowerCase("en-US")}/`;
  return tags.filter((tag) => tag.path.toLocaleLowerCase("en-US").startsWith(prefix));
}

export async function createArticleFromDraft(env: CloudflareEnv, draft: ArticleDraft) {
  const id = crypto.randomUUID();
  return unwrap(await env.ARTICLE_WRITER.getByName(id).createDraft(id, draft));
}
export async function createArticleFromDocuments(env: CloudflareEnv, documents: ArticleDocuments) {
  const id = crypto.randomUUID();
  return unwrap(await env.ARTICLE_WRITER.getByName(id).createDocuments(id, documents));
}
export async function updateArticleFromDraft(
  env: CloudflareEnv,
  id: string,
  expectedHash: string,
  expectedUpdatedAt: string,
  draft: ArticleDraft & { visibility?: Visibility | undefined },
) {
  return unwrap(
    await env.ARTICLE_WRITER.getByName(id).updateDraft(id, expectedHash, expectedUpdatedAt, draft),
  );
}
export async function updateArticleFromDocuments(
  env: CloudflareEnv,
  id: string,
  expectedHash: string,
  expectedUpdatedAt: string,
  documents: ArticleDocuments,
) {
  return unwrap(
    await env.ARTICLE_WRITER.getByName(id).updateDocuments(
      id,
      expectedHash,
      expectedUpdatedAt,
      documents,
    ),
  );
}

export async function updateArticleTranslationFromDraft(
  env: CloudflareEnv,
  id: string,
  expectedHash: string,
  expectedUpdatedAt: string,
  draft: ArticleTranslationDraft,
) {
  return unwrap(
    await env.ARTICLE_WRITER.getByName(id).updateTranslation(
      id,
      expectedHash,
      expectedUpdatedAt,
      draft,
    ),
  );
}

export async function setArticleVisibility(
  env: CloudflareEnv,
  id: string,
  expectedHash: string,
  expectedUpdatedAt: string,
  visibility: Visibility,
) {
  return unwrap(
    await env.ARTICLE_WRITER.getByName(id).setVisibility(
      id,
      expectedHash,
      expectedUpdatedAt,
      visibility,
    ),
  );
}
export async function deleteArticle(
  env: CloudflareEnv,
  id: string,
  expectedHash: string,
  expectedUpdatedAt: string,
) {
  return unwrap(await env.ARTICLE_WRITER.getByName(id).delete(id, expectedHash, expectedUpdatedAt));
}

function unwrap<Value>(result: ArticleWriteResult<Value>): Value {
  if (result.status === "invalidInput") throw new InvalidArticleInputError();
  return result.value;
}
