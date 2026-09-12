# Architecture

One Next.js application becomes one Cloudflare Worker through OpenNext. Production uses webpack; development uses Next.js defaults. Generation and translation run locally, outside this deployment. There are no background jobs, queues, hosted prompts, or model-generation providers.

| Workspace          | Responsibility                                        |
| ------------------ | ----------------------------------------------------- |
| `packages/content` | Article schemas, Markdown, tags, links, hashes        |
| `packages/ui`      | Components, tokens, icons, Markdown presentation      |
| `apps/web`         | Pages, REST/MCP, auth, persistence, provider adapters |

Dependencies point from web to shared packages and from UI to content, never backward. Domain packages do not import platform adapters. Module entrypoints define public contracts; internal code imports concrete siblings. React composition, application operations, and persistence retain separate ownership.

D1 authorizes existence and visibility; R2 owns Markdown. KV and AI Search are rebuildable derivatives and never authorize access. A Durable Object owns the shared API-key digest. Reads authorize before accessing caches, bodies, or provider enrichment; AI candidates are checked again through D1.

Better Auth, Google OAuth, and the allowed email identify the browser owner. Metadata always uses anonymous authorization. Mermaid, Vega, and Canvas retain separate browser-only rendering boundaries. [Database](DATABASE.md) owns cross-store ordering; [API](API.md) owns external credentials.
