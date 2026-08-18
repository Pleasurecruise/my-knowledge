# Simple content flow

Status: Implemented; live provider smoke awaits owner credentials and retention approval

The cloud product keeps docu.md's core flow: AI creates semantic Markdown and the publication surface
makes it finished. Storage, tags, links, search, privacy, and MCP are cloud additions, not an editorial
approval pipeline.

## Create

`createArticle` accepts conversation content in any language. The AI understands that input and
always writes one Simplified Chinese article. The web Worker stores the content in an expiring KV
entry, creates a pending D1 job without the content, publishes only its job ID to Queue, and returns
immediately. AI Gateway payload logging and caching are disabled; the configured upstream provider
must meet the owner's retention requirement.

The Worker's Queue handler conditionally changes a pending job to processing in an invocation separate
from the MCP request. A 20-minute claim lease lets a redelivery recover interrupted work, while
terminal jobs are acknowledged without rerunning. KV's eventual consistency is handled as a
retryable missing-input condition. Processing retries three times; the final failure records one
sanitized error and deletes the input.

### 1. Prepare context and skills

Read the existing tag tree and use one in-memory input embedding to retrieve at most eight authorized
article titles, summaries, and slugs. Long inputs split into paragraphs under a 12,000-character
budget, embed in one batched call, and mean-pool to one normalized vector, so the single-vector
index contract holds while BGE-M3's 8,192-token input limit never truncates content; inputs within
the budget keep the single-call path. This bounded context lets the model reuse tags and propose
real wiki links; it is never persisted. The small project-owned selector then chooses the minimal
skill set. Waza `write` is always present. It adds `vega` for real quantitative data and `canvas`
for a useful concept map. Ordinary prose loads neither visual skill.

### 2. Write

The custom provider receives the article contract, bounded knowledge context, adapted Waza material,
and selected project-owned rich-content guidance. Project rules override upstream output wrappers. It
returns Chinese YAML frontmatter and Markdown:

- title and one-sentence summary;
- at most five Obsidian-compatible hierarchical tags;
- optional `[[wiki links]]` to known articles;
- polished body with only supported source blocks.

The model prefers existing tags and may propose at most one new leaf. Invalid structured output stores
nothing.

### 3. Compare

Compute the canonical Chinese `contentHash`, embed the title, summary, and body, and query
Vectorize. An exact hash or a score above the duplicate threshold returns the closest authorized
article and stores nothing — a duplicate never reaches translation. Lower-scoring neighbors become
article-page semantic relationships at read time. Vector IDs stay within the provider's 64-byte
boundary; complete authorization fields live in validated metadata and are checked against D1.

### 4. Translate

Once comparison clears the Chinese article for storage, translate its title, summary, and body into
`en` and `ja` editions. This step only mirrors the already-written Chinese result; it does not draft,
summarize, tag, or link independently. Invalid or incomplete translation output stores nothing, the
same as an invalid writing result.

### 5. Save

Parse all three Markdown editions, validate tags, resolve wiki links, and validate supported blocks.
Use the conditional R2, Vectorize, and D1 order defined in [Database](DATABASE.md), with visibility
forced to `private`.

Record the created article ID or duplicate article ID and score in the terminal job result, then
delete the KV input. `getArticleJob` resolves those IDs through the normal authorized article read and
returns the current state or terminal result. `createArticle` already returned its complete result (the
job ID); calling `getArticleJob` again to learn `created`, `duplicate`, or `failed` is the client's
choice and cadence, not a loop the server expects it to run continuously.

## Web discovery

Home matches normalized keywords and tags against D1 projections over authorized rows; body full-text
search is outside the first release. Articles is a chronological index and has no search or filter
controls. Web discovery never calls a model. The owner searches the same fields across public and
private rows; anonymous readers search public rows only.

## Browser authoring

The allowed-email owner can create or edit canonical Chinese Markdown from the Article surface. The
New action appears only with the Chinese interface, and the new-article editor always uses Chinese
labels; direct route access remains owner-authorized. A save regenerates its one-sentence Chinese
summary, translates the result into `en` and `ja`, validates all three documents, and replaces the
version through the existing R2, Vectorize, and D1 write order. A legacy edition outside the current
three is removed. New articles start private. Publish, withdraw, and delete remain explicit
operations guarded by the current content hash.

## MCP mutations, reads, and search

- `getArticle` reads one authorized article with its Chinese, English, and Japanese editions.
- `listArticles` uses a stable updated-time/ID cursor and filters by visibility and nested tags.
- `updateArticle` saves edited final Chinese Markdown, tags, links, hash, and vector with an expected
  hash, translating the submitted document into refreshed `en`/`ja` editions.
- `deleteArticle` makes the D1 row private before removing cached editions, Markdown, vector, and the
  row.
- `searchArticles` combines text/tag filters with semantic search and re-authorizes every result.
- `listTags` expands and counts canonical hierarchical tag paths in one D1 `json_each` query while
  applying the caller's visibility boundary.
- `setVisibility` is the explicit owner-only private/public action.

MCP and browser authoring share the same Article persistence boundaries and the same translation step
for `en`/`ja`. Browser saves own automatic Chinese summary generation; MCP `updateArticle` accepts one
complete validated Chinese Markdown document. Only MCP conversation creation uses a job; browser
authoring and other mutations remain synchronous and create no revisions, audit records, or hidden
fallbacks.

## Failure behavior

- Invalid MCP input returns a validation error.
- Provider, frontmatter, or block validation failures retry and eventually produce a sanitized failed
  job without storing an article.
- Duplicate content produces the closest article result and does not write another article.
- Translation failure blocks create/update so an article is never stored with a missing or invalid
  edition.
- Unauthorized reads behave as not found.
- Cache failure is logged, reads canonical R2, and never bypasses the preceding D1 authorization.
- Vector failure blocks create/update so search never silently becomes stale.
