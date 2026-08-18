# MCP tools

Status: Implemented and locally contract-tested

Expose one authenticated `POST /api/mcp` endpoint with the official MCP TypeScript server package.
One high-entropy Bearer key represents the owner. Tools call the same application operations as the
web read layer; `deleteArticle` is also used by the one authenticated browser mutation.

## Protocol

- Prefer stateless `2026-07-28`, including `server/discover`, protocol and routing headers, and no
  session ID.
- Accept the stateless `2025-11-25` initialize-era compatibility path.
- Return 405 for GET and DELETE.
- Keep protocol branching inside the transport adapter.

## `createArticle`

Input: `{ content: string }`. The content may use any language; AI always produces one finished
Chinese article. The request deliberately has no locale, visibility, tags, model, skill, or provider
override.

Creates an asynchronous job, stores the input in expiring KV, and publishes only the job ID to Queue.
It does not call the writing or embedding providers. Returns promptly:

```ts
type CreateArticleResult = { status: "accepted"; jobId: string };
```

Annotations: not read-only, non-destructive, non-idempotent, and open-world because it calls the
configured model provider.

Submission uses KV, D1, and Queue. The consumer serializes creation to protect provider allowances;
consult the account dashboard for current limits rather than relying on numbers copied into this
repository. Use `listTags` or `listArticles` for a connection check; `createArticle` creates durable
work and is not a health-check operation.

## `getArticleJob`

Input: `{ jobId: string }`. Returns `pending` or `processing`, or one terminal result:

```ts
type ArticleJobResult =
  | { status: "pending" | "processing"; jobId: string }
  | { status: "created"; jobId: string; article: Article }
  | { status: "duplicate"; jobId: string; similarArticle: ArticleSummary; score: number }
  | { status: "failed"; jobId: string; error: string };
```

A missing job returns not found. An accepted client polls this read-only, idempotent, closed-world tool
until the status is `created`, `duplicate`, or `failed`.

## `getArticle`

Input: `{ id: string }`. Returns the authorized article and its Chinese Markdown. A missing or
unauthorized ID produces the same not-found result.

Annotations: read-only, non-destructive, idempotent, closed-world.

## `listArticles`

Input: `{ visibility?: "private" | "public"; tags?: string[]; cursor?: string; limit?: number }`.
Omitted visibility means all owner-visible articles. Tags use AND matching and parent tags include
descendants. Limit defaults to 20 and cannot exceed 100. Returns compact summaries and an opaque
cursor, never every Markdown body.

Annotations: read-only, non-destructive, idempotent, closed-world.

## `updateArticle`

Input: `{ id: string; expectedHash: string; document: string }`. The Chinese Markdown frontmatter
contains title, summary, and tags. The operation validates the document, refreshes article-row
projections and the vector, removes superseded legacy editions, and rejects a stale hash without
overwriting newer content.

It does not call the model or silently rewrite content.
The expected hash is checked before embedding so stale requests do not spend provider work; the D1
update still repeats the hash condition to close the concurrency race.

Annotations: not read-only, not destructive, idempotent for the same expected hash and content,
closed-world.

## `deleteArticle`

Input: `{ id: string; expectedHash: string }`. Makes the D1 row private, removes Markdown, cache, and
vector data, then deletes the row. Repeating a completed deletion returns not found and makes no
further change.

Annotations: not read-only, destructive, idempotent, closed-world.

## `searchArticles`

Input: `{ query: string; tags?: string[]; limit?: number }`. Combines semantic ranking with optional
nested-tag filters and returns IDs, titles, summaries, tags, excerpts, and scores. Every vector result
is re-authorized through D1. Limit defaults to 10 and cannot exceed 50.

Annotations: read-only, non-destructive, idempotent, open-world because embedding inference may call
Workers AI.

## `listTags`

Input: `{ parent?: string }`. Returns the owner's canonical hierarchical tag paths and article
counts, optionally scoped by a parent path. Anonymous tag counts belong to the public web query, not
the authenticated MCP tool.

Annotations: read-only, non-destructive, idempotent, closed-world.

## `setVisibility`

Input: `{ id: string; visibility: "private" | "public"; expectedHash: string }`. Only the owner can
call it. Creation cannot call it internally. Making an article private closes public D1 access before
cache, feed, search, and graph invalidation.

Annotations: not read-only, not destructive, idempotent, closed-world.

## Not exposed

There are no cancellation, reindex, classify, translate, relation, model-selection, provider, prompt,
or raw skill tools. Skills are an internal implementation detail of the queued creation pipeline.

## Verification

The local contract covers modern discovery, job polling discovery/not-found behavior, direct reads,
legacy initialize, Bearer authentication, required headers, Chinese document schemas, annotations,
nested tags, stale writes, visibility changes, and private non-disclosure against the generated
Worker. Queue delivery, duplicate creation, vector-backed updates, and destructive cleanup require
the owner's live bindings at release smoke.
