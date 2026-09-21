# Testing and evaluation

Tests live in package-owned `__test__` directories: pure unit rules, Worker/storage integration, REST/MCP contracts, and browser journeys. Keep fixtures and scripts beside their owning suites. Use deterministic inputs and the smallest truthful boundary; mocks do not prove deployment or successful remote cleanup.

Required checks are `pnpm check`, `pnpm test`, `pnpm build`, and `pnpm dry-run`, plus relevant contracts and browser suites. Unit coverage includes document normalization, unsafe inputs, dialect validation, unique heading/TOC parity, translations, tags, hashes, and authorization. Integration coverage proves mutation order, stale writes, cleanup, and fresh migrations.

Playwright runs the generated OpenNext Worker with local-only test bindings, freshly rebuilt disposable fixture storage, one worker and isolated anonymous/owner contexts. Owner sessions use real Better Auth signing and matching local D1 fixtures. Check phone/desktop, light/dark, reduced motion, languages, accessibility, overflow, screenshots, and unexpected console errors. Rich-block tests must verify usable geometry, not merely SVG existence.

Successful remote cleanup and Google OAuth remain account-dependent release gates. Preserve failure traces and report configured skips honestly. CI checks and dry-runs do not deploy.

The API contract journey verifies REST/MCP response parity, keyword search and versions. `KNOWLEDGE_CONTRACT_OUTPUT` optionally writes synthetic responses for Vesper consumer fixture verification; never capture credentials or production responses.
