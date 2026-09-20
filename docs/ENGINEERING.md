# Engineering rules

Use concise camelCase domain names; translate foreign naming at adapters. Use shared library icons. Validate untrusted input once through its owning schema. Keep transport, application operations, persistence, and presentation separate. Import public module entrypoints across boundaries; prohibit circular dependencies and domain imports of platform code.

Add helpers only for meaningful domain operations, stable contracts, or repeated substantial logic. Avoid fallbacks, assertions, unsafe casts, unconstrained types and hidden mutable state. Expected outcomes use discriminated unions; exceptional failures remain explicit. Permissions, canonical content, secrets, and publication completeness fail closed. Logs must exclude private content, credentials, emails, and search material.

Pin dependencies exactly, retain the 1,440-minute release age, and review lifecycle scripts before changing pnpm build permissions. Keep strict TypeScript and generated platform types. Vite Plus exclusively owns formatting, linting, type checking, and unit tests; dependency upgrades also verify the generated Worker. `@shadcn/lint` enforces component styling contracts; shared UI components own their styles.

Write documentation in English, 100–200 words per file. Preserve contracts; keep exhaustive detail in source/tests and revise owning documents directly. Product facts belong in `docs`. Implement directly; write plans only when explicitly requested. Preserve user changes, run relevant checks, and obtain Git/deployment authorization separately.
