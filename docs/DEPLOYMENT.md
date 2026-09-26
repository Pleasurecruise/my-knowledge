# Deployment

apps/web/wrangler.json owns Worker bindings, assets and domains. Credentials belong in secrets or .dev.vars.

BETTER_AUTH_URL defines the canonical origin. Google requires that origin and /api/auth/callback/google redirect. Local preview uses http://localhost:8787 with matching auth configuration.

pnpm dev and preview rebuild OpenNext and invoke Wrangler. Restart after edits. Avoid next dev: its proxy lacks internal Durable Objects. Preview uses remote storage; tests explicitly use local bindings.

Monitoring redacts query strings.

Before release, run check, test, build, dry-run and relevant browser contracts. Durable Object exports declare current SQLite classes without migration tags. Deployment first checks article tables against the initialization schema. Rebuild incompatible D1 tables before release; recorded initialization migrations cannot update them. Export D1 metadata, visibility, versions and translations; restore against the current schema and verify R2 hashes. Rebuild incompatible stores instead of adding upgrade migrations. Preserve canonical content and shared resources. Recreating API-key storage requires issuing a new credential. Rebuild R2 version metadata when replacing stored formats. After compiler or rendering dependency changes, delete only KNOWLEDGE_CACHE keys prefixed `compiled/`; the new Worker rebuilds them on reads. Preserve other KV keys, D1 and R2. Git and deployment require authorization. Verify ingestion, privacy and cleanup after rebuilding.
