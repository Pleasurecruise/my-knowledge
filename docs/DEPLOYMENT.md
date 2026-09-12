# Deployment

OpenNext produces one request-only Worker. `apps/web/wrangler.json` owns DB, Markdown bucket, cache, AI Search, API-key Durable Object, assets, and domain bindings. Create only missing resources; existing shared resources require an explicit ownership decision.

`BETTER_AUTH_URL` is the canonical origin. Secrets are `ALLOWED_EMAIL`, `BETTER_AUTH_SECRET`, `GOOGLE_CLIENT_ID`, and `GOOGLE_CLIENT_SECRET`. Register `/api/auth/callback/google` at that origin. Local development uses the environment example, local state, and synthetic credentials; model-provider secrets stay outside the Worker.

## Verification and release

Run local migrations, `pnpm check`, `pnpm test`, `pnpm build`, `pnpm dry-run`, and `pnpm test:e2e`. Dry-run validates the bundle without publishing. Release a reviewed committed revision only with separate Git and deployment authorization. CI performs checks and dry-run, not remote migration or publication.

Reuse the deployed D1 baseline; ordinary releases never reset it. Before an exceptional rebuild, record a recovery point and back up required data. Rollback must pair a compatible Worker and database. Verify OAuth, REST/MCP, ingestion, search, cleanup, and anonymous privacy before discarding recovery data.

Deploy the exported API-key Durable Object class before applications referencing its separate named instances. Generate credentials through each application's owner session, never by copying another application's key.
