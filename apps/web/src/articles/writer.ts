import { DurableObject } from "cloudflare:workers";
import type { Visibility } from "@my-knowledge/content";
import {
  createArticleFromDraft,
  createArticleFromDocuments,
  updateArticleFromDraft,
  updateArticleFromDocuments,
  type ArticleDraft,
  type ArticleDocuments,
  type ArticleUpdateResult,
  InvalidArticleInputError,
} from "./operations";
import { getArticleRow } from "./persistence/document";
import { deleteArticle, setArticleVisibility } from "./persistence/write";

export type ArticleWriteResult<Value> = { status: "ok"; value: Value } | { status: "invalidInput" };

// One actor per article serializes the complete R2/search/D1 operation, including rollback.
export class ArticleWriter extends DurableObject<CloudflareEnv> {
  private writes: Promise<unknown> = Promise.resolve();

  private run<Value>(operation: () => Promise<Value>): Promise<ArticleWriteResult<Value>> {
    const next = this.writes.then(async (): Promise<ArticleWriteResult<Value>> => {
      try {
        return { status: "ok", value: await operation() };
      } catch (error) {
        if (error instanceof InvalidArticleInputError) return { status: "invalidInput" };
        throw error;
      }
    });
    this.writes = next.catch(() => undefined);
    return next;
  }

  createDraft(id: string, draft: ArticleDraft) {
    return this.run(() => createArticleFromDraft(this.env, draft, id));
  }

  createDocuments(id: string, documents: ArticleDocuments) {
    return this.run(() => createArticleFromDocuments(this.env, documents, id));
  }

  updateDraft(
    id: string,
    hash: string,
    updatedAt: string,
    draft: ArticleDraft & { visibility?: Visibility | undefined },
  ): Promise<ArticleWriteResult<ArticleUpdateResult>> {
    return this.run(async () => {
      if (await this.ctx.storage.get("deleting")) return { status: "stale" };
      return updateArticleFromDraft(this.env, id, hash, updatedAt, draft);
    });
  }

  updateDocuments(
    id: string,
    hash: string,
    updatedAt: string,
    documents: ArticleDocuments,
  ): Promise<ArticleWriteResult<ArticleUpdateResult>> {
    return this.run(async () => {
      if (await this.ctx.storage.get("deleting")) return { status: "stale" };
      return updateArticleFromDocuments(this.env, id, hash, updatedAt, documents);
    });
  }

  setVisibility(id: string, hash: string, updatedAt: string, visibility: Visibility) {
    return this.run(async () => {
      if (await this.ctx.storage.get("deleting")) return undefined;
      const row = await getArticleRow(this.env, "owner", id);
      if (!row || row.contentHash !== hash || row.updatedAt !== updatedAt) return undefined;
      return setArticleVisibility(this.env, id, hash, visibility);
    });
  }

  delete(id: string, hash: string, updatedAt: string) {
    return this.run(async () => {
      const row = await getArticleRow(this.env, "owner", id);
      if (!row || row.contentHash !== hash || row.updatedAt !== updatedAt) return false;
      // Retained on cleanup failure and across actor restarts; only deletion may resume.
      await this.ctx.storage.put("deleting", true);
      return deleteArticle(this.env, id, hash);
    });
  }
}
