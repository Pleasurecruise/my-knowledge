# Simple content flow

Status: Proposed

The cloud product keeps docu.md's core flow: AI creates semantic Markdown and the publication surface
makes it finished. Storage, tags, links, search, privacy, and MCP are cloud additions, not an editorial
approval pipeline.

## Create

`createArticle` accepts conversation content. The content remains in request memory and is never
written to D1, R2, KV, application logs, or a job record. AI Gateway payload logging and caching are
disabled; the configured upstream provider must meet the owner's retention requirement.

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

`translateArticle` produces English frontmatter and Markdown while preserving tags, links, code,
charts, diagrams, and claim strength. Failure stores neither language.

### 4. Compare

Compute the canonical bilingual `contentHash`, embed the Chinese title, summary, and body, and query
Vectorize. An exact hash or a score above the duplicate threshold returns the closest authorized
article and stores nothing. Lower-scoring neighbors become semantic related edges at read time.

### 5. Save

Parse both Markdown documents, validate tags, resolve wiki links, and validate supported blocks. Use
the versioned R2, Vectorize, and D1 order defined in [Database](DATABASE.md), with visibility forced to
`private`.

Return the finished private article directly. There is no background job or polling.

## Web discovery

Anonymous Home and Articles requests match normalized keywords against D1 title, summary, slug, and
tag projections over public rows only; body full-text search is outside the first release. They never
call a model. The signed-in owner uses the same UI over all authorized rows and may switch Home to AI
mode. AI mode embeds the question, retrieves at most eight authorized articles, and asks the custom
provider for an answer that cites only those articles. Validate every returned citation before
rendering and refuse when the retrieved material is insufficient.

Web questions, retrieved context, and generated answers remain request-only and are not stored. This
read flow does not run article-writing skills or alter similarity data.

## MCP mutations, reads, and search

- `getArticle` reads one authorized bilingual article.
- `listArticles` filters by visibility, nested tags, and pagination.
- `updateArticle` saves edited final Markdown, tags, links, hash, and vector with an expected hash.
- `deleteArticle` makes the D1 row private before removing Markdown, cache, vector, and the row.
- `searchArticles` combines text/tag filters with semantic search and re-authorizes every result.
- `listTags` returns the hierarchical tag tree and counts visible to the principal.
- `setVisibility` is the explicit owner-only private/public action.

Create, update, tag/link changes, translation replacement, and visibility changes are MCP-only.
Authenticated web pages may call the same `deleteArticle` operation after explicit confirmation. Web
search and article reads are read-only. These direct operations do not create jobs, revisions, audit
records, or hidden fallbacks.

## Failure behavior

- Invalid MCP input returns a validation error.
- Provider, translation, frontmatter, or block validation failure stores nothing.
- Duplicate content returns the closest article summary and does not write.
- Unauthorized reads behave as not found.
- Cache failure reads from D1/R2 and remains observable.
- Vector failure blocks create/update so search never silently becomes stale.
