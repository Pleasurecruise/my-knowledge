# Database and persistence

Status: Implemented; replacement production D1 initialized, Worker deployment pending

D1 indexes canonical Chinese articles and the smallest useful translation metadata. R2 owns every
Markdown body, KV owns disposable article caches, and AI Search indexes only canonical Chinese
Markdown. The project Durable Object owns the generated API key.

## D1

The application owns two content tables. `articles` stores `id`, stable `slug`, Chinese `title` and
`summary`, Chinese `contentHash`, `tagsJson`, `linksJson`, `visibility`, `createdAt`, and `updatedAt`.
Application creates explicitly write `public`; the owner may withdraw them in a separate mutation.

`articleTranslations` is a derived child table with exactly `articleId`, `locale`, translated `title`
and `summary`, and `sourceHash`. Its composite primary key is `(articleId, locale)`, locales are
limited to `en` and `ja`, and article deletion cascades. A translation is readable only when
`sourceHash` equals the current Chinese `articles.contentHash`; no status, timestamps, paths, tags,
links, visibility, or body are duplicated into this table.

There is no D1 job table. Better Auth owns its standard `user`, `session`, `account`, and
`verification` tables. Do not add profile, role, token, revision, relation, source, or deletion
tables.

`id` is the article identity, R2 directory, and AI Search key prefix. Slugs
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
`tags`; translations preserve Chinese tags, wiki-link targets, and supported structured blocks. The
generated API key is not stored in R2.

KV caches parsed public editions under `articles/{articleId}/{contentHash}/{locale}.json` for 24
hours. D1 authorization always precedes cache or R2 reads. A cached or stored translation is selected
only through a current `articleTranslations.sourceHash`; otherwise the caller falls back to Chinese.
The `my-knowledge-api-key` Durable Object instance stores schema version `1`, a SHA-256 digest, and
its creation time. Rotation replaces that record and returns the plaintext key only in that response.
API key reads have no R2 or KV fallback.

There are no job inputs, creation receipts, or task results.

## Writes

Cloudflare stores do not share a transaction. Chinese create uses this order:

1. parse and validate submitted Chinese Markdown;
2. conditionally write `knowledge/{articleId}/zh.md`;
3. upload only `{articleId}/zh.md` to AI Search;
4. insert the public Chinese D1 row;
5. write any supplied `en` and `ja` editions and their child metadata.

If a step before the D1 insert fails, remove only artifacts written by that attempt whose ETags still
match. An R2 object without its D1 row remains an explicit error.

Chinese update conditionally replaces `zh.md`, uploads the same Chinese AI Search key, and switches
the D1 row with `WHERE id = ? AND contentHash = expectedHash`. It then invalidates the previous cache.
Existing translation rows become unreadable immediately because their `sourceHash` no longer matches.

Each supplied translation is validated with Chinese, rechecks the source hash, conditionally writes
its R2 object, then upserts the five-field child row. Translation Markdown is never uploaded to AI
Search.

Delete first hides the D1 row, then removes current caches, the Chinese R2 object and translation
objects represented by child rows, the single Chinese AI Search item, and finally the article row;
the translation rows cascade. An external cleanup failure leaves the hidden row available for an
owner retry.

## Migrations

`apps/web/migrations/0001_initial.sql` is the authoritative schema for a fresh database. The old
article and article-job history has been removed instead of preserved as incremental migrations.
Initializing this schema therefore requires a new or explicitly reset D1 database. R2 and AI Search
cleanup is a separate owner-approved operation and is not performed by SQL.
