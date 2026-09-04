# Testing and evaluation

Status: Implemented local gates; production smoke remains a release gate

Tests must prove domain correctness, privacy, protocol compatibility, retrieval, and rendered
behavior. A large test count is not evidence by itself. Each layer owns a
different failure class and must run against the smallest truthful boundary.

## Test layers

| Layer                | Boundary                                     | Main evidence                                       |
| :------------------- | :------------------------------------------- | :-------------------------------------------------- |
| Unit                 | Pure TypeScript rules                        | Fast deterministic examples and edge cases          |
| Integration          | Worker modules and local Cloudflare bindings | Real serialization, queries, and mutation order     |
| Contract             | MCP and HTTP boundaries                      | Schemas, status codes, headers, and failure mapping |
| End-to-end           | Generated OpenNext Worker in a browser       | User-visible behavior and privacy                   |
| Retrieval evaluation | Frozen search corpus                         | Quality comparison against an accepted baseline     |
| Release smoke        | Preview or production-like deployment        | Bindings, auth callback, rendering, and rollback    |

White-box tests cover internal rules and store coordination. Black-box tests exercise only MCP or
HTTP contracts. Do not call a unit test an end-to-end test or use mocked bindings as deployment
evidence.

All test code, fixtures, contract scripts, and browser journeys live under a dedicated `__test__/`
directory owned by their package or domain. Test files are never colocated with implementation files.
Web unit tests live in `apps/web/__test__/unit/<domain>/`, browser journeys in
`apps/web/__test__/e2e/`, shared inputs in `apps/web/__test__/fixtures/`, and executable contract or
seed programs in `apps/web/__test__/scripts/`. Package tests live in `packages/<package>/__test__/`,
sibling to `src/`.
Repository-owned tests, setup programs, and contract programs use TypeScript. Markdown, SQL, JSON,
and other data fixtures keep the extension of the format they exercise.

## Unit and property tests

Use Vite Plus tests for:

- frontmatter parsing, canonical Markdown, hashes, stable slugs, and wiki-link extraction;
- long-form rendering through decoded code entities, the fixed Shiki language/alias bundle, dual
  themes, plain-text fallback, structured-fence exclusion, heading anchors, and table overflow;
- tag normalization, hierarchy, existing-tag preference, and the five-tag/one-new-leaf limits;
- article visibility predicates, anonymous result filtering, and hierarchical tag SQL;
- AI Search item-key and write-path sync boundaries, validated authorization metadata, and
  stale-hash concurrency checks;
- submitted-document schemas, Chinese-first persistence, and cross-edition structural parity;
- concise camelCase domain names and exhaustive error mapping where behavior is security-sensitive.

Property tests are justified for canonicalization, tag normalization, cursor round trips, and
visibility filtering because broad generated inputs cover invariants better than repeated examples.
They must use deterministic seeds printed on failure.

## Integration tests

Run Worker-facing integration tests in the Workers runtime with isolated local D1, R2, KV, and
Durable Object state.
Use a narrow in-memory adapter only where the local platform cannot reproduce a binding, such as an
AI Search query; keep a separate contract fixture for its real response shape.

Cover Chinese create/update, supplied editions, visibility, and delete failure at every write
boundary. Assert both the visible result and leftover objects so R2/AI Search orphans, stale
translations, stale cache, and partial D1 writes are detected. Initialize the authoritative schema
from an empty database.

## Contract and black-box tests

- API contract tests cover immediate API key rotation and digest-only Durable Object storage, REST Bearer challenges,
  pagination and reads, and shared authentication with MCP.
- MCP tests use real clients for both supported protocol versions and cover discovery, schemas,
  annotations, accepted article IDs, direct reads, stale updates, and destructive deletion.
- HTTP tests cover the complete anonymous/allowed-email matrix for Home, Articles, Article, Graph,
  browser authoring, visibility changes, and deletion. Unauthorized private resources return not
  found, and the removed AI-search route remains absent.
- Renderer tests parse every supported Markdown fixture and prove that unsupported raw HTML and unsafe
  URLs cannot reach the DOM.

## Browser end-to-end tests

Playwright runs against the generated OpenNext Worker, not only `next dev`. Maintain two browser
contexts: anonymous and an allowed-email session whose D1 token and signed cookie are generated from
the same fixture through Better Auth's public cryptographic API. Never add a production test-login
route, use an unsigned cookie, or let the browser fixture diverge from D1. Run the projects with one
Playwright worker because every viewport shares one local Worker and one mutable D1/R2/KV fixture;
parallel projects would make the owner journey and first-load render evidence order-dependent.

