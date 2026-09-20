# Database and persistence

D1 stores UUIDs, Chinese metadata, tags, links, visibility, hashes and timestamps. Translations carry article ID, locale, metadata and source hash; stale editions are unreadable. Keep one current initialization schema; rebuild incompatible stores instead of adding upgrade migrations. Better Auth owns authentication tables.

R2 owns Markdown under knowledge/{id}. KV caches authorized public editions by ID, hash and locale. Cache errors propagate; misses read R2. API-key actors store digests and creation times.

Creation writes Chinese R2 content, waits up to 30 seconds for eligible indexing to complete, then publishes D1 metadata. Translations follow. Daily articles skip indexing; switching to daily removes the item. Rollback checks R2 ETags before derived cleanup.

Updates require expectedHash and expectedUpdatedAt, use ETags, synchronize search, then switch content and visibility together. Successful saves and visibility changes advance updatedAt monotonically. Visibility-only updates skip R2/search. R2 reads require a contentHash matching D1; missing version metadata is invalid. Translations recheck the Chinese hash.

Deletion records a durable writer tombstone, hides D1, removes external artifacts, then deletes D1 last. Failure permits only deletion retries with the original version. Retries tolerate removed objects; completed deletion returns not found.
