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
from the MCP request. A 20-minute claim lease prevents overlapping work, while terminal jobs are
acknowledged without rerunning. A caught processing failure releases the claim before using
Cloudflare's default retry behavior. KV's eventual consistency is handled through the same path.
After the default three retries, the fourth failure records one sanitized error, deletes the input,
and acknowledges the message.

### 1. Prepare skills

Read the existing tag tree, then let the small project-owned selector choose the minimal skill set.
Waza `write` is always present. It adds `vega` for real quantitative data and `canvas` for a useful
concept map. Ordinary prose loads neither visual skill.

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

### 3. Translate in parallel

Start independent `en` and `ja` translation calls from the finished Chinese article and wait for both.
Each call only mirrors the already-written Chinese result; it does not draft, summarize, tag, or link
independently. There is no pre-save content-hash or similarity lookup. Invalid or incomplete output
stores nothing, the same as an invalid writing result.

### 4. Validate and save

Parse all three Markdown editions, validate tags, resolve wiki links, and validate supported blocks.
Use the conditional R2, AI Search, and D1 order defined in [Database](DATABASE.md), with visibility

Record the created article ID in the terminal job result, then delete the KV input. `getArticleJob`
resolves that ID through the normal authorized article read and returns the current state or terminal
result. `createArticle` already returned its complete result (the job ID); calling `getArticleJob`
again to learn `created` or `failed` is the client's choice and cadence, not a loop the server expects
it to run continuously.

## Web discovery

Home routes anonymous queries through the AI Search `my-knowledge` instance: hybrid retrieval ranked by
score, with every result re-authorized through D1 (published rows only) so private content never
leaks. Owner queries keep D1 keyword/tag matching across all rows; body full-text search is outside
the first release. Articles is a chronological index and has no search or filter controls. Web
discovery never calls a model.

## Browser authoring

The allowed-email owner can create or edit canonical Chinese Markdown from the Article surface. The
New action appears only with the Chinese interface, and the new-article editor always uses Chinese
labels; direct route access remains owner-authorized. A save regenerates its one-sentence Chinese
summary, translates the result into `en` and `ja` concurrently, validates all three documents, and
replaces the version through the existing R2, AI Search, and D1 write order. A legacy edition outside
the current three is removed. New articles start private. Publish, withdraw, and delete remain
explicit operations guarded by the current content hash.

## MCP mutations, reads, and search

- `getArticle` reads one authorized article with its Chinese, English, and Japanese editions.
- `listArticles` uses a stable updated-time/ID cursor and filters by visibility and nested tags.
- `updateArticle` saves edited final Chinese Markdown, tags, links, and hash with an expected hash,
  translating the submitted document into refreshed `en`/`ja` editions concurrently and syncing all
  three to AI Search.
- `deleteArticle` makes the D1 row private before removing cached editions, Markdown, AI Search
  items, and the row.
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
- Repeated content is accepted as a new private article; creation performs no duplicate lookup.
- Translation failure blocks create/update so an article is never stored with a missing or invalid
  edition.
- Unauthorized reads behave as not found.
- Cache failure is logged, reads canonical R2, and never bypasses the preceding D1 authorization.
- AI Search index failure blocks create/update so search never silently becomes stale.
