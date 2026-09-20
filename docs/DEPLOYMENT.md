# Deployment

apps/web/wrangler.json owns Worker bindings, assets and domains. Credentials belong in Worker secrets or local .dev.vars.

BETTER_AUTH_URL defines the canonical origin. Google requires that JavaScript origin and /api/auth/callback/google redirect; only its client ID reaches browsers. Local preview uses http://localhost:8787 with matching auth configuration.

pnpm dev and preview rebuild OpenNext and invoke Wrangler. Restart after edits. Avoid next dev: its proxy lacks internal Durable Objects and nested AI Search. Preview uses remote storage; tests explicitly use local bindings.

AI Search `my-knowledge` accepts application-uploaded Chinese items. Exclude external R2 paths (`**`), disable caching and public endpoints, and exclude it from namespace public allowlists. Workers redact query strings while retaining monitoring. Disable AI Gateway request/response logging before retrieval.

Before release, run check, test, build, dry-run and relevant browser contracts. Durable Object exports declare current SQLite classes without migration tags. Removing article aliases requires rebuilding D1 from the initialization schema; rebuild incompatible application-owned stores instead of maintaining upgrade migrations. Preserve canonical content and shared resources. Recreating API-key storage requires issuing a new credential. Rebuild R2 version metadata and invalidate derived caches when replacing old stored formats. Dry-run does not publish; Git and deployment require authorization. Verify ingestion, privacy, retrieval and cleanup after rebuilding.
