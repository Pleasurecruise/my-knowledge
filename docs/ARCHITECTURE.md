# Architecture and technical stack

Status: Implemented

## Monorepo

```text
apps/web                 Next.js, MCP, article orchestration, Queue consumer, auth, and bindings
packages/ai-core         provider adapter and schema-bound model execution
packages/content         article, Markdown, tag, link, and hash domain rules
packages/skills          pinned upstream skills, loader, registry, and attribution
packages/ui              shadcn components, tokens, icons, theme behavior, and Markdown presentation
```

This is one product and one Worker deployment. A custom OpenNext entry reuses the generated fetch
handler and adds the Queue consumer, so HTTP/MCP requests and background jobs remain separate Worker
invocations without adding another application. Packages exist for reusable ownership and test
boundaries, not as independent services. Do not add a package until code is genuinely shared or has a
stable independent responsibility.

Dependency direction is fixed: `content` and `skills` are independent; `ai-core` may consume both;
`ui` consumes content types but never platform adapters; `apps/web` composes packages with D1, R2,
KV, AI Search, Queue, auth, and transport. Domain packages never import from `apps/web`.

## Selected stack

| Concern          | Selection                                            |
| :--------------- | :--------------------------------------------------- |
| Application      | Next.js 16.3+ App Router and TypeScript 7            |
| Production build | Next.js webpack and OpenNext Cloudflare              |
| Worker build     | `@opennextjs/cloudflare` and Wrangler                |
| Package manager  | pnpm workspaces                                      |
| Toolchain        | Vite Plus for format, lint, types, and unit tests    |
| Model runtime    | Strict non-streaming OpenAI-compatible completion    |
| Model route      | Cloudflare AI Gateway Dynamic Route with BYOK keys   |
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
the current App Router route. This changes interface labels and the rendered Article body; list,
search, and Graph summaries always use the canonical Chinese title and summary, while the Article page
renders whichever stored edition matches the current interface locale, falling back to Chinese when
one is missing. AI handles the source conversation's language during article creation, and a separate
internal translation step produces the English and Japanese editions, rather than exposing content
locale choice to the caller. The New action is shown only for the Chinese interface, and the
owner-authorized new-article route keeps its editor labels in Chinese; editing an existing article
still follows the selected interface locale.

Server-rendered authorization resolves the Better Auth session directly from the current request
headers in each protected page or Route Handler. Article metadata always uses anonymous access, so a
private title or summary never enters a metadata render and the article page has one owner-session
decision for its body.

## Model provider

Implement the provider boundary with the same proven Cloudflare AI Gateway request pattern currently
used by `my-memos`; do not inherit its content model, routes, or feature set:

```text
https://gateway.ai.cloudflare.com/v1/{account}/default/compat
```

Requests go through a Cloudflare AI Gateway Dynamic Route. The request body names the route
`dynamic/article` instead of a raw model ID; the route owns the primary model, its rate and budget
limits, and the fallback model it switches to when a limit is exceeded, so the Worker code only
references the route name. The Worker sends `cf-aig-authorization` and deliberately omits upstream
`Authorization` and `x-api-key`; Cloudflare AI Gateway injects the provider keys stored with BYOK.
Every content request also sends `cf-aig-collect-log-payload: false` and `cf-aig-skip-cache: true`,
so the Gateway keeps neither prompt and response bodies in logs nor a response cache entry.
Metadata-only operational logging is allowed. The Worker requests a non-streaming completion and
validates the complete JSON response with Zod; upstream wait time therefore does not consume Worker
CPU parsing incremental stream events.

Upstream provider retention is a separate provider policy and must be verified when each provider is
configured. `packages/ai-core` owns this compatibility contract. Application code asks it to run a
content skill and does not construct provider URLs or headers.

## Request path

