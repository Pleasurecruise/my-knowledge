# Product

Status: Implemented locally; production release awaits owner-controlled configuration

`my-knowledge` is a personal Chinese long-form knowledge base. It lets AI understand useful
conversation content in any language and turn it into a finished Chinese article without requiring
the owner to rewrite, summarize, classify, tag, or compare it manually.

## Users

- The owner signs in from the public header with Google, must match the allowed email, and can read
  private and public articles.
- Anonymous readers can read public articles only.
- An authenticated MCP client acts as the owner for article operations.

## Main experience

1. Send conversation content to `createArticle`.
2. Receive a job ID and poll `getArticleJob` for one finished Chinese article or a similar-article
   conflict.
3. Find it through keywords, tags, links, the graph, or authenticated MCP search.
4. Review and edit it in the browser, then publish it from the browser or MCP when ready.

## Surface and access

The primary navigation has exactly three tabs: Home for search, Articles for the chronological index,
and Graph for relationships. Article detail is reached from Articles, search results, or Graph and is
not a fourth tab.

| Surface              | Anonymous                                      | Signed-in owner                          |
| :------------------- | :--------------------------------------------- | :--------------------------------------- |
| `/`                  | Public keyword and tag search                  | Keyword and tag search across all        |
| `/articles`          | Public chronological list                      | Full list; New in the Chinese interface  |
| `/articles/new`      | Not found                                      | Create a private article in Chinese      |
| `/articles/[slug]`   | Public article or not found                    | Any article, with edit action            |
| `/graph`             | Bounded public graph                           | Bounded graph including private articles |
| `/api/auth/[...all]` | Google sign-in callback                        | Session operations                       |
| `/api/mcp`           | Bearer authentication required; no web session | Same Bearer contract                     |

There is no owner dashboard. The allowed-email owner may create, edit, publish, withdraw, and delete
through the Article surface. Every route rechecks the Better Auth session and `ALLOWED_EMAIL`; UI
visibility is never authorization. MCP retains the separate owner credential described in
[MCP](MCP.md).

## Minimal article

An article stores only:

- identity and slug;
- one canonical Chinese Markdown document;
- Obsidian-style hierarchical tags;
- private or public visibility;
- content hash and timestamps.

Explicit `[[wiki links]]`, shared tags, and Vectorize neighbors form the knowledge graph. There are no
model-generated relation types, entities, confidence fields, workflow artifacts, or revision history
in the first release.

## Tags

Tags follow Obsidian conventions. They are case-insensitive, contain no spaces, and may use `/` for
hierarchy, such as `technology/ai-agents` or `economy/macro`. Store their first canonical spelling and
normalize comparisons.

Generation selects existing tags first, adds at most five tags to an article, and may propose at most
one new leaf when no existing tag fits. Tags may be corrected in the Article editor or through MCP.
Home search and Graph expose this hierarchy without adding filters to the chronological index.

## Target state

The first release is complete when:

- only the allowed email can reveal or mutate private content from the web UI;
- MCP creates one polished Chinese article from one temporarily held input, then deletes that input;
- a highly similar article prevents a duplicate write and returns the existing article;
- every created article is private regardless of model output or client input;
- MCP can list, read, update, delete, search, tag, link, and change article visibility;
- the web UI contains exactly three primary tabs—Home, Articles, and Graph—plus Article detail and
  header language, theme, and authentication actions;
- Home supports keyword and tag search over the caller's authorized articles;
- browser saves regenerate the one-sentence Chinese summary before replacing an article version;
- private articles never appear on anonymous pages, search, feeds, metadata, or graph views;
- public articles expose canonical article metadata, dynamic social images, and sitemap entries
  through Next.js metadata routes; private articles expose none of them;
- the real OpenNext Worker builds and deploys on Cloudflare.

## Not in the first release

- Multiple owners, teams, comments, or social features
- Owner dashboard
- Automatic publication, revisions, or stored source history
- Editorial approval pipelines or background jobs beyond MCP article creation
- Unbounded tag creation or typed entity relations
