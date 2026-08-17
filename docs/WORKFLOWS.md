# Simple content flow

Status: Implemented; live provider smoke awaits owner credentials and retention approval

The cloud product keeps docu.md's core flow: AI creates semantic Markdown and the publication surface
makes it finished. Storage, tags, links, search, privacy, and MCP are cloud additions, not an editorial
approval pipeline.

## Create

`createArticle` accepts conversation content and an explicit BCP 47 locale set containing `zh` and
`en`. The content remains in request memory and is never written to D1, R2, KV, application logs, or
a job record. AI Gateway payload logging and caching are disabled; the configured upstream provider
must meet the owner's retention requirement.

### 1. Prepare context and skills

Read the existing tag tree and use one in-memory input embedding to retrieve at most eight authorized
article titles, summaries, and slugs. This bounded context lets the model reuse tags and propose real
wiki links; it is never persisted. The small project-owned selector then chooses the minimal skill
set. Waza `write` is always present. It adds `vega` for real quantitative data and `canvas` for a
useful concept map. Ordinary prose loads neither visual skill.

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

### 3. Translate

`translateArticle` produces every locale requested by the validated creation operation while
preserving tags, links, code, charts, diagrams, and claim strength. Failure stores no edition.

### 4. Compare

Compute the canonical locale-set `contentHash`, embed the Chinese title, summary, and body, and query
Vectorize. An exact hash or a score above the duplicate threshold returns the closest authorized
article and stores nothing. Lower-scoring neighbors become article-page semantic relationships at
read time.

### 5. Save

Parse every requested Markdown edition, validate tags, resolve wiki links, and validate supported blocks. Use
the conditional R2, Vectorize, and D1 order defined in [Database](DATABASE.md), with visibility forced to
`private`.

Return the finished private article directly. There is no background job or polling.

## Web discovery

Home matches normalized keywords and tags against D1 projections over authorized rows; body full-text
search is outside the first release. Articles is a chronological index and has no search or filter
controls. Anonymous discovery never calls a model. The signed-in owner may switch Home to AI mode,
which retrieves at most eight authorized articles and returns an answer with validated citations.

Web questions, retrieved context, and generated answers remain request-only and are not stored. This
read flow does not run article-writing skills or alter similarity data.

## Browser authoring

The allowed-email owner can create or edit canonical Markdown from the Article surface. A save uses
the edited locale as source, regenerates its one-sentence summary, synchronizes every stored edition
while retaining required Chinese and English, validates the complete locale set, and replaces the
version through the existing R2, Vectorize, and D1 write order. New articles start private. Publish,
withdraw, and delete remain explicit operations guarded by the current content hash.

## MCP mutations, reads, and search

- `getArticle` reads one authorized locale-keyed article.
- `listArticles` uses a stable updated-time/ID cursor and filters by visibility and nested tags.
- `updateArticle` saves edited final Markdown, tags, links, hash, and vector with an expected hash.
- `deleteArticle` makes the D1 row private before removing cached editions, Markdown, vector, and the
  row.
- `searchArticles` combines text/tag filters with semantic search and re-authorizes every result.
- `listTags` expands and counts canonical hierarchical tag paths in one D1 `json_each` query while
  applying the caller's visibility boundary.
- `setVisibility` is the explicit owner-only private/public action.

MCP and browser authoring share the same Article persistence boundaries. Browser saves own automatic
summary and translation synchronization; MCP `updateArticle` continues to accept complete validated
Markdown editions. Neither path creates jobs, revisions, audit records, or hidden fallbacks.

## Failure behavior

- Invalid MCP input returns a validation error.
- Provider, translation, frontmatter, or block validation failure stores nothing.
- Duplicate content returns the closest article summary and does not write.
- Unauthorized reads behave as not found.
- Cache failure is logged, reads canonical R2, and never bypasses the preceding D1 authorization.
- Vector failure blocks create/update so search never silently becomes stale.
