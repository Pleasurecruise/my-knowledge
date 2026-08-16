# Project instructions

The repository follows a plan, implement, verify, and archive loop. Product facts belong in `docs/`;
temporary execution state belongs in `.agents/`.

## Core workflow

### 1. Plan

Before a non-trivial repository change, read `.agents/PLANS.md`. If no active plan covers the task,
create `.agents/plans/<task>.md` and add it to the top of the index before implementation.

A plan contains the objective, acceptance criteria, expected files, relationship to
`.agents/POLARIS.md`, ordered steps, and required evidence. Update it before intentionally changing
scope. Small explanations, read-only inspection, and isolated typo or formatting corrections do not
need a plan.

After every acceptance criterion passes, remove the plan and its index entry. Durable decisions move
to the owning document; Git history records the completed change. Do not commit unless the user has
authorized the Git workflow.

### 2. Implement and document

Read only the documents that own the affected behavior:

- [Product](docs/PRODUCT.md): routes, permissions, and release scope
- [Architecture](docs/ARCHITECTURE.md): workspaces, runtime, auth, providers, and storage boundaries
- [Content](docs/CONTENT.md): article types, Markdown, tags, and links
- [Database](docs/DATABASE.md): schema, persistence order, and migrations
- [Workflows](docs/WORKFLOWS.md): generation, retrieval, and mutations
- [Skills](docs/SKILLS.md): model instructions and runtime skill loading
- [Design](docs/DESIGN.md): frontend system and page composition
- [Engineering](docs/ENGINEERING.md): code, naming, dependency, and error rules
- [Testing](docs/TESTING.md): fixtures, test boundaries, evaluation, and release evidence
- [Deployment](docs/DEPLOYMENT.md): Cloudflare configuration and release procedure

Update the owning document when behavior changes. Documentation is durable but not append-only:
revise, merge, or delete obsolete material so the current state remains truthful. Avoid duplicate
facts and split a document only when its scope becomes hard to navigate.

### 3. Verify feedback-sensitive work

Read and follow the matching specification before implementation:

| Change type                 | Specification                       | Required evidence                         |
| :-------------------------- | :---------------------------------- | :---------------------------------------- |
| Frontend or visual          | `.agents/specs/frontend.md`         | Real browser, screenshots, clean console  |
| Performance                 | `.agents/specs/performance.md`      | Comparable before/after measurements      |
| Model, prompt, or retrieval | `.agents/specs/model-evaluation.md` | Frozen corpus and baseline/candidate data |

Add a specification only when another repeatable feedback loop genuinely needs distinct evidence.

### 4. Check the product north star

Every plan states which outcome in `.agents/POLARIS.md` it supports. If a proposed change serves none,
remove it from scope or ask before proceeding. Stop and report when evidence shows a hard invariant
regressed.

## Automatic goal or loop execution

1. Register the plan, select applicable specifications, and state the north-star relationship.
2. Complete one bounded step, run its smallest truthful check, and update the plan.
3. Pause for user direction when the goal has materially different interpretations, scope must expand,
   a hard invariant may regress, or completion needs an account, secret, payment, or policy decision.
4. After the same acceptance criterion fails three times for the same reason, report the evidence and
   blocker instead of retrying indefinitely.
5. Archive the plan only after all required evidence exists.

## Product invariants

- This is one personal application, not a distributed platform.
- R2 owns Markdown; D1 indexes metadata and visibility; KV and Vectorize are derived.
- Submitted conversations, AI search questions, retrieved context, and generated answers are not
  stored.
- Every generated article starts private. Visibility changes use MCP only.
- The web has Home, Articles, Article, and Graph only; its sole mutation is authenticated deletion.
- Anonymous users receive keyword/tag search only. AI search requires the allowed-email session.
- Content skills produce semantic Markdown; the Next.js frontend owns presentation.
- Project names are concise camelCase. Foreign naming stops at adapters.

## Engineering guardrails

- Prefer the smallest complete implementation and the fewest durable fields.
- Do not casually add helpers, fallbacks, assertions, unsafe types, unsafe casts, or snake_case names.
- Do not copy code, skills, fonts, templates, or assets without license review.
- Use Vite Plus for formatting, linting, type checking, and unit tests; do not add parallel tools.
- Preserve user changes and report only checks actually run.
