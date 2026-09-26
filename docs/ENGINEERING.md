# Engineering rules

Use concise camelCase; translate foreign names at adapters. Use shared icons. Validate untrusted input once through its owning schema. Keep transport, application operations, persistence, and presentation separate. Import public module entrypoints across boundaries; prohibit circular dependencies and domain imports of platform code.

Helpers need domain meaning, stable contracts, or substantial reuse. Avoid fallbacks, assertions, unsafe casts, unconstrained types and hidden mutable state. Expected outcomes use discriminated unions; exceptional failures remain explicit. Permissions, canonical content, secrets, and publication completeness fail closed. Logs must exclude private content, credentials, emails, and search material.

Pin dependencies exactly, retain the 1,440-minute release age, and review lifecycle scripts before changing pnpm build permissions. Keep stable Drizzle 0.45; v1 needs D1/auth migration. Verify Vite Plus latest RC against the Worker. Keep strict TypeScript/platform types. Vite Plus owns formatting, linting, types, and unit tests; dependency upgrades also verify the generated Worker. `@shadcn/lint` enforces component styling contracts; shared UI components own their styles.

Write documentation in English, 100–200 words per file. Preserve contracts; keep exhaustive detail in source/tests and revise owning documents directly. Product facts belong in `docs`. Implement directly; write plans only when explicitly requested. Preserve user changes; verify work; obtain Git/deployment authorization.
