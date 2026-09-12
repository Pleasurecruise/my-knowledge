# Deployment

OpenNext produces one Worker. apps/web/wrangler.json owns bindings, assets and domains. Create missing resources only; shared resources require an ownership decision. BETTER_AUTH_URL defines the canonical origin. Credentials belong in Worker secrets or local .dev.vars, never source control.

Google requires the canonical JavaScript origin and /api/auth/callback/google redirect. Only its client ID reaches browsers. Local preview uses http://localhost:8787 with matching BETTER_AUTH_URL and Google configuration. Provider/FedCM failures remain distinct from application authentication failures.

pnpm dev and preview build OpenNext and invoke Wrangler directly. Edits require rebuilding and restarting. Avoid next dev because its proxy cannot provide the internal Durable Object and nested AI Search API. Preview uses configured remote bindings and local Durable Objects; tests explicitly select local storage.

Run migrations, checks, unit tests, build, dry-run and relevant browser tests before release. Dry-run does not publish. Git and deployment require separate authorization. Never reset the deployed D1 baseline for routine releases. Exceptional rebuilds require a recovery point and compatible database/Worker rollback. Verify authentication, ingestion, retrieval, cleanup and anonymous privacy before discarding recovery data. Deploy the exported API-key Durable Object before dependent applications.
