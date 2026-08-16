# MCP tools

Status: Proposed

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

Input: `{ content: string }`. It deliberately has no visibility, tags, model, skill, or provider
override.

Runs skill selection, writing, translation, similarity, and private persistence. Returns either:

```ts
type CreateArticleResult =
  | { status: "created"; article: Article }
  | { status: "duplicate"; similarArticle: ArticleSummary; score: number };
```

Annotations: not read-only, non-destructive, non-idempotent, and open-world because it calls the
configured model provider.

## `getArticle`

Input: `{ id: string }`. Returns the authorized metadata plus Chinese and English Markdown. A missing
or unauthorized ID produces the same not-found result.

Annotations: read-only, non-destructive, idempotent, closed-world.

## `listArticles`

Input: `{ visibility?: "private" | "public"; tags?: string[]; cursor?: string; limit?: number }`.
Omitted visibility means all owner-visible articles. Tags use AND matching and parent tags include
descendants. Limit defaults to 20 and cannot exceed 100. Returns compact summaries and an opaque
cursor, never every Markdown body.

Annotations: read-only, non-destructive, idempotent, closed-world.

## `updateArticle`

Input: `{ id: string; expectedHash: string; zhMarkdown: string; enMarkdown: string }`. Frontmatter
contains title, summary, and tags. The operation validates both documents, refreshes the article-row
projections and vector, and rejects a stale hash without overwriting newer content.

It does not call the model or silently retranslate content.

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

Input: `{ parent?: string }`. Returns the owner's hierarchical tag tree with direct and descendant
article counts. Anonymous tag counts belong to the public web query, not the authenticated MCP tool.

Annotations: read-only, non-destructive, idempotent, closed-world.

## `setVisibility`

Input: `{ id: string; visibility: "private" | "public"; expectedHash: string }`. Only the owner can
call it. Creation cannot call it internally. Making an article private closes public D1 access before
cache, feed, search, and graph invalidation.

Annotations: not read-only, not destructive, idempotent, closed-world.

## Not exposed

There are no job, cancellation, reindex, classify, translate, relation, model-selection, provider,
prompt, or raw skill tools. Skills are an internal implementation detail of `createArticle`.

## Verification

Contract tests cover modern discovery and direct calls, legacy initialize, Bearer authentication,
required headers, schemas, annotations, duplicate results, stale updates, forced-private creation,
nested tags, destructive deletion, and private non-disclosure against real clients.
