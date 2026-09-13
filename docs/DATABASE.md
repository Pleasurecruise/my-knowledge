# Database and persistence

D1 articles stores identity, slug, Chinese metadata, tags, links, visibility, hash and timestamps. Translations store article ID, locale, metadata and source hash. Stale editions are unreadable. SQL migrations are authoritative; deployed migrations are append-only. Better Auth owns authentication tables.

R2 owns Chinese and translated Markdown under knowledge/{id}. KV caches authorized public editions by ID, hash and locale. Cache errors propagate; misses read canonical content. API-key Durable Objects store digests and creation times.

Creation writes validated Chinese R2 content, synchronizes eligible AI Search content, then inserts a public D1 row. Supplied translations follow. Daily articles skip indexing; changing an indexed article to daily removes its search item. Failed attempts clean owned artifacts; rollback checks R2 ETags before touching derived data.

Updates use object ETags and expectedHash, synchronize search, then switch content and requested visibility together in D1. Visibility-only updates skip R2/search. Pages and AI retrieval reject R2 version markers inconsistent with the authorized D1 row. Translation writes recheck the Chinese hash.

Deletion hides the D1 row before removing derived data, canonical objects and search content. The row is deleted last. Cleanup failure leaves it private and retryable. Retries tolerate already-removed objects; repeated completed deletion returns not found.
