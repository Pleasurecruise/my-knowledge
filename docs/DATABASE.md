# Database and persistence

Status: Proposed implementation contract

Reuse only the proven Cloudflare boundary from `my-memos`: D1 is a small query index, R2 owns
Markdown, KV is disposable cache, and Drizzle is only a typed D1 query layer. The content model remains
Obsidian-like: frontmatter properties, nested tag paths, wiki links, backlinks, and graph views. There
is no Prisma, database server, connection pool, schema generator, or runtime migrator.

## D1

The application owns one table, `articles`:

- `id`, `slug`, `contentHash`;
- `metaJson`: Chinese and English title and summary;
- `tagsJson`: normalized tag paths;
- `linksJson`: referenced wiki-link slugs;
- `visibility`, `createdAt`, `updatedAt`.

Better Auth owns its standard `user`, `session`, `account`, and `verification` tables. Do not add a
profile, role, token, tag, link, revision, job, relation, source, or deletion table.

Make `id` the primary key and `slug` and `contentHash` unique. Add only one project index on
`(visibility, updatedAt)`. Store timestamps as UTC ISO strings. Generate IDs with
`crypto.randomUUID()` and keep slugs stable after creation.

For this personal corpus, query tag counts and nested paths with SQLite `json_each(tagsJson)`. Resolve
wiki links and backlinks by joining `json_each(linksJson)` to `articles.slug`; use those links with
Vectorize neighbors for graph views. This keeps Obsidian behavior while reusing `my-memos`'s compact
JSON projection technique. Normalize into more tables only after a measured D1 bottleneck.

## R2 and KV

R2 stores the canonical pair:

```text
articles/{articleId}/{contentHash}/zh.md
articles/{articleId}/{contentHash}/en.md
```

The keys are derived, so D1 does not store them. Canonical Markdown uses LF line endings, one final
newline, and frontmatter ordered as `title`, `summary`, then `tags`. `contentHash` is lowercase
SHA-256 over the UTF-8 bytes of Chinese Markdown, one NUL byte, then English Markdown.

D1 `metaJson`, `tagsJson`, and `linksJson` are parsed projections used for lists and filters, avoiding
an R2 read for every row. KV may cache only compiled public articles by article ID, hash, and locale.
Do not cache article lists or use KV as an authorization source.

## Writes

Cloudflare stores do not share a transaction.

Create or update in this order:

1. validate and canonicalize both Markdown documents;
2. write the new R2 pair;
3. upsert Vectorize ID `{articleId}:{contentHash}`;
4. insert the D1 row, or update it with `WHERE id = ? AND contentHash = expectedHash`;
5. after success, remove the previous R2/vector version and invalidate KV.

If the D1 write fails, delete only the new R2/vector version. Vector results must match both the
current D1 article ID and hash, so an orphan is never visible.

Delete by first setting D1 visibility to `private`, then invalidating KV and deleting R2/Vectorize,
then deleting the D1 row. If external cleanup fails, the private row remains for a retry. Public reads
always check D1 visibility before KV or R2.

## Migrations

Numbered SQL under `apps/web/migrations` is authoritative. Keep the Drizzle schema as a typed mirror.
Apply migrations only with the root `d1:migrate:local` and `d1:migrate:remote` Wrangler commands.
Never edit an applied migration; add a forward migration.
