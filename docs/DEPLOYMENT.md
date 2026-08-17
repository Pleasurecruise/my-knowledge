# Deployment

Status: Application and local release gates implemented; production provisioning remains an owner gate

OpenNext builds one Cloudflare Worker. Wrangler owns its resources, bindings, variables, secrets,
migrations, preview, and deployment. Use one production resource set plus local Wrangler state; this
personal application does not need duplicated cloud environments.

## Platform bindings

Create these resources once and declare them in `apps/web/wrangler.json`:

| Binding            | Resource                     | Purpose                |
| :----------------- | :--------------------------- | :--------------------- |
| `DB`               | `my-knowledge`               | Article index and auth |
| `KNOWLEDGE_BUCKET` | Dedicated or approved shared | Canonical Markdown     |
| `KNOWLEDGE_CACHE`  | `my-knowledge`               | Public edition cache   |
| `KNOWLEDGE_INDEX`  | `my-knowledge`               | Semantic vectors       |
| `AI`               | Workers AI                   | BGE-M3 embeddings      |

These are Worker bindings injected by Cloudflare, not environment variables. Resource IDs and names
belong only in `wrangler.json`; application code accesses `env.DB`, `env.KNOWLEDGE_BUCKET`,
`env.KNOWLEDGE_CACHE`, `env.KNOWLEDGE_INDEX`, and `env.AI`.

Create only missing resources. A dedicated setup uses the `my-knowledge` name throughout; keep a
different R2 bucket name in `wrangler.json` only when sharing that bucket is an explicit decision.
Vectorize uses 1,024 dimensions and cosine distance to match `@cf/baai/bge-m3`.

```text
pnpm --filter @my-knowledge/web exec wrangler d1 create my-knowledge
pnpm --filter @my-knowledge/web exec wrangler r2 bucket create my-knowledge
pnpm --filter @my-knowledge/web exec wrangler kv namespace create my-knowledge
pnpm --filter @my-knowledge/web exec wrangler vectorize create my-knowledge --dimensions=1024 --metric=cosine
```

## Values you set

Two non-secret variables live in `wrangler.json`:

| Variable          | Value                                                 |
| :---------------- | :---------------------------------------------------- |
| `BETTER_AUTH_URL` | Final application, canonical, and social-image origin |
| `CF_ACCOUNT_ID`   | Account used in the AI Gateway request URL            |

Upload these with Wrangler secrets:

| Secret                 | Purpose                                     |
| :--------------------- | :------------------------------------------ |
| `ALLOWED_EMAIL`        | The only owner email                        |
| `BETTER_AUTH_SECRET`   | Session signing                             |
| `GOOGLE_CLIENT_ID`     | Stored with auth credentials for simplicity |
| `GOOGLE_CLIENT_SECRET` | Google OAuth secret                         |
| `CF_AIG_TOKEN`         | AI Gateway authentication                   |
| `MCP_API_KEY`          | Owner Bearer key for MCP                    |

`wrangler.json` declares all six names as required secrets so clean CI type generation does not
depend on a local `.dev.vars`, and a Worker version cannot be uploaded with an incomplete secret set.

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
the production-like OpenNext preview. Wrangler reads `.dev.vars` beside `wrangler.json`; when it
exists, do not also rely on a Wrangler `.env` file. Never commit either populated file. The shared
example contains the two variables and six empty secret names only. Set `BETTER_AUTH_URL` to the
actual origin of the command being run; do not reuse a `next dev` origin for preview.

Wrangler keeps one binding configuration. Its bindings use `remote: true` so local development can
reach the configured Cloudflare resources. During Next.js's development-server phase,
`apps/web/next.config.ts` initializes OpenNext for those bindings. Wrangler local state lives under
`apps/web/.wrangler`.

The root layout declares `dynamic = "force-dynamic"`, making the complete application route tree
request-rendered before any page or metadata function can read Cloudflare context. The independent
robots and sitemap metadata routes declare the same policy themselves. This keeps Next's
static-generation workers from creating Wrangler platform proxies during a production build.

## Free-plan constraints

The application is designed for Cloudflare's free plan: direct bindings, one project D1 table,
paginated list queries, bounded Vectorize results, no database server, and no cached list blobs. KV
caches only versioned public Chinese articles, while R2 remains canonical.

Do not copy numeric platform quotas into this repository because Cloudflare changes them. Before each
release, run `pnpm build` followed by `pnpm dry-run` and confirm Wrangler's compressed upload remains
within the target account's current Worker limit. The production build intentionally uses webpack;
changing the Next.js bundler or moving client-only renderers across the dynamic boundary requires a
fresh size comparison. If CPU becomes the limit, reduce dynamic rendering and precompute public output
before adding storage layers or database abstractions.

## Release

1. verify every configured resource and decide whether R2 is dedicated or intentionally shared;
2. create any missing resources, initialize the Worker without production traffic, and configure
   Workers Builds with root directory `apps/web`, build command `pnpm build:worker`, and deploy
   command `pnpm exec opennextjs-cloudflare deploy`;
3. set the two variables, create the Google OAuth client, and upload the six secrets;
4. review the numbered application and Better Auth SQL migrations;
5. run `pnpm d1:migrate:local`, `pnpm check`, `pnpm test`, `pnpm build`, `pnpm dry-run`, and
   `pnpm preview`;
6. apply `pnpm d1:migrate:remote`, deploy, then verify login, MCP mutations, authenticated deletion,
   public search, owner-authorized private search, and private non-disclosure.

Migrations remain backward-compatible for one Worker rollback window. Roll back application code with
Cloudflare Worker versions and repair data with a new forward migration.

Everything before the first production-account action is implemented and locally verified. The owner
must perform the following final gate because it requires account authority or a policy decision:

1. accept the configured model provider's retention policy;
2. verify the production origin, configured Cloudflare resource IDs, and R2 ownership decision;
3. create every missing resource and initialize the Worker;
4. create the Google OAuth client and upload all six secrets;
5. run the remote migration, deploy, and execute the live provider, Vectorize, OAuth, MCP mutation,
   deletion, and anonymous privacy smoke tests.

Do not run the remote migration or deployment before these values have been reviewed. Local green
checks do not authorize production writes.

Direct package versions live in their owning manifests; transitive versions live in
`pnpm-lock.yaml`. React overrides, dependency build permissions, and `minimumReleaseAge` live in
`pnpm-workspace.yaml`.
