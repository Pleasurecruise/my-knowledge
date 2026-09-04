# Architecture and technical stack

Status: Implemented

## Monorepo

```text
apps/web                 Next.js, REST, MCP, article persistence, auth, and bindings
packages/content         article, Markdown, tag, link, and hash domain rules
packages/ui              shadcn components, tokens, icons, theme behavior, and Markdown presentation
```

This is one product and one Worker deployment. Content generation and translation run locally outside
the Worker; the deployed application only validates, stores, indexes, retrieves, renders, and mutates
finished articles. Packages exist for reusable ownership and test boundaries, not as independent
services. Do not add a package until code is genuinely shared or has a stable responsibility.

Dependency direction is fixed: `content` is independent; `ui` consumes content types but never
platform adapters; `apps/web` composes both with D1, R2, KV, Durable Objects, AI Search, auth, and
transport. Domain packages never import from `apps/web`.

## Selected stack

| Concern          | Selection                                            |
| :--------------- | :--------------------------------------------------- |
| Application      | Next.js 16.3+ App Router and TypeScript 7            |
| Production build | Next.js webpack and OpenNext Cloudflare              |
| Worker build     | `@opennextjs/cloudflare` and Wrangler                |
| Package manager  | pnpm workspaces                                      |
| Toolchain        | Vite Plus for format, lint, types, and unit tests    |
| Validation       | Zod at REST, MCP, Markdown, and storage boundaries   |
| Persistence      | Numbered SQL migrations and typed Drizzle queries    |
| Authentication   | Better Auth plus one generated owner API key         |
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
one is missing. The local workflow may submit English and Japanese editions with Chinese through REST.
The New action is shown only for the Chinese interface, and the
owner-authorized new-article route keeps its editor labels in Chinese; editing an existing article
still follows the selected interface locale.

Server-rendered authorization resolves the Better Auth session directly from the current request
headers in each protected page or Route Handler. Article metadata always uses anonymous access, so a
private title or summary never enters a metadata render and the article page has one owner-session
decision for its body. External REST and MCP requests use one rotatable Bearer API key whose
SHA-256 digest and creation timestamp live in this Worker's single strongly consistent Durable
Object instance. Only the allowed-email browser session may generate or regenerate it.
Article Route Handlers accept that session when no Authorization header exists; a supplied
Authorization header must validate on its own.

## Request path

```text
Local workflow produces semantic Markdown
  -> REST or MCP authenticates and validates it
  -> R2 writes zh.md, AI Search accepts zh.md, D1 inserts the public article
  -> REST writes any supplied en and ja editions to R2 and D1 child metadata
  -> the response returns the stored article immediately
```

There is no D1 job table, temporary job input, Queue, Workflow, staging bucket, model provider,
runtime prompt, or stored provider payload.

## Storage

| Store          | Purpose                                           |
| :------------- | :------------------------------------------------ |
| D1             | Chinese article index, translation metadata, auth |
| R2             | Article Markdown                                  |
| KV             | Public article cache                              |
| Durable Object | API key digest and creation time                  |
| AI Search      | Chinese-only hybrid article search                |

D1 is authoritative for existence, visibility, and list metadata. R2 is authoritative for Markdown.
D1 keeps compact title, summary, tag, and link projections to serve lists and Graph without
an R2 read per row. KV and the AI Search index are rebuildable and never authorize access. The
`my-knowledge-api-key` is the only generated API key authority for this application. The same
exported class hosts separate `my-memos-api-key` and `my-moment-api-key` instances without sharing
state between applications.

The concrete schema, normalization rules, indexes, object keys, and cross-store mutation order are
defined once in [Database](DATABASE.md).

## Read and write rules

- Every create writes `public`; withdrawal is a separate owner mutation.
- `createArticle` has no visibility input.
- One stable article ID across R2, AI Search, and D1 identifies each stored article.
- Public queries include visibility in D1 before reading R2.
- Public article reads check D1, then read through the versioned KV entry, and use R2 on a cache miss
  or observable cache failure.
- Search results are re-authorized through D1 before titles or bodies are returned.
- Create/update conditionally writes the stable Chinese R2 path using object ETags, then uploads
  eligible Chinese to AI Search before switching the D1 row hash. Supplied translations are stored afterward.
- Update invalidates the previous hash-keyed KV entry; making an article private or deleting it
  invalidates the current version.
- Delete makes the D1 row private before removing KV, R2, AI Search items, and finally the row.
- Repeating a completed delete returns not found and performs no further write.

## Search and graph

AI Search owns vectorization and retrieval in the `my-knowledge` instance. Index-eligible articles
use Chinese Markdown and a deterministic item key derived from the article ID. D1 owns authorization;
retrieval never grants access by itself. [Product](PRODUCT.md#surface-and-access) defines which callers
may use AI Search.

Creation does not query D1 or AI Search for duplicates before storage. `contentHash` remains version
metadata for concurrency, caches, and index authorization, and different article rows may share it.
The graph uses explicit wiki links and shared tags from the D1 JSON projections; no relation records
are stored.

## Web module boundaries

`apps/web/src` is organized by domain. React composition lives under each domain's `components/`,
Cloudflare/Drizzle adapters under `persistence/`, and transport-neutral owner operations in
`articles/service.ts`. Pages use `articles/index.ts`; REST and MCP use the service. Code inside the
article domain imports concrete siblings directly. Persistence separates D1 query, R2/KV document,
AI Search indexing, relation, row-mapping, and mutation responsibilities. Neither transport imports
persistence or the other's schemas, responses, or operations.

`shell/` owns the shared page layout and primary navigation. `api/` owns REST schemas and transport
responses; `auth/` owns the browser and generated API-key checks; MCP separates tool operations
from HTTP transport. Search is a deterministic authorized D1 read. Storage files may coordinate the
Cloudflare stores but never import React or Next.js UI concerns.

Shared packages follow the same boundary: `content` separates schema, document, tag, link, locale,
and hash behavior; `ui` owns reusable rendering and interface primitives. Their `index.ts` files are
public package contracts.
