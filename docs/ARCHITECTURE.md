# Architecture and technical stack

Status: Proposed

## Monorepo

```text
apps/web                 Next.js pages, Route Handlers, orchestration, auth, and Cloudflare bindings
packages/ai-core         provider adapter and schema-bound model execution
packages/content         article, Markdown, tag, link, and hash domain rules
packages/skills          pinned upstream skills, loader, registry, and attribution
packages/ui              tokens, search, graph, primitives, and Markdown presentation
```

This is one product and one Worker deployment. Packages exist for reusable ownership and test
boundaries, not as separate services. Do not add a package until code is genuinely shared or has a
stable independent responsibility.

Dependency direction is fixed: `content` and `skills` are independent; `ai-core` may consume both;
`ui` consumes content types but never platform adapters; `apps/web` composes packages with D1, R2,
KV, Vectorize, auth, and transport. Domain packages never import from `apps/web`.

## Selected stack

| Concern         | Selection                                            |
| :-------------- | :--------------------------------------------------- |
| Application     | Next.js 16.3+ App Router and TypeScript 7            |
| Worker build    | `@opennextjs/cloudflare` and Wrangler                |
| Package manager | pnpm workspaces                                      |
| Toolchain       | Vite Plus for format, lint, types, and unit tests    |
| Model runtime   | `@earendil-works/pi-ai` OpenAI-compatible completion |
| Model route     | Cloudflare AI Gateway `custom-opencode` provider     |
| Validation      | Zod at MCP, model-output, and storage boundaries     |
| Persistence     | Numbered SQL migrations and typed Drizzle queries    |
| Authentication  | Better Auth, Google OAuth, and one allowed email     |
| Styling         | Tailwind CSS backed by project tokens                |
| UI primitives   | Radix behavior and selected shadcn/ui patterns       |
| Rendering       | Sanitized Markdown AST with approved renderers       |

External versions are exact in their owning manifest. Root `pnpm-workspace.yaml` overrides fix React
and React DOM across the workspace, while the web app keeps them as direct runtime dependencies. The
lockfile and generated Worker verify the resolved graph.

## Model provider

Implement the provider boundary with the same proven Cloudflare AI Gateway request pattern currently
used by `my-memos`; do not inherit its content model, routes, or feature set:

```text
https://gateway.ai.cloudflare.com/v1/{account}/default/custom-opencode/v1
```

The initial model ID is `deepseek-v4-flash`. The Worker sends `cf-aig-authorization` and deliberately
omits upstream `Authorization` and `x-api-key`; Cloudflare AI Gateway injects the provider key stored
for the `custom-opencode` provider. Every content request also sends
`cf-aig-collect-log-payload: false` and `cf-aig-skip-cache: true`, so the Gateway keeps neither prompt
and response bodies in logs nor a response cache entry. Metadata-only operational logging is allowed.

Upstream provider retention is a separate provider policy and must be verified when the provider is
configured. `packages/ai-core` owns this compatibility contract. Application code asks it to run a
content skill and does not construct provider URLs or headers.

## Request path

```text
MCP createArticle
  -> packages/skills selects Waza and project-owned rich-content skills
  -> packages/ai-core calls the custom provider
  -> Vectorize compares the finished article
  -> apps/web stores the private result in R2 and D1

Signed-in Home AI search
  -> authorize the allowed-email session
  -> Vectorize retrieves a bounded set and D1 re-authorizes it
  -> packages/ai-core answers only from retrieved articles
  -> apps/web validates citations and stores nothing
```

The input exists only in request memory. There is no Cloudflare Workflow, job table, staging bucket,
temporary transcript object, or background cleanup process.

## Storage

| Store     | Purpose                                                  |
| :-------- | :------------------------------------------------------- |
| D1        | One article index row plus Better Auth tables            |
| R2        | Final Chinese and English Markdown with YAML frontmatter |
| KV        | Disposable compiled public-article cache                 |
| Vectorize | Rebuildable similarity and semantic-search vectors       |

D1 is authoritative for existence and visibility. R2 is authoritative for Markdown, title, summary,
and tags. D1 keeps compact metadata, tag, and link JSON projections to serve lists without an R2 read
per row. KV and Vectorize are rebuildable and never authorize access.

The concrete schema, normalization rules, indexes, object keys, and cross-store mutation order are
defined once in [Database](DATABASE.md).

## Read and write rules

- Every create writes `private`; neither MCP input nor model output can override it.
- `createArticle` has no visibility input.
- Public queries include visibility in D1 before reading R2.
- Vector results are filtered through D1 before titles or bodies are returned.
- Create/update writes versioned R2 bodies and the vector before switching the D1 row hash.
- Delete makes the D1 row private before removing KV, R2, Vectorize, and finally the row.
- Repeating a completed delete returns not found and performs no further write.
- Failed generation stores nothing.

## Similarity and graph

Use Workers AI `@cf/baai/bge-m3` for Chinese and English search. It produces 1,024-dimensional vectors;
create Vectorize with 1,024 dimensions and cosine distance. The canonical embedding input is the
Chinese title, summary, and body with frontmatter removed. Inputs beyond the model context fail
instead of being silently truncated.

Query the nearest authorized articles before saving. The code constant starts at `0.92` and can be
calibrated with real articles. Scores at or above it stop creation and return the closest article.
Lower-scoring neighbors become semantic graph edges at read time. Explicit wiki links and shared tags
come from the D1 JSON projections; no model-generated relation records are stored.
