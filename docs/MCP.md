# MCP tools

Status: Implemented and locally contract-tested

One authenticated `POST /api/mcp` endpoint uses the official MCP TypeScript server package. The
generated high-entropy Bearer key represents the same owner as `ALLOWED_EMAIL` and is shared with the
REST API; only the owner browser session may generate or regenerate it. Article links follow normal
D1 visibility, so private articles require owner authorization.

## Protocol

- Prefer stateless `2026-07-28`, including discovery and routing headers without a session ID.
- Accept the stateless `2025-11-25` initialize-era compatibility path.
- Reject a supplied `Mcp-Session-Id`; the endpoint never creates protocol sessions.
- Return 405 for GET and DELETE.

## `createArticle`

Input: `{ document: string }`. The document is complete semantic Chinese Markdown with ordered
`title`, `summary`, and `tags` frontmatter. The server validates it, writes Chinese to R2 and AI
Search, commits the public D1 row, and returns the stored article immediately. It performs no model
call or translation. Annotations: not read-only, non-destructive, non-idempotent, and closed-world.

## `getArticle`

Input: `{ id: string }`. Returns canonical Chinese plus any current supplied translations. A missing,
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
document, replaces the single Chinese AI Search item, and switches D1 projections with optimistic
concurrency. It does not generate, translate, or rewrite submitted Chinese. Existing translations
become stale until REST supplies replacements for the new hash. Annotations: not read-only, not
destructive, idempotent for the same hash and content, closed-world.

## `deleteArticle`

Input: `{ id: string; expectedHash: string }`. Withdraws the D1 row, removes all deterministic R2
objects, caches, and the single Chinese AI Search item, then deletes the row and cascaded translation
metadata. Annotations: not read-only, destructive, idempotent, closed-world.

## `searchArticles`

Input: `{ query: string; tags?: string[]; limit?: number }`. Runs Chinese-only AI Search hybrid
retrieval, re-authorizes every article ID through D1, and returns canonical Chinese titles, summaries,
tags, excerpts, and scores. Annotations: read-only, non-destructive, idempotent, open-world.

## `listTags`

Input: `{ parent?: string }`. Returns canonical hierarchical tag paths and counts, optionally below a
parent. Annotations: read-only, non-destructive, idempotent, closed-world.

## `setVisibility`

Input: `{ id: string; visibility: "private" | "public"; expectedHash: string }`. The owner may
explicitly withdraw a default-public article or publish it again. Annotations: not read-only, not
destructive, idempotent, closed-world.

## Not exposed and verification

There are no task-status, chat, cancellation, reindex, classify, translate, relation, model,
provider, prompt, or skill tools. The local contract covers discovery, auth,
schemas, annotations, direct reads, nested tags, stale writes, visibility, private non-disclosure,
and legacy initialize. Successful live AI Search mutation and destructive remote cleanup remain
release smoke work.
