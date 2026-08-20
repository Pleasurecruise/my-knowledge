# Database and persistence

Status: Implemented locally; production resources await owner setup

D1 is the query index and job state store, R2 owns Markdown, KV holds disposable cached output and
expiring job input, AI Search owns vectorization and retrieval, and Drizzle is the typed D1 query
layer. The content model keeps frontmatter properties, nested tag paths, wiki links, backlinks, and
graph views without adding a database server or normalized relation tables.

## D1

The application owns two tables. `articles` stores:

- `id`, `slug`, `contentHash`;
- `metaJson`: title and summary keyed by edition, `zh`/`en`/`ja` required on every current row;
- `tagsJson`: normalized tag paths;
- `linksJson`: referenced wiki-link slugs;
- `visibility`, `createdAt`, `updatedAt`.

`articleJobs` stores only `id`, `status`, nullable `resultJson`, `createdAt`, and `updatedAt`. Status is
`pending`, `processing`, `created`, or `failed`. Pending and processing rows have no result. Terminal
JSON contains either an article ID or a sanitized error. It never contains submitted content,
generated Markdown, prompts, or search index entries.

Better Auth owns its standard `user`, `session`, `account`, and `verification` tables. Do not add a
profile, role, token, tag, link, revision, relation, source, or deletion table.

Make `id` the primary key and `slug` unique. `contentHash` is intentionally non-unique because
separate submissions may produce identical Chinese content. Add only one project index on
`(visibility, updatedAt)`. Store timestamps as UTC ISO strings. Generate IDs with
`crypto.randomUUID()` and keep slugs stable after creation.

Tag counts use one recursive SQLite query over `json_each(tagsJson)`. It expands every hierarchical
prefix and counts an article once per prefix; anonymous execution filters public rows inside the same
query. Wiki links and backlinks join `json_each(linksJson)` to `articles.slug`; Graph combines those
links with shared tags. Normalize into more tables only after a measured D1 bottleneck.

## R2 and KV

R2 stores the three current editions side by side:

```text
knowledge/{primaryTagPath?}/{articleSlug}/zh.md
knowledge/{primaryTagPath?}/{articleSlug}/en.md
knowledge/{primaryTagPath?}/{articleSlug}/ja.md
```

The complete first tag is the optional folder path, so `engineering/frontend` produces nested
folders; an untagged article begins directly with its stable slug. Changing the first tag moves every
edition together. Keys remain derived from existing D1 projections, so D1 does not store a path or
category field. Hashes never appear in R2 paths. Canonical Markdown uses LF line endings, one final
newline, and frontmatter ordered as `title`, `summary`, then `tags` for every edition. `contentHash`
remains lowercase SHA-256 over `zh`, one NUL byte, the canonical Chinese Markdown bytes, and one NUL
byte — only the authored Chinese edition participates in the hash, since `en`/`ja` are derived from it.
It is concurrency metadata for D1, KV, and the AI Search index rather than a folder name. A create or
update writes all three editions together; a legacy edition outside this set is removed rather than
kept.

D1 `metaJson`, `tagsJson`, and `linksJson` are parsed projections used for lists, filters, backlinks,
and Graph, avoiding an R2 read for every row; `metaJson` carries title and summary for all three
editions. KV caches each parsed public edition under `articles/{articleId}/{contentHash}/{locale}.json`
with a 24-hour TTL. A public read first authorizes the D1 row, then checks KV for the requested
locale, reads canonical R2 Markdown on a miss, validates it, and writes the parsed edition back to KV.
Private articles never read from or write to KV. Invalid or unavailable cache data is observable and
falls back to canonical R2; KV never authorizes access.

KV also stores submitted creation input under `article-jobs/{jobId}/input` with a 48-hour TTL. This
entry is a transient handoff to the Queue consumer, not canonical knowledge. The producer deletes it
if D1 insertion or Queue publication fails; the consumer deletes it after any terminal result. Queue
messages contain only the job ID, and D1 never stores the input.

## Writes

Cloudflare stores do not share a transaction.

Create or update in this order:

1. validate the generated Chinese structure, translate it into `en` and `ja` concurrently, then
   canonicalize and validate the complete three-edition set;
2. read the current R2 document set and ETags for an update, including legacy editions;
3. conditionally write all three documents: an unchanged path must match its previous ETag and a moved
   or new path must not already exist;
4. upload the three Markdown editions to the AI Search `my-knowledge` instance under deterministic item keys
   derived from the article ID, which overwrite the previous version on update;
5. insert the D1 row, or update it with `WHERE id = ? AND contentHash = expectedHash`;
6. after success, invalidate the previous KV version and delete superseded edition paths. A failed
   update restores the previous AI Search items instead of leaving a partial index.

Visibility changes touch only D1 and the cache. The index keeps every article under its item key
regardless of visibility; consumption re-authorizes each result through D1, so a withdrawn or
deleted article never reaches an anonymous response.

If a later write fails, restore overwritten objects with the ETags returned by the conditional write,
delete newly created paths, and remove the new AI Search items. A conflicting object write fails
rather than overwriting another update. Search results are re-authorized through D1 and must match
the current article ID and hash, so the index never authorizes a result and an orphan is never
visible.

Delete snapshots the current R2 ETags, sets D1 visibility to `private`, then deletes unchanged
KV/R2/AI Search items before deleting the D1 row. If external cleanup fails, the private row remains
for a retry. Public reads
always check D1 visibility before KV or R2.

## Migrations

Numbered SQL under `apps/web/migrations` is authoritative. Keep the Drizzle schema as a typed mirror.
Apply migrations only with the root `d1:migrate:local` and `d1:migrate:remote` Wrangler commands.
Never edit an applied migration; add a forward migration.
