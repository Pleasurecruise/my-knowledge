# Product

Status: Implemented

`my-knowledge` is a personal Chinese long-form knowledge base. A local workflow prepares finished
semantic Markdown; the application validates, stores, indexes, retrieves, edits, and publishes it.

## Users

- The owner signs in from the public header with Google, must match the allowed email, and can read
  private and public articles.
- Anonymous readers can read public articles only.
- An authenticated API or MCP client acts as the owner for article operations.

## Main experience

1. Produce one finished Chinese Markdown document locally, with optional English and Japanese editions.
2. Submit it through REST or `createArticle` and receive the stored article immediately.
3. Find it through search, tags, links, the graph, or authenticated MCP.
4. Review and edit it in the browser, then publish it from the browser or MCP when ready.

## Surface and access

The primary navigation has exactly three tabs: Home for search, Articles for the chronological index,
and Graph for relationships. Article detail is reached from Articles, search results, or Graph and is
not a fourth tab.

| Surface                 | Anonymous                                      | Signed-in owner                          |
| :---------------------- | :--------------------------------------------- | :--------------------------------------- |
| `/`                     | Public keyword and tag search                  | AI search across authorized articles     |
| `/articles`             | Public chronological list                      | Full list; New in the Chinese interface  |
| `/articles/new`         | Not found                                      | Create a public article in Chinese       |
| `/articles/[slug]`      | Public article or not found                    | Any article, with edit action            |
| `/graph`                | Bounded public graph                           | Bounded graph including private articles |
| `/rss.xml`              | RSS metadata for public articles               | Same anonymous public feed               |
| `/llms.txt`             | Markdown index of public articles              | Same anonymous public index              |
| `/api/auth/[...all]`    | Google sign-in callback                        | Session operations                       |
| `/api/articles`         | Bearer authentication required                 | Owner session or Bearer article CRUD     |
| `/api/articles/[id]`    | Bearer authentication required                 | Owner session or Bearer article CRUD     |
| `/api/settings/api-key` | Not found                                      | Inspect, generate, or regenerate API key |
| `/api/mcp`              | Bearer authentication required; no web session | Same generated Bearer contract           |

There is no owner dashboard. The allowed-email owner may create, edit, publish, withdraw, and delete
through the Article surface. Every route rechecks the Better Auth session and `ALLOWED_EMAIL`; UI
visibility is never authorization. REST and MCP share the rotatable owner credential described in
[API](API.md).

## Minimal article

An article stores only:

- identity and slug;
- one canonical Chinese Markdown document plus optional supplied English and Japanese editions;
- Obsidian-style hierarchical tags;
- private or public visibility;
- content hash and timestamps.

Explicit `[[wiki links]]` and shared tags form the knowledge graph. There are no
model-generated relation types, entities, confidence fields, workflow artifacts, or revision history
in the first release.

## Tags

Tags follow Obsidian conventions. They are case-insensitive, contain no spaces, and may use `/` for
hierarchy, such as `technology/ai-agents` or `economy/macro`. Store their first canonical spelling and
normalize comparisons.

The local workflow selects existing tags first, adds at most five tags to an article, and may propose
at most one new leaf when no existing tag fits. Tags may be corrected in the Article editor or
through MCP. Home search and Graph expose this hierarchy without adding filters to the chronological
index.

[Daily articles](CONTENT.md#domain-shape) are excluded from default lists, search and Graph. An explicit
REST/MCP tag filter includes matching daily articles, so tag counts and filtered results agree.
Visibility still governs direct reads, metadata and feeds.

## Target state

The first release is complete when:

- only the allowed email can reveal or mutate private content from the web UI;
- REST or MCP validates and stores one completed public Chinese Markdown article plus optional
  supplied English and Japanese editions without hosted generation;
- each valid submission creates a new article without a pre-save duplicate lookup;
- every created article is public after canonical Chinese storage succeeds; the owner may explicitly
  withdraw it afterward;
- MCP can list, read, update, delete, search, tag, link, and change article visibility;
- REST can list, create, read, update, delete, and change article visibility with owner authorization;
- the web UI contains exactly three primary tabs—Home, Articles, and Graph—plus Article detail and
  header language, theme, and authentication actions;
- Home uses D1 keyword/tag search for anonymous readers; only the allowed-email owner uses
  AI Search, with every result re-authorized through D1;
- browser saves require the owner to provide the one-sentence Chinese summary;
- private articles never appear on anonymous pages, search, feeds, metadata, or graph views;
- public articles expose canonical article metadata, dynamic social images, and sitemap entries
  through Next.js metadata routes; private articles expose none of them;
- the real OpenNext Worker builds and deploys on Cloudflare.

## Not in the first release

- Multiple owners, teams, comments, or social features
- Owner dashboard
- Automatic publication, revisions, or stored source history
- Editorial approval pipelines
- Unbounded tag creation or typed entity relations
