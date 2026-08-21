# MCP tools

Status: Implemented and locally contract-tested

One authenticated `POST /api/mcp` endpoint uses the official MCP TypeScript server package. One
high-entropy Bearer key represents the same owner as `ALLOWED_EMAIL`; each transport still checks its
own credential. Article links follow normal D1 visibility: generated articles are public after
Chinese creation, while explicitly withdrawn articles require an owner browser session.

## Protocol

- Prefer stateless `2026-07-28`, including discovery and routing headers without a session ID.
- Accept the stateless `2025-11-25` initialize-era compatibility path.
- Return 405 for GET and DELETE.

## `createArticle`

Input: `{ content: string }`. Content may use any language; AI writes one finished public Chinese
article. The MCP request stores input in TTL-bound KV, publishes the future article UUID in a Queue
create message, and returns promptly without calling model or search providers:

```ts
type CreateArticleResult = { status: "accepted"; articleId: string };
```

Use that ID with `getArticle`; not found means creation has not completed or did not produce an
article. Independent Queue messages derive English and Japanese only after Chinese R2, AI Search, and
D1 writes succeed. The request accepts no locale, visibility, tags, model, skill, or provider
override. Annotations: not read-only, non-destructive, non-idempotent, and open-world.

## `getArticle`

Input: `{ id: string }`. Returns canonical Chinese plus any current derived translations. A missing,
failed, or source-hash-stale translation is omitted so presentation falls back to Chinese. A missing
or unauthorized article returns not found. Annotations: read-only, non-destructive, idempotent,
closed-world.

## `listArticles`

Input: `{ visibility?: "private" | "public"; tags?: string[]; cursor?: string; limit?: number }`.
Omitted visibility means every owner-visible row. Tags use AND matching and parents include
descendants. Limit defaults to 20 and cannot exceed 100. Results are compact canonical Chinese
summaries. Annotations: read-only, non-destructive, idempotent, closed-world.

## `updateArticle`

Input: `{ id: string; expectedHash: string; document: string }`. Stores one complete Chinese Markdown
document, replaces the single Chinese AI Search item, switches D1 projections with optimistic
concurrency, then queues fresh `en` and `ja` derivatives. It does not call the writing model or
rewrite submitted Chinese. Translation failure cannot roll back Chinese. Annotations: not read-only,
not destructive, idempotent for the same hash and content, closed-world.

## `deleteArticle`

Input: `{ id: string; expectedHash: string }`. Withdraws the D1 row, removes all deterministic R2
objects, caches, and the single Chinese AI Search item, then deletes the row and cascaded translation
metadata. Annotations: not read-only, destructive, idempotent, closed-world.

## `searchArticles`

Input: `{ query: string; tags?: string[]; limit?: number }`. Runs Chinese-only AI Search hybrid
retrieval, re-authorizes every article ID through D1, and returns canonical Chinese titles, summaries,
tags, excerpts, and scores. Annotations: read-only, non-destructive, idempotent, open-world.

## `chatArticles`

Input: `{ messages: { role: "user" | "assistant"; content: string }[] }`. Answers from the
Chinese-only knowledge index and returns authorized article IDs as citations. Annotations: read-only,
non-destructive, idempotent, open-world.

## `listTags`

Input: `{ parent?: string }`. Returns canonical hierarchical tag paths and counts, optionally below a
parent. Annotations: read-only, non-destructive, idempotent, closed-world.

## `setVisibility`

Input: `{ id: string; visibility: "private" | "public"; expectedHash: string }`. The owner may
explicitly withdraw a default-public article or publish it again. Annotations: not read-only, not
destructive, idempotent, closed-world.

## Not exposed and verification

There are no task-status, cancellation, reindex, classify, explicit translate, relation,
model-selection, provider, prompt, or raw skill tools. The local contract covers discovery, auth,
schemas, annotations, direct reads, nested tags, stale writes, visibility, private non-disclosure,
and legacy initialize. Queue delivery, model calls, AI Search mutation, and destructive remote
cleanup remain release smoke work.
