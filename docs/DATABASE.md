# Database and persistence

D1 stores article identity, metadata, visibility and versions. Translations carry locale and source hash; stale editions are unreadable. Keep one initialization schema; rebuild incompatible stores. Better Auth owns authentication tables.

R2 owns Markdown under knowledge/{id}. KV caches authorized public editions by ID, hash and locale. Cache errors propagate; misses read R2. API-key actors store credential digests.

Creation writes Chinese R2 before D1; translations follow. Rollback checks R2 ETags.

Updates require expectedHash and expectedUpdatedAt, use ETags, then switch content and visibility together. Saves and visibility changes advance updatedAt. Visibility-only updates skip R2. R2 contentHash must match D1. Translations recheck the Chinese hash.

Deletion records a durable writer tombstone, hides D1, removes external artifacts, then deletes D1 last. Failure permits only same-version deletion retries. Retries tolerate removed objects; completed deletion returns not found.

Public compiled trees use `compiled/{rendererVersion}/{digest}.json`, hashing exact Markdown, labels and enrichment mode. KV retains artifacts up to 20 MiB for 24 hours; larger results render without persistence. Bump the renderer version for compiler/dependency changes affecting output. D1 authorization precedes reads; private articles bypass artifact KV. In-memory compilations retain sixteen results for thirty seconds, excluding sources above 128 Ki characters or results above 512 Ki characters.
