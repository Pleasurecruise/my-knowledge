# Deployment

Status: Replacement D1 initialized; Worker deployment and production smoke remain

OpenNext builds one Worker with a project-owned entry that reuses its generated fetch handler and adds
the Queue consumer. Wrangler owns resources, bindings, variables, secrets, migrations, preview, and
deployment. Use one production resource set plus local Wrangler state; this personal application does
not need duplicated cloud environments.

## Platform bindings

Create these resources once and declare them in `apps/web/wrangler.json`:

| Binding            | Resource                     | Purpose                |
| :----------------- | :--------------------------- | :--------------------- |
| `DB`               | Configured D1 database       | Article index and auth |
| `KNOWLEDGE_BUCKET` | Dedicated or approved shared | Canonical Markdown     |
| `KNOWLEDGE_CACHE`  | `my-knowledge`               | Cache and job input    |
| `AI_SEARCH`        | `default` namespace          | Article search index   |
| `ARTICLE_JOBS`     | `article-jobs` Queue         | Job publication        |

These are Worker bindings injected by Cloudflare, not environment variables. Resource IDs and names
belong only in `wrangler.json`; application code accesses `env.DB`, `env.KNOWLEDGE_BUCKET`,
`env.KNOWLEDGE_CACHE`, and `env.AI_SEARCH`.

`ARTICLE_JOBS` is the producer binding, and the same Worker is the queue's sole consumer. Queue events
run independently from fetch events and use the existing D1, R2, KV, AI Search, account, and Gateway
bindings.

Create only missing resources. A dedicated setup uses the `my-knowledge` name throughout; keep a
different R2 bucket name in `wrangler.json` only when sharing that bucket is an explicit decision.
Create one AI Search instance in the `default` namespace: `my-knowledge` (builtin type, programmatic
item upload). It holds only canonical Chinese items for article search, whose results are
re-authorized through D1. Translation objects never enter this instance.

```text
pnpm --filter @my-knowledge/web exec wrangler d1 create my-knowledge
pnpm --filter @my-knowledge/web exec wrangler r2 bucket create my-knowledge
pnpm --filter @my-knowledge/web exec wrangler kv namespace create my-knowledge
pnpm --filter @my-knowledge/web exec wrangler queues create article-jobs
```

Create the AI Search instance from the Cloudflare dashboard or with Wrangler's AI Search commands,
then connect the gateway and select the generation model in the instance settings.

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

`wrangler.json` declares all six names as required secrets so clean CI type generation does not depend
on a local `.dev.vars`, and a Worker version cannot be uploaded with an incomplete secret set.

Google's client ID is not cryptographically secret, but keeping the OAuth pair in the same Wrangler
secret workflow avoids another configuration path. Register
`{BETTER_AUTH_URL}/api/auth/callback/google` in Google OAuth.

The following are code constants, not deployment variables: Gateway `default`, article route
`dynamic/article`, AI Search instance name `my-knowledge`, and maximum tag count `5`. Change
them through reviewed code when the product decision changes. The route's internal flow — primary
model, rate and budget limits, and fallback model — is versioned in the AI Gateway dashboard, so
quota-driven fallback changes do not require a code redeploy.

The upstream provider keys stay in AI Gateway Provider Keys through BYOK. `CLOUDFLARE_API_TOKEN`,
when used by CI, authenticates Wrangler deployment only and must not become a Worker variable or
secret.

## Local development

Copy `apps/web/.env.example` to `apps/web/.env.local` for `next dev` and to `apps/web/.dev.vars` for
the production-like OpenNext preview. Wrangler reads `.dev.vars` beside `wrangler.json`; when it
exists, do not also rely on a Wrangler `.env` file. Never commit either populated file. The shared
example contains the two variables and six empty secret names only. Set `BETTER_AUTH_URL` to the
actual origin of the command being run; do not reuse a `next dev` origin for preview.

The Worker keeps one binding configuration. Its storage and model bindings use `remote: true` so
local development can reach the configured Cloudflare resources. During Next.js's development-server phase,
`apps/web/next.config.ts` initializes OpenNext for those bindings. Wrangler local state lives under
`apps/web/.wrangler`. A production-like local Queue run uses the generated custom Worker; `next dev`
alone does not consume queued jobs.

The root layout declares `dynamic = "force-dynamic"`, making the complete application route tree
request-rendered before any page or metadata function can read Cloudflare context. The independent
robots and sitemap metadata routes declare the same policy themselves. This keeps Next's
static-generation workers from creating Wrangler platform proxies during a production build.

## Free-plan constraints

The application is designed for Cloudflare's free plan: direct bindings, two small project D1 tables,
paginated list queries, bounded AI Search results, one Queue consumer, no database server, and no
cached list blobs. KV caches versioned public Chinese articles and temporarily holds submitted job
input, while R2 remains canonical.

Article generation and translation are CPU-heavier than ordinary fetch requests. The Worker therefore
sets the Queue-compatible `limits.cpu_ms` to 300,000 and fixes `article-jobs` batches at one message.
Cloudflare's Queue limits apply this configurable consumer allowance to Free and Paid plans; this
setting does not change the account plan. The one-message batch prevents unrelated article jobs from
sharing one invocation's CPU allowance. The consumer does not override `max_retries`, so Cloudflare
applies its default limit of three retries without application-owned retry code.

Do not copy unrelated numeric platform quotas into this repository because Cloudflare changes them.
Before each release, run `pnpm build` followed by `pnpm dry-run` and confirm Wrangler's compressed
upload remains within the target account's current Worker limit. The production build intentionally
uses webpack; changing the Next.js bundler or moving client-only renderers across the dynamic boundary
requires a fresh size comparison. If CPU becomes the limit, reduce dynamic rendering and precompute
public output before adding storage layers or database abstractions.

## Release

1. verify every configured resource and decide whether R2 is dedicated or intentionally shared;
2. create the Queue and any missing storage resources, initialize the Worker without production
   traffic, and configure Workers Builds with root directory `apps/web`, build command
   `pnpm build:worker`, and deploy command `pnpm exec opennextjs-cloudflare deploy`;
3. set the two variables, create the Google OAuth client, and upload the six secrets;
4. replace an existing D1 database blue-green: create a fresh database, update `database_id`, apply
   `0001_initial.sql`, and retain the former database until the new Worker passes production smoke;
5. run `pnpm d1:migrate:local`, `pnpm check`, `pnpm test`, `pnpm build`, `pnpm dry-run`, and
   `pnpm preview`;
6. deploy, then verify login, accepted article IDs and direct reads, Chinese-first creation, derived
   translations, MCP mutations, authenticated deletion, public search, owner-authorized private
   search, and private non-disclosure.

The rebuilt schema is not backward-compatible with the former content model. The former D1 database
is the recovery point during the replacement. Roll back application code with Cloudflare Worker
versions only after verifying that its database schema still matches.

The configured replacement D1 has the fresh schema and no article or translation rows. The former D1
remains untouched as the recovery point. Pushing this repository runs CI but does not deploy the
Worker; deployment and the live provider, AI Search, OAuth, MCP mutation, deletion, and anonymous
privacy smoke tests remain explicit release actions.

Direct package versions live in their owning manifests; transitive versions live in
`pnpm-lock.yaml`. React overrides, dependency build permissions, and `minimumReleaseAge` live in
`pnpm-workspace.yaml`.
