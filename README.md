# my-knowledge

A private-first, bilingual knowledge publication built from valuable AI conversations.

Send useful conversation content through MCP. The application turns it into polished Markdown,
creates a summary and a small set of nested tags, translates it, checks for similar knowledge, and
stores only the finished article. Every article starts private and becomes public only through MCP.

## Status

The product specification, workspace manifests, and dependency lock are ready. Application source,
Cloudflare configuration, migrations, generated skill registry, and tests are not implemented yet;
the repository cannot currently build or deploy.

## Stack

- pnpm monorepo with Next.js 16.3+, TypeScript 7, and small shared packages
- Vite Plus as the repository formatter, linter, type checker, and unit-test runner
- Cloudflare Workers through OpenNext
- D1 metadata, R2 Markdown, KV cache, and Vectorize similarity search
- OpenCode Go custom provider through Cloudflare AI Gateway
- Better Auth, Google OAuth, and one allowed owner email
- Markdown-first publication inspired by docu.md

## Documentation

Start with [the documentation index](docs/README.md), then read:

- [Product](docs/PRODUCT.md)
- [Architecture](docs/ARCHITECTURE.md)
- [Content contract](docs/CONTENT.md)
- [Database](docs/DATABASE.md)
- [Simple content flow](docs/WORKFLOWS.md)
- [Skill loading](docs/SKILLS.md)
- [Design system](docs/DESIGN.md)
- [Engineering rules](docs/ENGINEERING.md)
- [Testing and evaluation](docs/TESTING.md)

External projects and reuse rules are listed in [References](docs/REFERENCES.md).

## Reference projects

- [Obsidian Help](https://github.com/obsidianmd/obsidian-help)
- [my-memos](https://github.com/Pleasurecruise/my-memos)
- [docu.md](https://docu.md/)
- [markdown-viewer/skills](https://github.com/markdown-viewer/skills)
- [tw93/Waza](https://github.com/tw93/Waza)
- [tw93/Kami](https://github.com/tw93/Kami)

## License

Apache-2.0. See [LICENSE](LICENSE).
