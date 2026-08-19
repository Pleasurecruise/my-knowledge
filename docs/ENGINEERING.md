# Engineering rules

Status: Active implementation rules

## Hard rules

### Do not create helpers casually

A helper must name a domain operation, isolate an external/lifecycle boundary, make validation or
cleanup consistent, form a stable contract, or remove repeated non-trivial logic. Do not extract a
single expression, wrap one framework call, anticipate hypothetical reuse, or create generic
`utils`, `helpers`, and `common` modules without a clear owner.

### Do not add fallbacks casually

A fallback must be deliberate, named, observable, tested product behavior. Identity, permissions,
secrets, bindings, canonical content, and publication completeness fail closed.
Never catch an error and return empty data, default permission, stale success, or a fake published
state.
`catch` and nullish coalescing are fallback mechanisms, not neutral syntax. Catch only at a boundary
that can map the failure to an explicit domain or user-visible result. Use `??` only when the left
side is intentionally optional and the right side is its specified product value; never use it to
hide missing required content, configuration, persisted data, or provider output.

### Do not use assertions casually

Prefer schema parsing, control-flow narrowing, `satisfies`, typed constructors, and exhaustive
unions. Assertions are allowed only beside runtime evidence or a narrow third-party compatibility
boundary. Double assertions and assertions that hide incomplete union handling are forbidden.

### Do not use unsafe types casually

Production `any`, long-lived `unknown`, unconstrained generics, unchecked JSON casts, broad index
signatures, and non-null assertions that hide lifecycle errors are forbidden. A third-party shim
needs isolation, tests, explanation, and a removal condition.

## Naming

- Keep names concise and domain-specific.
- Use camelCase for project-owned values, MCP tools, schema fields, and D1 names.
- Use PascalCase for components/types.
- Keep UPPER_SNAKE_CASE only for environment variables and shared policy constants.
- Convert third-party naming once at the adapter.
- Prefer a short established domain word over a compressed abbreviation or a sentence-shaped name.
- A function name is a verb; a value name is a noun or predicate. Do not encode type information in
  names.

## Boundaries

- Validate HTTP, MCP, AI output, configuration, persisted JSON, and provider responses once.
- A constraint has one owning schema. Consumers import or derive from that schema instead of
  restating the same Zod shape, regular expression, or parser at another boundary.
- Routes authenticate, validate, call an application operation, and map the result.
- Cloudflare types stay in app adapters.
- Model prompts and output schemas stay versioned beside the module that owns the operation; provider
  request code stays in `src/platform`.
- Authorization belongs in server data access, not UI filtering.
- Every temporary/staged/derived resource has cleanup ownership.
- Imports follow the module entrypoints described in [Architecture](ARCHITECTURE.md). Deep imports
  across modules and circular dependencies are forbidden.
- Domain rules do not import React, Next.js, Cloudflare bindings, model SDKs, or storage drivers.
- Route Handlers contain transport work only and call package entrypoints.

## Functions and state

- Keep a function at one abstraction level and give each side effect an explicit owner.
- Pass a small domain object when arguments form one concept; do not introduce parameter bags merely
  to hide an incoherent function.
- Prefer immutable values and explicit return results. Shared mutable state and hidden singleton
  state are forbidden outside framework-managed bindings.
- Model expected outcomes with discriminated unions. Throw only for exceptional failures that cannot
  be handled locally.
- Comments explain constraints and reasons. They do not narrate syntax or preserve dead alternatives.

## TypeScript

- Use TypeScript 7. Keep its patch version exact at the workspace root and upgrade it deliberately.
- Enable strict mode plus unchecked indexed-access and exact optional-property checks.
- Parse external data into named schemas, then use inferred types internally.
- Exhaustively handle states with `never`; do not add a default branch that hides a new state.
- Keep generics narrow and meaningful. Prefer a concrete domain type over a reusable abstraction with
  only one caller.
- Generated Cloudflare binding types are authoritative and are never edited by hand.
- Wrangler writes binding and runtime declarations to the ignored
  `apps/web/node_modules/.wrangler-types.d.ts`, then `next typegen` generates route-aware `PageProps`
  and `RouteContext` declarations before checks and Worker builds. Generated Cloudflare environment
  declarations do not live in or get committed from the source tree.

## Dependencies

- Pin every external package to its exact current version; never use `^`, `~`, `latest`, or an
  unpinned Git reference.
- Use `workspace:*` only for packages owned by this monorepo.
- Upgrade related runtime packages together and verify the generated OpenNext Worker.
- Review lifecycle scripts and record package-level pnpm `allowBuilds` decisions; never approve them
  interactively without inspecting ownership and purpose.
- Require a 1,440-minute release age for newly resolved package versions.
- A dependency must have one owner and a first-release use; do not install alternatives for the same
  renderer, schema, or component responsibility.

## Data and concurrency

- D1 migrations are append-only after deployment and include a tested rollback or forward-repair
  strategy.
- Numbered SQL migrations are authoritative; the Drizzle schema mirrors them for typed queries. Do
  not add a migration generator, schema push, or a runtime migration endpoint.
- Every mutation declares its write order, idempotency, and cleanup behavior.
- Compare content hashes before the D1 row switch to prevent stale writes across R2 and AI Search.
- Time, IDs, randomness, models, and external services enter through explicit boundaries so critical
  logic is deterministic in tests.

