import { InvalidArticleInputError } from "./application/input-error";
import type { ArticleWriteResult } from "./writer";
import type { Visibility } from "@my-knowledge/content";
import type { ArticleDocuments, ArticleDraft } from "./operations";

export {
  getOwnerArticle,
  listOwnerArticles,
  listOwnerTags,
  searchOwnerArticles,
  InvalidArticleInputError,
} from "./operations";
export type { ArticleDocuments, ArticleDraft, ArticleUpdateResult } from "./operations";

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
