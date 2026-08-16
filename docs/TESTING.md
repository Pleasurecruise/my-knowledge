# Testing and evaluation

Status: Proposed implementation contract

Tests must prove domain correctness, privacy, protocol compatibility, rendered behavior, and the
quality of model-assisted results. A large test count is not evidence by itself. Each layer owns a
different failure class and must run against the smallest truthful boundary.

## Test layers

| Layer              | Boundary                                     | Main evidence                                       |
| :----------------- | :------------------------------------------- | :-------------------------------------------------- |
| Unit               | Pure TypeScript rules                        | Fast deterministic examples and edge cases          |
| Integration        | Worker modules and local Cloudflare bindings | Real serialization, queries, and mutation order     |
| Contract           | MCP, model, embedding, and HTTP boundaries   | Schemas, status codes, headers, and failure mapping |
| End-to-end         | Generated OpenNext Worker in a browser       | User-visible behavior and privacy                   |
| Offline evaluation | Frozen knowledge and model test sets         | Quality comparison against an accepted baseline     |
| Release smoke      | Preview or production-like deployment        | Bindings, auth callback, rendering, and rollback    |

White-box tests cover internal rules and store coordination. Black-box tests exercise only MCP or
HTTP contracts. Do not call a unit test an end-to-end test or use mocked bindings as deployment
evidence.

## Unit and property tests

Use Vite Plus tests for:

- frontmatter parsing, canonical Markdown, hashes, stable slugs, and wiki-link extraction;
- tag normalization, hierarchy, existing-tag preference, and the five-tag/one-new-leaf limits;
- article visibility predicates and anonymous result filtering;
- similarity threshold boundaries and stale-hash concurrency checks;
- model-output schemas, bilingual structural parity, and citation validation;
- prompt construction that disables payload logging and never accepts client visibility overrides;
- concise camelCase domain names and exhaustive error mapping where behavior is security-sensitive.

Property tests are justified for canonicalization, tag normalization, cursor round trips, and
visibility filtering because broad generated inputs cover invariants better than repeated examples.
They must use deterministic seeds printed on failure.

## Integration tests

Run Worker-facing integration tests in the Workers runtime with isolated local D1, R2, and KV state.
Use a narrow in-memory adapter only where the local platform cannot reproduce a binding, such as a
Vectorize query; keep a separate contract fixture for its real response shape.

Cover create, update, visibility, and delete failure at every write boundary. Assert both the visible
result and leftover objects so R2/vector orphans, stale KV, and partial D1 writes are detected. Run the
numbered SQL migrations from an empty database and from the immediately previous schema.

## Contract and black-box tests

- MCP tests use real clients for both supported protocol versions and cover discovery, Bearer auth,
  schemas, annotations, duplicate results, stale updates, and destructive deletion.
- HTTP tests cover the complete anonymous/allowed-email matrix for Home, Articles, Article, Graph,
  AI search, and deletion. Unauthorized private resources return not found.
- Provider tests replay recorded response shapes without real secrets, then run a small opt-in live
  smoke against AI Gateway before release. They verify headers, no payload logging/cache, timeouts,
  schema failures, and citation rejection.
- Renderer tests parse every supported Markdown fixture and prove that unsupported raw HTML and unsafe
  URLs cannot reach the DOM.

## Browser end-to-end tests

Playwright runs against the generated OpenNext Worker, not only `next dev`. Maintain two browser
contexts: anonymous and an allowed-email session created through supported Better Auth test setup;
never add a production test-login route or hand-build an auth cookie.

The core journey set is intentionally small:

1. anonymous keyword and tag search returns only public article cards;
2. anonymous users cannot see AI mode, private articles, or Delete;
3. the signed-in owner receives a grounded AI answer with working article citations;
4. Articles filters by nested tags and visibility without losing pagination state;
5. Article renders both locales and rich blocks, then confirmed deletion removes it;
6. Graph opens linked articles and has an equivalent keyboard-accessible relationship list.

Run these at phone and desktop widths. Add screenshot assertions only for the shared shell, search
states, article typography, rich blocks, and graph layout; avoid snapshots of volatile dates or model
prose. Automated accessibility checks, keyboard navigation, reduced motion, dark mode, long tables,
and code overflow are release requirements.

## Offline model evaluation and A/B comparison

This personal application does not need production traffic splitting. Here, A/B means evaluating a
candidate prompt, skill, model, threshold, or retrieval strategy against the current baseline on the
same frozen fixtures before changing a code constant.

Keep synthetic or explicitly approved test corpora for:

- long-form writing across technology, politics, economics, and mixed-domain articles;
- tag reuse and new-leaf decisions;
- Chinese-to-English structure, links, code, and claim preservation;
- labeled duplicate, near-duplicate, related, and unrelated article pairs;
- answerable and unanswerable knowledge questions with expected source articles.

Measure schema success, tag-limit compliance, tag reuse, translation structure preservation,
duplicate precision/recall, citation precision, unsupported-claim rate, refusal correctness, latency,
and model cost. Hard invariants must never regress. A subjective writing change requires blinded owner
review; an aggregate score cannot override privacy, schema, or citation failures. Store evaluation
fixtures and summaries, not production conversations or full provider traces.

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

Every change runs formatting, lint, types, affected unit tests, and diff checks. Storage, auth, MCP,
rendering, or routing changes also run their integration/contract suites. Release candidates run the
full generated-Worker E2E suite, live provider smoke, migration rehearsal, accessibility/visual
checks, and anonymous privacy probes.

A failure must preserve its seed, request ID without private payload, relevant trace, screenshots,
and exact command. A flaky required test blocks release until fixed; it is never silently retried into
green. Production rollout and rollback remain manual for the first release.
