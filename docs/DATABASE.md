# Database and persistence

D1 stores identity, metadata, visibility and versions. Translations carry locale/source hash; stale editions are unreadable. Better Auth owns authentication.

R2 owns knowledge/{id} Markdown. KV caches public editions by ID/hash/locale; errors propagate and misses read R2. API-key actors store credential digests.

Creation writes Chinese R2, then D1 and translations. Rollback checks R2 ETags.

Updates require expectedHash and expectedUpdatedAt, use ETags, then switch content and visibility together. Saves and visibility changes advance updatedAt. Visibility-only updates skip R2. R2 contentHash must match D1. Translation edits preserve Chinese/siblings, require current editions, and atomically update D1 metadata/visibility/updatedAt after R2; invalidate affected caches.

Deletion records a durable writer tombstone, hides D1, removes external artifacts, then deletes D1 last. Failure permits same-version retries, tolerating removed objects; completed deletion returns not found.

Compiled trees use `compiled/{digest}.json`, hashing body, labels and enrichment mode. Metadata edits reuse compiled bodies. KV retains artifacts up to 20 MiB for 24 hours; larger results render without persistence. Clear `compiled/` after compiler/dependency output changes. D1 authorization precedes reads; private articles bypass artifact KV. LRU memory separates KV bindings and private content: sixteen entries, thirty-second non-sliding TTL, 128-Ki-character keys and 512-Ki-character entries. Failures evict; KV hits never renew storage TTL.
