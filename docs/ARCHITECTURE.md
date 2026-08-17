# Architecture and technical stack

Status: Implemented

## Monorepo

```text
apps/web                 Next.js pages, Route Handlers, orchestration, auth, and Cloudflare bindings
packages/ai-core         provider adapter and schema-bound model execution
packages/content         article, Markdown, tag, link, and hash domain rules
packages/skills          pinned upstream skills, loader, registry, and attribution
packages/ui              shadcn components, tokens, icons, theme behavior, and Markdown presentation
```

This is one product and one Worker deployment. Packages exist for reusable ownership and test
boundaries, not as separate services. Do not add a package until code is genuinely shared or has a
stable independent responsibility.

Dependency direction is fixed: `content` and `skills` are independent; `ai-core` may consume both;
`ui` consumes content types but never platform adapters; `apps/web` composes packages with D1, R2,
KV, Vectorize, auth, and transport. Domain packages never import from `apps/web`.

## Selected stack

| Concern          | Selection                                            |
| :--------------- | :--------------------------------------------------- |
| Application      | Next.js 16.3+ App Router and TypeScript 7            |
| Production build | Next.js webpack and OpenNext Cloudflare              |
| Worker build     | `@opennextjs/cloudflare` and Wrangler                |
| Package manager  | pnpm workspaces                                      |
| Toolchain        | Vite Plus for format, lint, types, and unit tests    |
| Model runtime    | Strict non-streaming OpenAI-compatible completion    |
| Model route      | Cloudflare AI Gateway `custom-opencode` provider     |
| Validation       | Zod at MCP, model-output, and storage boundaries     |
| Persistence      | Numbered SQL migrations and typed Drizzle queries    |
| Authentication   | Better Auth, Google OAuth, and one allowed email     |
| Styling          | Tailwind CSS v4 backed by project-owned OKLCH tokens |
| UI primitives    | shadcn Luma source on Base UI                        |
| Icons            | Tree-shaken Lucide React components                  |
| Rendering        | Sanitized Markdown AST with approved renderers       |
| Interface i18n   | Typed registry, request cookie, and Server Action    |

External versions are exact in their owning manifest. Root `pnpm-workspace.yaml` overrides fix React
and React DOM across the workspace, while the web app keeps them as direct runtime dependencies. The
lockfile and generated Worker verify the resolved graph.

Production uses Next.js's supported `--webpack` build mode because the equivalent Turbopack output
duplicates SSR chunks when OpenNext composes the single Worker and exceeds the target account's
upload limit. Development keeps the default Next.js bundler. Mermaid, Vega, and JSON Canvas each
remain behind a renderer-specific `next/dynamic` boundary with SSR disabled; removing those
boundaries pulls client rendering dependencies into the Worker graph.

The shadcn CLI runs from `apps/web` and resolves reusable output into `packages/ui` through matching
workspace `components.json` files. `packages/ui` owns Base UI, Lucide React, class composition, and
the Tailwind source scan. The web app imports component entrypoints and does not fork generated
primitives locally.

Interface i18n is application composition, not a content-package concern. The web layout reads the
validated `my-knowledge:locale` cookie and passes one complete registered dictionary into Server and
Client Components. The language action writes that cookie through a Server Action, which re-renders
the current App Router route. This changes interface labels only; Article, list, search, and Graph
content always use the canonical Chinese document. AI handles the source conversation's
language during article creation rather than exposing content locales to the application. The New
action is shown only for the Chinese interface, and the owner-authorized new-article route keeps its
editor labels in Chinese; editing an existing article still follows the selected interface locale.

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
The Worker requests a non-streaming completion and validates the complete JSON response with Zod;
upstream wait time therefore does not consume Worker CPU parsing incremental stream events.

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
```

The input exists only in request memory. There is no Cloudflare Workflow, job table, staging bucket,
temporary transcript object, or background cleanup process.

## Storage

| Store     | Purpose                                            |
| :-------- | :------------------------------------------------- |
| D1        | One article index row plus Better Auth tables      |
| R2        | Final Chinese Markdown with YAML frontmatter       |
| KV        | Disposable hash-keyed public article cache         |
| Vectorize | Rebuildable similarity and semantic-search vectors |

D1 is authoritative for existence and visibility. R2 is authoritative for Markdown, title, summary,
and tags. D1 keeps compact metadata, tag, and link JSON projections to serve lists and Graph without
an R2 read per row. KV and Vectorize are rebuildable and never authorize access.

The concrete schema, normalization rules, indexes, object keys, and cross-store mutation order are
defined once in [Database](DATABASE.md).

## Read and write rules

- Every create writes `private`; neither MCP input nor model output can override it.
- `createArticle` has no visibility input.
- Public queries include visibility in D1 before reading R2.
- Public article reads check D1, then read through the versioned KV entry, and use R2 on a cache miss
  or observable cache failure.
- Vector results are filtered through D1 before titles or bodies are returned.
- Create/update conditionally writes the human-readable R2 paths using object ETags, then writes the
  vector before switching the D1 row hash; a failed switch restores the prior Markdown.
- Update invalidates the previous hash-keyed KV entry; making an article private or deleting it
  invalidates the current version.
- Delete makes the D1 row private before removing KV, R2, Vectorize, and finally the row.
- Repeating a completed delete returns not found and performs no further write.
- Failed generation stores nothing.

## Similarity and graph

Use multilingual Workers AI `@cf/baai/bge-m3` for semantic search. It produces 1,024-dimensional vectors;
create Vectorize with 1,024 dimensions and cosine distance. The canonical embedding input is the
Chinese title, summary, and body with frontmatter removed. Inputs beyond the model context fail
instead of being silently truncated.

Query the nearest authorized articles before saving. The code constant starts at `0.92` and can be
calibrated with real articles. Scores at or above it stop creation and return the closest article.
Lower-scoring neighbors become article-page semantic relationships at read time. The graph uses
explicit wiki links and shared tags from the D1 JSON projections; no relation records are stored.

## Web module boundaries

`apps/web/src` is organized by domain. React composition lives under each domain's `components/`
directory, application operations under `application/`, and Cloudflare/Drizzle adapters under
`persistence/`. `articles/index.ts` is the article domain entrypoint used by pages, Route Handlers,
MCP, and other domains; code inside `articles` imports its concrete siblings directly. Article
persistence separates D1 query, R2/KV document, Vectorize, relation, row-mapping, and mutation
responsibilities rather than mixing all reads in one repository file.

`shell/` owns the shared page layout and primary navigation. MCP separates Bearer authentication,
tool operations, and HTTP transport. Search is a deterministic authorized D1 read. Storage files may
coordinate the Cloudflare stores but never import React or Next.js UI concerns.

Shared packages follow the same boundary: `content` separates schema, document, tag, link, locale,
and hash behavior; `ai-core` separates Gateway configuration, model execution, and article
generation. Their `index.ts` files are public package contracts.