## Security

- Better Auth + Google OAuth + `ALLOWED_EMAIL` for web ownership.
- Fixed high-entropy MCP key for Agent ownership.
- No submitted conversation, article body, secret, email, or private title in logs.
- AI Gateway calls enable payload logging (`cf-aig-collect-log-payload: true`) and disable
  response caching (`cf-aig-skip-cache: true`); Cloudflare's AI Gateway log store retains the
  request and response bodies for its default retention window. Metadata-only metrics stay
  in the application.
- Raw HTML and unsafe Markdown URLs are rejected/sanitized.
- Private AI Search candidates are re-authorized through D1.
- Local development and preview use local state and test credentials; they do not use production
  resources or credentials by default.

## Verification

Vite Plus is the single repository quality tool. Do not add ESLint, Prettier, or a separate unit-test
runner. `vp fmt` formats, `vp lint` performs linting, `vp check` includes formatting, type-aware
linting, and type checking, and `vp test` runs unit tests. Next.js and OpenNext continue to own the
application and Worker builds.

The root exposes these quality commands:

```text
format | lint | test | check | build | dry-run | test:mcp | test:e2e
```

[Testing](TESTING.md) owns test layers, fixtures, model evaluation, browser coverage, and release
evidence. Report only commands actually run; a mock unit test does not prove deployment or the real
Worker entrypoint.

## Module boundaries

`apps/web/src` uses vertical domain slices. React composition belongs in `components/`, use-case
coordination in `application/`, and Cloudflare or Drizzle access in `persistence/`. Shared DTOs live
in the owning domain's `types.ts`; substantial component props live in an adjacent
`<component>.types.ts`. Avoid global type files, prop barrels, optional property bags, unsafe casts,
and state introduced only to force rendering. Prefer discriminated unions for real UI and operation
states and validate untrusted values at their boundary.

Persistence separates D1 queries, R2/KV documents, AI Search indexing and retrieval, relation
assembly, row mapping, and mutation coordination. A domain entrypoint serves external consumers; code inside the domain
imports concrete siblings directly and never imports its own barrel. Web application and Web test
code use `@/` across domains or app/test boundaries, while files within one domain use relative
imports. Package tests use relative imports to sibling source because package aliases are not
defined.

Transport modules keep authentication and protocol mapping separate from operations. Route Handlers
authenticate, validate, invoke an application operation, and map its result; ranking and storage
coordination stay outside routes. Package entrypoints export public contracts
only, package internals split by domain responsibility, and consumers do not deep-import them.

CSS follows the same ownership rule. Shared palette, semantic tokens, browser defaults, and Markdown
presentation live in `@my-knowledge/ui`. Tailwind utilities own ordinary page composition. A separate
application stylesheet is justified only for behavior that becomes less clear as utilities, such as
the graph's SVG edges and perspective stage; do not create one stylesheet per component or page.
Components consume semantic tokens rather than raw color, radius, font, or timing values.

## Documentation

Product documents describe current behavior, durable boundaries, and release evidence. They do not
serve as a file-by-file implementation inventory or preserve superseded proposals. When behavior
changes, revise the owning statement and remove the obsolete one; do not add a second explanation in
another document. Status labels distinguish locally verified work from production-account work.

## Component source

- Install or refresh shadcn components with the CLI from `apps/web`; do not hand-copy registry files.
- Keep `apps/web/components.json` and `packages/ui/components.json` aligned on `base-luma`, Base UI,
  Tailwind CSS variables, and Lucide.
- Reusable primitives live in `packages/ui/src/components` and are imported through
  `@my-knowledge/ui/components/*`. Application code composes them and does not recreate buttons,
  selects, dialogs, popovers, tooltips, tabs, switches, progress, or cards with ad hoc markup.
- `packages/ui/src/styles/tokens.css` is the only color and semantic-token source. The Tailwind theme
  maps those values to shadcn utilities; generated component classes never own palette values.
- Lucide React belongs to `@my-knowledge/ui`. Import only named icons through its icon entrypoint so
  application code stays tree-shakable and the dependency has one owner.
- Registry components are open source under MIT; changes are allowed, but unused third-party
  libraries and parallel primitives are not retained.

## Internationalization

- `apps/web/src/i18n/registry.ts` is the single interface-locale registry. Complete typed
  dictionaries live in `messages/zh.ts`, `messages/en.ts`, and `messages/ja.ts`. The Chinese filename
  is intentionally concise; its registry code remains the precise BCP 47 value `zh-CN`.
- Do not scatter locale unions, add an `ARTICLE_LOCALES` environment variable, or maintain a second
  menu list. A new interface locale adds one complete message module and one registry entry;
  incomplete dictionaries fail type checking.
- The interface cookie is validated against that registry. Only the documented default may replace an
  absent or unsupported interface choice; article content has no analogous fallback.
- Interface locale affects labels and which stored article edition renders. Every create or update
  saves the Chinese, English, and Japanese editions together; reading an article renders whichever
  edition matches the interface locale, falling back to Chinese when one is missing.
- User-facing interface labels may be translated. Placeholders, operational errors, protocol errors,
  and thrown diagnostics remain English.
