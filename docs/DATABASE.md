# Database and persistence

D1 `articles` stores identity, stable slug, Chinese title/summary, tags, links, visibility, hash, and timestamps. `articleTranslations` contains only article ID, locale, translated title/summary, and source hash; stale editions are unreadable. Better Auth owns its standard tables. Numbered SQL migrations are authoritative; Drizzle mirrors them. Deployed migrations are append-only.

R2 keys are `knowledge/{id}/zh.md` and `knowledge/{id}/i18n/{en|ja}.md`. KV caches authorized public editions by ID, hash, and locale for 24 hours. The `my-knowledge-api-key` Durable Object stores only a versioned digest and creation time.

## Writes

Create validates Chinese, conditionally writes R2, synchronizes eligible Chinese AI Search content, inserts the public D1 row, then stores supplied translations. Daily articles do not enter AI Search. Failures before D1 commit clean only artifacts owned by that attempt.

Update uses object ETags and `expectedHash`, synchronizes search before switching D1, then invalidates old cache entries. Translation writes recheck the Chinese hash. Chinese changes immediately invalidate older translations.

Delete first hides the D1 row, then removes caches, Chinese and recorded translation objects, and search content; finally delete the row. Cleanup failures retain the hidden row for retry. Repeated completed deletion returns not found.
