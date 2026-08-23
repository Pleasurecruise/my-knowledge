# Content flows

Status: Implemented locally; remote-store smoke awaits owner approval

## Local ingestion

Content generation, translation, and editorial decisions run outside this application. The local
workflow submits completed semantic Markdown through authenticated REST or MCP. The Worker has no
Queue consumer, temporary job input, model provider, prompt, or runtime skill registry.

REST accepts `{ documents: { zh, en?, ja? } }`. MCP `createArticle` accepts one Chinese `document`.
The server validates frontmatter, Markdown safety, tags, wiki links, and cross-edition structure,
allocates one UUID and slug, then writes Chinese in this order:

1. conditionally write the stable Chinese R2 object;
2. upload Chinese to AI Search;
3. insert the public D1 row;
4. store any supplied English or Japanese R2 objects and child metadata.

If Chinese storage, indexing, or D1 insertion fails, the attempt rolls back only artifacts it owns.
Supplied editions are presentation derivatives: they never enter AI Search or authorize an article.
A missing or source-hash-stale edition falls back to Chinese.

## Browser authoring

The allowed-email owner creates or edits canonical Chinese Markdown from the existing Article
surface. The editor requires title, one-sentence summary, body, and tags and performs no model call.
Create and update use the same R2, AI Search, and D1 persistence operations as external ingestion.

Publish, withdraw, and delete remain explicit operations. Delete first withdraws the row, cleans the
stable Chinese and translation R2 objects, the Chinese AI Search item, and caches, then deletes the D1
row and cascaded translation metadata.

## Owner API and MCP

The allowed-email session may generate or regenerate this project's API key. REST and MCP compare
the Bearer key against the digest in the `my-knowledge-api-key` Durable Object instance; REST
also accepts the browser session when no Authorization header is present.

- REST supports paginated list, immediate document create, direct read, document or browser-draft
  update, visibility change, and delete.
- MCP supports immediate Chinese document create, direct read, paginated list, Chinese document
  update, delete, AI Search, tags, and visibility.
- Chinese update and deletion require `expectedHash` optimistic concurrency.
- AI Search owns hybrid retrieval and every result is re-authorized through D1.

## Failure behavior

- Invalid semantic Markdown stores no article.
- R2, AI Search, or D1 failure before Chinese commit rolls back artifacts owned by that attempt.
- A failed supplied translation does not withdraw successfully committed Chinese; the caller may
  retry with the current Chinese hash.
- Unauthorized reads do not reveal private titles, metadata, or bodies.
- Cache failure is observable and falls back to authorized canonical R2.
