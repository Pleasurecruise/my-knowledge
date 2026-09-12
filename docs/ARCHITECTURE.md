# Architecture

One Next.js application becomes one Cloudflare Worker through OpenNext. Development uses the built Worker preview; generation and translation run locally.

`packages/content` owns article schemas, Markdown semantics, tags, links and hashes. `packages/ui` owns presentation and shared components. `apps/web` owns pages, REST/MCP transports, authentication, application operations, persistence and provider adapters. Dependencies point from web to shared packages and from UI to content. Domain code excludes platform adapters.

D1 authorizes existence and visibility before bodies, caches or enrichment. R2 owns Markdown; KV and AI Search are derived. Article pages and AI retrieval share version-checked content reads. Social metadata uses anonymous D1 summaries; image caching follows authorization and responses remain no-store. Provider cards stream independently of prose. Lists read metadata, and article links prefetch on intent.

Better Auth verifies Google One Tap tokens; the allowed email identifies the owner. Requests without session cookies skip authentication initialization. Session verification is request-memoized. Only client IDs reach browsers. Mermaid, Vega and Canvas have browser-only rendering boundaries. [Database](DATABASE.md) owns persistence order; [API](API.md) owns external credentials.
