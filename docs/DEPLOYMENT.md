# Deployment

Status: Proposed; no Cloudflare resources or application configuration exist yet

OpenNext builds one Cloudflare Worker. Wrangler owns its resources, bindings, variables, secrets,
migrations, preview, and deployment. Use one production resource set plus local Wrangler state; this
personal application does not need duplicated cloud environments.

## Platform bindings

Create these resources once and declare them in `apps/web/wrangler.jsonc`:

| Binding            | Resource               | Purpose                  |
| :----------------- | :--------------------- | :----------------------- |
| `DB`               | `my-knowledge-db`      | Article index and auth   |
| `KNOWLEDGE_BUCKET` | `my-knowledge-content` | Canonical Markdown       |
| `KNOWLEDGE_CACHE`  | `my-knowledge-cache`   | Compiled public articles |
| `KNOWLEDGE_INDEX`  | `my-knowledge-index`   | Semantic vectors         |
| `AI`               | Workers AI             | BGE-M3 embeddings        |

These are Worker bindings injected by Cloudflare, not environment variables. Resource IDs and names
belong only in `wrangler.jsonc`; application code accesses `env.DB`, `env.KNOWLEDGE_BUCKET`,
`env.KNOWLEDGE_CACHE`, `env.KNOWLEDGE_INDEX`, and `env.AI`.

Create Vectorize with 1,024 dimensions and cosine distance to match `@cf/baai/bge-m3`.

```text
pnpm --filter @my-knowledge/web exec wrangler d1 create my-knowledge-db
pnpm --filter @my-knowledge/web exec wrangler r2 bucket create my-knowledge-content
pnpm --filter @my-knowledge/web exec wrangler kv namespace create my-knowledge-cache
pnpm --filter @my-knowledge/web exec wrangler vectorize create my-knowledge-index --dimensions=1024 --metric=cosine
```

## Values you set

Two non-secret variables live in `wrangler.jsonc`:

| Variable          | Value                                      |
| :---------------- | :----------------------------------------- |
| `BETTER_AUTH_URL` | Final application origin                   |
| `CF_ACCOUNT_ID`   | Account used in the AI Gateway request URL |

Upload these with Wrangler secrets:

| Secret                 | Purpose                                     |
| :--------------------- | :------------------------------------------ |
| `ALLOWED_EMAIL`        | The only owner email                        |
| `BETTER_AUTH_SECRET`   | Session signing                             |
| `GOOGLE_CLIENT_ID`     | Stored with auth credentials for simplicity |
| `GOOGLE_CLIENT_SECRET` | Google OAuth secret                         |
| `CF_AIG_TOKEN`         | AI Gateway authentication                   |
| `MCP_API_KEY`          | Owner Bearer key for MCP                    |

Google's client ID is not cryptographically secret, but keeping the OAuth pair in the same Wrangler
secret workflow avoids another configuration path. Register
`{BETTER_AUTH_URL}/api/auth/callback/google` in Google OAuth.

The following are code constants, not deployment variables: Gateway `default`, provider
`custom-opencode`, article model `deepseek-v4-flash`, embedding model `@cf/baai/bge-m3`, duplicate
threshold `0.92`, and maximum tag count `5`. Change them through reviewed code when the product
decision changes.

The upstream OpenCode Go key stays in AI Gateway Provider Keys. `CLOUDFLARE_API_TOKEN`, when used by
CI, authenticates Wrangler deployment only and must not become a Worker variable or secret.

## Local development

Copy `apps/web/.env.example` to `apps/web/.env.local` for `next dev` and to `apps/web/.dev.vars` for
the production-like OpenNext preview. Wrangler reads `.dev.vars` beside `wrangler.jsonc`; when it
exists, do not also rely on a Wrangler `.env` file. Never commit either populated file. The shared
example contains the two variables and six empty secret names only. Set `BETTER_AUTH_URL` to the
actual origin of the command being run; do not reuse a `next dev` origin for preview.

Call `initOpenNextCloudflareForDev()` from `apps/web/next.config.ts` so `next dev` can expose local
bindings. Wrangler local state lives under `apps/web/.wrangler` and does not require another cloud D1,
R2, KV, or Vectorize resource.

## Free-plan constraints

The application is designed for Cloudflare's free plan: direct bindings, one project D1 table,
paginated list queries, bounded Vectorize results, no database server, and no cached list blobs. KV
caches only compiled public articles, while R2 remains canonical.

Do not copy numeric platform quotas into this repository because Cloudflare changes them. Before each
release, run the real OpenNext Worker smoke test and check current Cloudflare usage. If CPU becomes the
limit, reduce dynamic rendering and precompute public output before adding storage layers or database
abstractions.

## Release

1. create the resources and place returned IDs in `wrangler.jsonc`;
2. set the two variables and upload the six secrets;
3. write and review numbered application and Better Auth SQL migrations;
4. run `pnpm d1:migrate:local`, tests, `pnpm check`, and `pnpm preview`;
5. apply `pnpm d1:migrate:remote`, deploy, then verify login, MCP mutations, authenticated deletion,
   public search, owner-only AI search, and private non-disclosure.

Migrations remain backward-compatible for one Worker rollback window. Roll back application code with
Cloudflare Worker versions and repair data with a new forward migration.

Direct package versions live in their owning manifests; transitive versions live in
`pnpm-lock.yaml`. React overrides, dependency build permissions, and `minimumReleaseAge` live in
`pnpm-workspace.yaml`.
