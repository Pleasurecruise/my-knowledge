# MCP tools

Status: Implemented and locally contract-tested

Expose one authenticated `POST /api/mcp` endpoint with the official MCP TypeScript server package.
One high-entropy Bearer key represents the owner. Tools call the same application operations as the
web read layer; `deleteArticle` is also used by the one authenticated browser mutation.

This is a single-person product: whoever holds the Bearer key is the same person as `ALLOWED_EMAIL`,
not a second principal. The key and the browser's Better Auth session are simply two credential paths
to that one owner, each still checked against its own transport — the key authorizes only the
`/api/mcp` request that carries it, and a browser tab needs its own signed-in session. A link built
from a tool result (for example an article slug from `listArticles`) therefore still renders as not
found in a browser tab that has not separately signed in, because every generated article starts
private.

## Protocol

- Prefer stateless `2026-07-28`, including `server/discover`, protocol and routing headers, and no
  session ID.
- Accept the stateless `2025-11-25` initialize-era compatibility path.
- Return 405 for GET and DELETE.
- Keep protocol branching inside the transport adapter.

## `createArticle`

Input: `{ content: string }`. The content may use any language; AI always writes one finished
Chinese article, then an internal translation step produces matching English and Japanese editions
before anything is stored. The request deliberately has no locale, visibility, tags, model, skill, or
provider override.

Creates an asynchronous job, stores the input in expiring KV, and publishes only the job ID to Queue.
It does not call the writing, translation, or search-index providers. Returns promptly:

```ts
type CreateArticleResult = { status: "accepted"; jobId: string };
```

Annotations: not read-only, non-destructive, non-idempotent, and open-world because it calls the
configured model provider.

Submission uses KV, D1, and Queue. The consumer serializes creation to protect provider allowances;
each job may therefore wait in `pending` and take several minutes once `processing`. The Worker cannot
hold the request open until a terminal result exists — processing routinely outlives the request's own
time limit — so returning only the job ID is deliberate, not a shortcut a client should compensate for
by polling in a tight loop. Returning the job ID is the complete result of this call; keep it and check
`getArticleJob` again later, on whatever cadence suits the client, and never resubmit the same content
while that job remains active. Consult the account dashboard for current limits rather than relying on
numbers copied into this repository. Use `listTags` or `listArticles` for a connection check;
`createArticle` creates durable work and is not a health-check operation.

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
until the status is `created`, `duplicate`, or `failed`. `pending` and `processing` mean the original
job is still active, not that the client should call `createArticle` again.

## `getArticle`

Input: `{ id: string }`. Returns the authorized article with its Chinese, English, and Japanese
Markdown editions. A missing or unauthorized ID produces the same not-found result.

Annotations: read-only, non-destructive, idempotent, closed-world.

## `listArticles`

Input: `{ visibility?: "private" | "public"; tags?: string[]; cursor?: string; limit?: number }`.
Omitted visibility means all owner-visible articles. Tags use AND matching and parent tags include
descendants. Limit defaults to 20 and cannot exceed 100. Returns compact summaries and an opaque
cursor, never every Markdown body.

Annotations: read-only, non-destructive, idempotent, closed-world.

## `updateArticle`

Input: `{ id: string; expectedHash: string; document: string }`. The caller supplies only the
finished Chinese Markdown; its frontmatter contains title, summary, and tags. The operation
translates that document into fresh `en` and `ja` editions, validates all three, refreshes
article-row projections, syncs all three editions to AI Search, removes any other legacy edition, and
rejects a stale hash without overwriting newer content.

It does not call the writing model or silently rewrite the submitted Chinese content; translation only
mirrors that content into the other two editions. The expected hash is checked before indexing so
stale requests do not spend provider work; the D1 update still repeats the hash condition to close the
concurrency race.

Annotations: not read-only, not destructive, idempotent for the same expected hash and content,
closed-world.

## `deleteArticle`

Input: `{ id: string; expectedHash: string }`. Makes the D1 row private, removes Markdown, cache, and
AI Search items, then deletes the row. Repeating a completed deletion returns not found and makes no
further change.

Annotations: not read-only, destructive, idempotent, closed-world.

## `searchArticles`

Input: `{ query: string; tags?: string[]; limit?: number }`. Runs AI Search hybrid retrieval with
optional nested-tag filters and returns IDs, titles, summaries, tags, excerpts, and scores. Every
result is re-authorized through D1. Limit defaults to 10 and cannot exceed 50.

Annotations: read-only, non-destructive, idempotent, open-world because retrieval may call AI Search
and its connected models.

## `chatArticles`

Input: `{ messages: { role: "user" | "assistant"; content: string }[] }`. Answers a question grounded
in the owner's knowledge base, returning the generated answer plus the article IDs used as citations.
Every citation resolves to an article authorized for the owner session.

Annotations: read-only, non-destructive, idempotent, open-world because generation may call AI Search
and its connected models.

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
Worker. Queue delivery, duplicate creation, AI Search-backed updates, and destructive cleanup require
the owner's live bindings at release smoke.
