# Database and persistence

Status: Implemented; replacement production D1 initialized, Worker deployment pending

D1 indexes canonical Chinese articles and the smallest useful translation metadata. R2 owns every
Markdown body, KV owns disposable caches and TTL-bound creation receipts, and AI Search indexes only
canonical Chinese Markdown.

## D1

The application owns two content tables. `articles` stores `id`, stable `slug`, Chinese `title` and
`summary`, Chinese `contentHash`, `tagsJson`, `linksJson`, `visibility`, `createdAt`, and `updatedAt`.
New rows default to `public`; the owner may explicitly withdraw them to `private`.

`articleTranslations` is a derived child table with exactly `articleId`, `locale`, translated `title`
and `summary`, and `sourceHash`. Its composite primary key is `(articleId, locale)`, locales are
limited to `en` and `ja`, and article deletion cascades. A translation is readable only when
`sourceHash` equals the current Chinese `articles.contentHash`; no status, timestamps, paths, tags,
links, visibility, or body are duplicated into this table.

There is no D1 job table. Better Auth owns its standard `user`, `session`, `account`, and
`verification` tables. Do not add profile, role, token, revision, relation, source, or deletion
tables.

`id` is the article identity, Queue creation identity, R2 directory, and AI Search key prefix. Slugs
remain stable and unique for web URLs. `contentHash` is intentionally non-unique because repeated
submissions create distinct articles. The only project index is `(visibility, updatedAt)`.

Tag counts use one recursive SQLite query over `json_each(tagsJson)`. Wiki links and backlinks join
`json_each(linksJson)` to `articles.slug`; Graph combines those links with shared tags.

## R2 and KV

R2 uses stable article-ID keys:

```text
knowledge/{articleId}/zh.md
knowledge/{articleId}/i18n/en.md
knowledge/{articleId}/i18n/ja.md
```

Chinese Markdown is canonical. Translation objects are derived and may be absent. Every write stores
the Chinese source hash as R2 custom metadata. Markdown frontmatter remains `title`, `summary`, then
`tags`; translations preserve Chinese tags, wiki-link targets, and supported structured blocks.

KV caches parsed public editions under `articles/{articleId}/{contentHash}/{locale}.json` for 24
hours. D1 authorization always precedes cache or R2 reads. A cached or stored translation is selected
only through a current `articleTranslations.sourceHash`; otherwise the caller falls back to Chinese.

Creation input lives only at `article-jobs/{articleId}/input` with a 48-hour TTL. A terminal creation
failure may leave one sanitized receipt at `article-jobs/{articleId}/failure` with the same TTL. The
future article ID is returned as the job ID. D1 never stores submitted input, prompts, provider
output, job state, or failure receipts.

## Writes

Cloudflare stores do not share a transaction. Chinese create uses this order:

1. generate, parse, and validate Chinese Markdown;
2. conditionally write `knowledge/{articleId}/zh.md`;
3. upload only `{articleId}/zh.md` to AI Search;
4. insert the public Chinese D1 row;
5. enqueue independent `en` and `ja` translation messages;
6. delete the input KV entry.

If a step before the D1 insert fails, remove only artifacts written by that attempt whose ETags still
match, then retry the Queue message. Redelivery reuses the same article ID; an existing D1 row is
treated as completed, while an R2 object without its D1 row remains an explicit error.

Chinese update conditionally replaces `zh.md`, uploads the same Chinese AI Search key, and switches
the D1 row with `WHERE id = ? AND contentHash = expectedHash`. It then invalidates the previous cache
and queues translations. Existing translation rows become unreadable immediately because their
`sourceHash` no longer matches; translation failure never rolls back Chinese.

Each translation message reads current Chinese, derives one locale, rechecks the source hash,
conditionally writes its R2 object, then upserts the five-field child row. Translation Markdown is
never uploaded to AI Search. English and Japanese retry and complete independently.

Delete first hides the D1 row, then removes current caches, the Chinese R2 object and translation
objects represented by child rows, the single Chinese AI Search item, and finally the article row;
the translation rows cascade. An external cleanup failure leaves the hidden row available for an
owner retry.

## Migrations

`apps/web/migrations/0001_initial.sql` is the authoritative schema for a fresh database. The old
article and article-job history has been removed instead of preserved as incremental migrations.
Initializing this schema therefore requires a new or explicitly reset D1 database. R2 and AI Search
cleanup is a separate owner-approved operation and is not performed by SQL.
