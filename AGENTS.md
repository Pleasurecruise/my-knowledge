# Project instructions

Implement, document, and verify changes directly. Keep README concise, product facts in `docs/`,
and temporary verification evidence in `.agents/`.

## Core workflow

### 1. Establish scope

Read the owning documents and identify the expected behavior and verification. Do not create a plan
file for each code change. Create or maintain a plan only when the user explicitly requests one.
Keep usage instructions in README and durable decisions in their owning documents. Do not commit
unless the user has authorized the Git workflow.

### 2. Implement and document

Read only the documents that own the affected behavior:

- [Product](docs/PRODUCT.md): routes, permissions, and release scope
- [Architecture](docs/ARCHITECTURE.md): workspaces, runtime, auth, providers, and storage boundaries
- [Content](docs/CONTENT.md): article types, Markdown, tags, and links
- [Database](docs/DATABASE.md): schema, persistence order, and migrations
- [Workflows](docs/WORKFLOWS.md): ingestion, retrieval, and mutations
- [Design](docs/DESIGN.md): frontend system and page composition
- [Engineering](docs/ENGINEERING.md): code, naming, dependency, and error rules
- [Testing](docs/TESTING.md): fixtures, test boundaries, evaluation, and release evidence
- [Deployment](docs/DEPLOYMENT.md): Cloudflare configuration and release procedure

Update the owning document when behavior changes. Documentation is durable but not append-only:
revise, merge, or delete obsolete material so the current state remains truthful. Avoid duplicate
facts and split a document only when its scope becomes hard to navigate.

### 3. Verify feedback-sensitive work

Read and follow the matching specification before implementation:

| Change type        | Specification                           | Required evidence                         |
| :----------------- | :-------------------------------------- | :---------------------------------------- |
| Frontend or visual | `.agents/specs/frontend.md`             | Real browser, screenshots, clean console  |
| Performance        | `.agents/specs/performance.md`          | Comparable before/after measurements      |
| Retrieval          | `.agents/specs/retrieval-evaluation.md` | Frozen corpus and baseline/candidate data |

Add a specification only when another repeatable feedback loop genuinely needs distinct evidence.

### 4. Check the product north star

Changes should support an outcome in `.agents/POLARIS.md`. If a proposed change serves none,
remove it from scope or ask before proceeding. Stop and report when evidence shows a hard invariant
regressed.

## Automatic goal or loop execution

1. Select applicable specifications and identify the north-star relationship; no plan file is required.
2. Complete one bounded step, run its smallest truthful check, and report meaningful progress.
3. Pause for user direction when the goal has materially different interpretations, scope must expand,
   a hard invariant may regress, or completion needs an account, secret, payment, or policy decision.
4. After the same acceptance criterion fails three times for the same reason, report the evidence and
   blocker instead of retrying indefinitely.
5. Finish after required evidence exists; archive a user-requested plan if one was used.

## Product invariants

- This is one personal application, not a distributed platform.
- R2 owns Markdown; D1 indexes metadata and visibility; KV and Vectorize are derived.
- AI search questions, retrieved context, and generated answers are not stored.
- Every submitted article starts public. Visibility changes require the shared API credential or the
  allowed-email browser session.
- The web has Home (article chronology), Explore (search and Graph), and Article only. Legacy
  Articles and Graph routes redirect to those surfaces. The allowed-email owner may create, edit,
  publish, withdraw, and delete Articles from those existing surfaces; there is no owner dashboard.
- Anonymous users receive keyword/tag search only. AI search requires the allowed-email session.
- Article metadata, social images, robots, and sitemap use anonymous authorization and never expose
  private titles, tags, timestamps, or bodies.
- Local tools submit semantic Markdown; the Next.js frontend owns presentation.
- Project names are concise camelCase. Foreign naming stops at adapters.

## Engineering guardrails

- Prefer the smallest complete implementation and the fewest durable fields.
- Do not casually add helpers, fallbacks, assertions, unsafe types, unsafe casts, or snake_case names.
- Do not copy code, skills, fonts, templates, or assets without license review.
- Use Vite Plus for formatting, linting, type checking, and unit tests; do not add parallel tools.
- Preserve user changes and report only checks actually run.
