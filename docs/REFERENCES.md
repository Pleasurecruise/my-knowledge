# References

These sources inform the project but are not automatically runtime dependencies:

- [Obsidian Help](https://github.com/obsidianmd/obsidian-help): primary reference for portable
  Markdown, properties, nested tags, internal links, backlinks, and graph-based knowledge discovery;
- [my-memos](https://github.com/Pleasurecruise/my-memos): source reference for the Notes index,
  reading rails, heading hierarchy, and editor interaction, as well as the pnpm/Cloudflare shape,
  single-owner auth, rotatable API credential, REST boundaries, and stateless MCP;
- `my-profile` (owner-local repository): composition reference for the centered article axis, compact
  header, table of contents, and reading controls; no source, font, or third-party asset is copied;
- [docu.md](https://docu.md/): Markdown-first rich content and replaceable presentation;
- [markdown-viewer/skills](https://github.com/markdown-viewer/skills): pinned Vega/Canvas design
  reference that is not bundled because its license file is missing;
- [tw93/Kami](https://github.com/tw93/Kami): restrained composition, language typography,
  preflight, and visual QA;
- [tw93/Waza](https://github.com/tw93/Waza): pinned production `write` skill;
- [MCP specification](https://github.com/modelcontextprotocol/modelcontextprotocol): protocol
  transport and schemas;
- [OpenNext Cloudflare](https://github.com/opennextjs/opennextjs-cloudflare): Next.js Workers
  integration;
- [Cloudflare Workers SDK](https://github.com/cloudflare/workers-sdk): Wrangler, local runtime,
  bindings, types, migrations, and deployment;
- [Cloudflare Agent Development Lifecycle](https://blog.cloudflare.com/agent-development-lifecycle/):
  programmatic, reproducible, atomic, permissioned, observable, and reversible delivery principles;
- [Cloudflare Sandbox SDK](https://developers.cloudflare.com/sandbox/): optional isolated CI
  experiment, not an application dependency;
- [Cloudflare Browser Run](https://developers.cloudflare.com/browser-run/): optional remote browser
  and visual verification after local Playwright coverage;
- [Vite Plus](https://viteplus.dev/): unified formatting, linting, type checking, and unit tests;
  Next.js and OpenNext still own application and Worker builds.

## Reuse policy

Before building a renderer, parser, auth layer, graph, AI adapter, or Cloudflare integration from
scratch:

1. inspect current official documentation and source;
2. verify Workers and OpenNext compatibility;
3. review license, maintenance, dependencies, security, and escape paths;
4. prototype the closest real entrypoint;
5. adopt the smallest useful surface;
6. record hard-to-replace dependencies or durable formats in the owning document.

Do not copy code, skill text, templates, fonts, or assets without explicit license review.

## Product inheritance boundary

Obsidian defines how knowledge behaves: Markdown remains portable, properties stay visible, tags are
hierarchical, links are explicit, backlinks are derived, and the graph is a navigation aid. The web
application reimplements those ideas for a private-first cloud library; it does not embed Obsidian or
copy its desktop vault architecture.

`my-memos` defines the browser Notes composition and editor. This project keeps its Article routes,
AI synchronization, Obsidian knowledge model, and D1/R2/KV/AI Search boundaries. Its AGPL-3.0 license
has been reviewed for the requested reuse; third-party-derived fragments and assets still require
their own compatibility review.