The core journey set is intentionally small:

1. anonymous keyword and tag search returns only public article rows;
2. the signed-in owner uses the same search surface across public and private article rows;
3. Articles has the Notes chronological composition and exposes no search or filter controls;
4. the Chinese owner interface exposes New while other interface locales do not;
5. the owner can open New/Edit, use the Markdown editor, and explicitly save, publish, withdraw, or
   delete while anonymous users cannot reach those mutations; a listed private article must render
   its body before Edit without requiring private metadata, and expose Publish or Withdraw according
   to its current visibility;
6. Article follows the Header locale, renders rich blocks, exposes the Notes TOC/action rails, and
   publishes canonical metadata plus a renderable dynamic social image only when public;
7. Graph has no filter controls, opens linked articles, keeps both columns inside the wide shell, and
   preserves keyboard-accessible relationships plus hidden-scrollbar internal scrolling;
8. the Header language action changes interface copy and uses a current English or Japanese
   translation when available, falling back to Chinese when it is absent or stale;
9. robots, sitemap, RSS, and `llms.txt` routes advertise only public surfaces and articles;
10. unknown paths render the quiet branded 404 surface with working Home and Articles recovery
    actions.

Run these at phone and desktop widths. Exercise the Header language cycle action, theme View
Transition with its reduced-motion path, signed-in
avatar popover, and anonymous sign-in popover. Add screenshot assertions only for the shared shell, search
states, article typography, rich blocks, and graph layout; avoid snapshots of volatile dates or
prose. Automated accessibility checks, keyboard navigation, reduced motion, dark mode, long tables,
and code overflow are release requirements.

## Retrieval evaluation

Evaluate AI Search query, ranking, thresholds, authorization, and result shaping against the same
frozen synthetic corpus before changing a retrieval constant. Measure relevance and private-result
exclusion. An aggregate score cannot override privacy or authorization failures.

## Cloudflare ADLC experiment

Adopt the useful ADLC properties: programmatic steps, reproducible environments, atomic previews,
least privilege, observable failures, and reversible releases. Keep the first implementation simple:

1. Vite Plus, local Worker integration tests, and Playwright remain the required path.
2. A preview URL may add Browser Run with `@cloudflare/playwright` for remote black-box screenshots and
   browser reproduction when account availability and cost are confirmed.
3. `@cloudflare/sandbox` may be trialed in a separate CI Worker to clone a commit and run the same
   commands in an isolated container. It requires Containers and Durable Objects and must receive only
   preview-scoped credentials. It is not an application runtime dependency.
4. Keep browser automation on Browser Run with `@cloudflare/playwright`; use Sandbox only for isolated
   command execution.

Do not add Cloudflare Workflows, an autonomous repair agent, production remote bindings, or automatic
deployment merely to claim ADLC adoption. Promote an experiment only when it is more reliable or
cheaper than the required local/preview path and has an explicit teardown procedure.

## Gates and evidence

The local release evidence is reproducible: Vite Plus covers the domain suites; the numbered D1
migration replays against local state; and the request-only OpenNext Worker builds. The API suite
covers REST plus both MCP protocol generations with one
generated credential and real D1 visibility changes. Playwright
uses a Better Auth session generated through its public cryptographic API and checks anonymous and
owner surfaces at desktop and phone widths, light and dark themes, reduced motion, accessibility,
the rich Japanese article, and expected browser errors only.

Wrangler cannot execute AI Search locally. The owner deletion journey therefore proves that a failed
AI Search cleanup returns the active locale's error and leaves the private article retryable; the
anonymous Home search journey proves that keyword search works without AI Search.
Successful live cleanup and hybrid retrieval are not replaced by mocks. Live successful
create/update/delete cleanup, document ingestion, Google OAuth, and deployment smoke remain
production-account gates.

Every pull request and push to `main` runs the my-memos-style `Commit-CI` workflow: frozen dependency
installation, `pnpm check`, `pnpm test`, the custom Worker build, and `pnpm dry-run`. The final command
executes `wrangler deploy --dry-run`, validates its strict JSON configuration and bundle without
authentication, and never deploys.

Every change runs formatting, lint, types, affected unit tests, and diff checks. Storage, auth, MCP,
rendering, or routing changes also run their integration/contract suites. Release candidates run the
full generated-Worker E2E suite, migration rehearsal, accessibility/visual
checks, and anonymous privacy probes.

A failure must preserve its seed, request ID without private payload, relevant trace, screenshots,
and exact command. A flaky required test blocks release until fixed; it is never silently retried into
green. Production rollout and rollback remain manual for the first release.
