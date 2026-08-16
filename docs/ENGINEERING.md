# Engineering rules

Status: Proposed

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
- Compare content hashes before replacing translations or vectors to prevent stale writes.
- Time, IDs, randomness, models, and external services enter through explicit boundaries so critical
  logic is deterministic in tests.

## Security

- Better Auth + Google OAuth + `ALLOWED_EMAIL` for web ownership.
- Fixed high-entropy MCP key for Agent ownership.
- No submitted conversation, article body, embedding, secret, email, or private title in logs.
- AI Gateway calls disable payload logging and caching; metadata-only metrics may remain.
- Raw HTML and unsafe Markdown URLs are rejected/sanitized.
- Private vector candidates are re-authorized through D1.
- Local development and preview use local state and test credentials; they do not use production
  resources or credentials by default.

## Verification

Vite Plus is the single repository quality tool. Do not add ESLint, Prettier, or a separate unit-test
runner. `vp fmt` formats, `vp lint` performs linting, `vp check` includes formatting, type-aware
linting, and type checking, and `vp test` runs unit tests. Next.js and OpenNext continue to own the
application and Worker builds.

Phase 1 adds root commands for:

```text
format | lint | typecheck | unit | integration | MCP contract
privacy matrix | OpenNext build | Worker smoke | docs links | diff check
```

[Testing](TESTING.md) owns test layers, fixtures, model evaluation, browser coverage, and release
evidence. Report only commands actually run; a mock unit test does not prove deployment or the real
Worker entrypoint.
