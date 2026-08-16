# References

These sources inform the project but are not automatically runtime dependencies:

- [Obsidian Help](https://github.com/obsidianmd/obsidian-help): primary reference for portable
  Markdown, properties, nested tags, internal links, backlinks, and graph-based knowledge discovery;
- [my-memos](https://github.com/Pleasurecruise/my-memos): implementation reference only for the
  pnpm/Cloudflare project shape, D1/R2/KV boundaries, single-owner auth, stateless MCP, and the current
  `custom-opencode` AI Gateway adapter;
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

`my-memos` defines only useful implementation constraints for a small personal Cloudflare product. It
does not define the article schema, classification model, editor, routes, workflow, or visual design.
When the references disagree, this project's long-form knowledge contract wins.
