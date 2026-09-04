# Deployment

Status: Worker deployed; remote account lookup verified, interactive Google callback smoke remains

OpenNext builds one request-only Worker. Content generation and translation run in the owner's local
workflow and are not deployment resources. Wrangler owns bindings, variables, secrets, migrations,
preview, and deployment.

## Platform bindings

| Binding            | Resource                     | Purpose                   |
| :----------------- | :--------------------------- | :------------------------ |
| `DB`               | Configured D1 database       | Article index and auth    |
| `KNOWLEDGE_BUCKET` | Dedicated or approved shared | Article Markdown          |
| `KNOWLEDGE_CACHE`  | `my-knowledge` KV            | Article caches            |
| `AI_SEARCH`        | `default` namespace          | Chinese article retrieval |
| `API_KEY`          | Durable Object               | This project's API key    |

Create only missing resources. Keep a different R2 bucket name in `wrangler.json` only when sharing
that bucket is an explicit decision. AI Search holds canonical Chinese items only; every result is
re-authorized through D1.

```text
pnpm --filter @my-knowledge/web exec wrangler d1 create my-knowledge
pnpm --filter @my-knowledge/web exec wrangler r2 bucket create my-knowledge
pnpm --filter @my-knowledge/web exec wrangler kv namespace create my-knowledge
```

## Values and credentials

`BETTER_AUTH_URL` is the sole non-secret application variable and must be the final canonical origin.
Upload these four Wrangler secrets:

| Secret                 | Purpose                    |
| :--------------------- | :------------------------- |
| `ALLOWED_EMAIL`        | The only owner email       |
| `BETTER_AUTH_SECRET`   | Session signing            |
| `GOOGLE_CLIENT_ID`     | Google OAuth configuration |
| `GOOGLE_CLIENT_SECRET` | Google OAuth configuration |

Register `{BETTER_AUTH_URL}/api/auth/callback/google` in Google OAuth. After the first allowed-email
sign-in, call `POST /api/settings/api-key` from that browser session. Store the returned plaintext
once in the my-knowledge MCP or REST client. This Worker persists only its digest in the
`my-knowledge-api-key` Durable Object instance. Regenerate with `PUT /api/settings/api-key` only after confirming
the old my-knowledge key should be invalidated.
`GET /api/settings/api-key` reports only configuration status and time.

The local workflow's model/provider credentials stay local and never become Worker variables.
`CLOUDFLARE_API_TOKEN`, when used by CI, authenticates Wrangler deployment only.

## Local development

Copy `apps/web/.env.example` to `apps/web/.env.local` for `next dev` and to `apps/web/.dev.vars` for
the production-like OpenNext preview. Set `BETTER_AUTH_URL` to the actual command origin. Local
contract seeding writes article fixtures to local R2. API contract runs generate a key through an
owner session.

The binding configuration uses `remote: true` for storage services that cannot be fully reproduced
locally. The root layout and independent metadata routes are force-dynamic so build workers never
create platform proxies during static generation.

This Worker exports `ApiKeyDurableObject`. Deploy it before my-memos and my-moment, whose bindings
use separate named instances of the same class. The first rollout requires generating one fresh API
key in each application.

## Verification and release

The production build intentionally uses webpack. Release from a reviewed, committed revision; Git
commits and deployments require separate authorization. Before release run:

```text
pnpm d1:migrate:local
pnpm check
pnpm test
pnpm build
pnpm dry-run
pnpm test:e2e
```

Before a schema change, record a D1 Time Travel bookmark and apply pending migrations with
`pnpm d1:migrate:remote`. Deploy manually and record the Git commit and Worker version together.
Verify Google login, API-key rotation, REST/MCP operations, ingestion, indexing, cleanup and anonymous
privacy. Retain the database recovery point until these checks pass.

Direct package versions live in their owning manifests; transitive versions live in
`pnpm-lock.yaml`. React overrides, dependency build permissions, and `minimumReleaseAge` live in
`pnpm-workspace.yaml`.
