# Documentation

Read the document that owns the question:

| Document                        | Core contract                                                |
| ------------------------------- | ------------------------------------------------------------ |
| [Product](PRODUCT.md)           | Surfaces, access, publication, release scope                 |
| [Architecture](ARCHITECTURE.md) | Workspaces, runtime, dependency and authorization boundaries |
| [Content](CONTENT.md)           | Editions, Markdown dialect, media, rendering semantics       |
| [Database](DATABASE.md)         | Persistence authority, concurrency, write and cleanup order  |
| [Workflows](WORKFLOWS.md)       | Ingestion, authoring, discovery, failure behavior            |
| [Design](DESIGN.md)             | Page composition, shared tokens, accessibility               |
| [Engineering](ENGINEERING.md)   | Code, dependencies, naming, documentation rules              |
| [Testing](TESTING.md)           | Test boundaries, fixtures, evidence, release gates           |
| [API](API.md)                   | REST resources and credential lifecycle                      |
| [MCP](MCP.md)                   | Transport, tools, protocol                                   |
| [Deployment](DEPLOYMENT.md)     | Configuration, credentials, release and recovery             |
| [References](REFERENCES.md)     | Inspiration and licensing boundaries                         |

[Engineering](ENGINEERING.md) owns documentation and change rules; [Testing](TESTING.md) owns verification requirements. Keep product contracts here and temporary evidence in `.agents`.

Exact schemas, examples and configuration stay with their source, tests or manifests. Update the owning document when behavior changes, removing obsolete or repeated material.
