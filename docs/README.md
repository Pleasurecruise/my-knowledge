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

Each file contains 100–200 English words and preserves its essential contract. Exact schemas, exhaustive examples, configuration values, and executable commands remain in their owning source, tests, or manifests.

Rewrite the owning document when behavior changes; merge repetition and remove obsolete statements. Do not append implementation diaries or patch sections. Implement directly; write plans only when explicitly requested. Temporary evidence belongs in `.agents`; remove it after acceptance or on user request.