```text
MCP createArticle
  -> D1 inserts articleJobs(pending), KV stores expiring input, Queue receives { jobId }
  -> MCP returns { status: accepted, jobId }
  -> the Worker's queue handler claims the job in a separate invocation
  -> packages/skills selects Waza and project-owned rich-content skills
  -> packages/ai-core calls the dynamic route
  -> the queue handler stores the result, indexes it in AI Search, and updates the D1 job
  -> MCP getArticleJob resolves status or the terminal result
```

Submitted input is stored only under an expiring, namespaced KV key. Queue messages contain only the
job UUID. Terminal processing deletes the input immediately; the TTL cleans abandoned submissions.
Job rows contain state and final article references, never submitted content or generated Markdown.
There is no Workflow, staging bucket, temporary R2 object, or stored provider payload.

## Storage

| Store     | Purpose                                           |
| :-------- | :------------------------------------------------ |
| D1        | Article index, creation jobs, and Better Auth     |
| R2        | Final Markdown editions with YAML frontmatter     |
| KV        | Public article cache and expiring job input       |
| AI Search | Managed index for hybrid search and grounded chat |

D1 is authoritative for existence and visibility. R2 is authoritative for Markdown, title, summary,
and tags. D1 keeps compact metadata, tag, and link JSON projections to serve lists and Graph without
an R2 read per row. KV and the AI Search index are rebuildable and never authorize access.

The concrete schema, normalization rules, indexes, object keys, and cross-store mutation order are
defined once in [Database](DATABASE.md).

## Read and write rules

- Every create writes `private`; neither MCP input nor model output can override it.
- `createArticle` has no visibility input.
- Queue delivery is at least once; a conditional D1 claim makes terminal jobs idempotent, and a stale
  processing lease permits recovery after an interrupted consumer.
- Public queries include visibility in D1 before reading R2.
- Public article reads check D1, then read through the versioned KV entry, and use R2 on a cache miss
  or observable cache failure.
- Search results are re-authorized through D1 before titles or bodies are returned.
- Create/update conditionally writes the human-readable R2 paths using object ETags, then uploads the
  article editions to AI Search before switching the D1 row hash; a failed switch restores the prior
  Markdown.
- Update invalidates the previous hash-keyed KV entry; making an article private or deleting it
  invalidates the current version.
- Delete makes the D1 row private before removing KV, R2, AI Search items, and finally the row.
- Repeating a completed delete returns not found and performs no further write.
- Failed generation stores only a sanitized terminal job result and deletes its temporary input.

## Search and graph

AI Search owns vectorization and retrieval. Each article's three Markdown editions are uploaded under
a deterministic item key derived from the article ID. One instance, `my-knowledge`, holds every article and
serves both consumption modes: owner search and chat, and anonymous hybrid search. The index itself
never authorizes a result: anonymous results are re-authorized through D1 (published rows only)
before titles or bodies are returned, the same gate that guards keyword search, lists, the graph,
and feeds.

Creation does not query D1 or AI Search for duplicates before storage. `contentHash` remains version
metadata for concurrency, caches, and index authorization, and different article rows may share it.
The graph uses explicit wiki links and shared tags from the D1 JSON projections; no relation records
are stored.

## Web module boundaries

`apps/web/src` is organized by domain. React composition lives under each domain's `components/`
directory, application operations under `application/`, and Cloudflare/Drizzle adapters under
`persistence/`. `articles/index.ts` is the article domain entrypoint used by pages, Route Handlers,
MCP, and other domains; code inside `articles` imports its concrete siblings directly. Article
persistence separates D1 query, R2/KV document, AI Search indexing, relation, row-mapping, and
mutation responsibilities rather than mixing all reads in one repository file.

`shell/` owns the shared page layout and primary navigation. MCP separates Bearer authentication,
tool operations, and HTTP transport. Search is a deterministic authorized D1 read. Storage files may
coordinate the Cloudflare stores but never import React or Next.js UI concerns.

Shared packages follow the same boundary: `content` separates schema, document, tag, link, locale,
and hash behavior; `ai-core` separates Gateway configuration, model execution, and article
generation. Their `index.ts` files are public package contracts.
