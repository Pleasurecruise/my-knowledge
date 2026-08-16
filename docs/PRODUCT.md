# Product

Status: Proposed

`my-knowledge` is a personal, bilingual, long-form knowledge base. It turns useful conversation
content into a finished article without requiring the owner to rewrite, summarize, classify, tag,
translate, or compare it manually.

## Users

- The owner signs in from the public header with Google, must match the allowed email, and can read
  private and public articles.
- Anonymous readers can read public articles only.
- An authenticated MCP client acts as the owner for article operations.

## Main experience

1. Send conversation content to `createArticle`.
2. Receive one finished bilingual article or a similar-article conflict.
3. Find it through AI answers, keywords, tags, links, or the graph.
4. Update it or make it public through MCP when ready.

## Surface and access

| Surface              | Anonymous                                      | Signed-in owner                          |
| :------------------- | :--------------------------------------------- | :--------------------------------------- |
| `/`                  | Public keyword and tag search                  | AI, keyword, and tag search across all   |
| `/articles`          | Public article list and tag filters            | All articles and tag filters             |
| `/articles/[slug]`   | Public article or not found                    | Any article, with delete action          |
| `/graph`             | Bounded public graph                           | Bounded graph including private articles |
| `/api/auth/[...all]` | Google sign-in callback                        | Session operations                       |
| `/api/mcp`           | Bearer authentication required; no web session | Same Bearer contract                     |

There is no owner route and no browser create, edit, tag, link, translate, or visibility mutation.
The only browser mutation is explicit article deletion shown to the signed-in owner. It checks the
Better Auth session and `ALLOWED_EMAIL` on the server and uses the same delete operation as MCP.
Matching an email in the UI is never authorization. All other mutations use the separate MCP owner
credential described in [MCP](MCP.md).

## Minimal article

An article stores only:

- identity and slug;
- Chinese and English title, summary, and Markdown body;
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
one new leaf when no existing tag fits. Tags are changed only through MCP updates. A tag tree, counts,
list filters, and graph nodes replace a flat blog tag cloud.

## Target state

The first release is complete when:

- only the allowed email can reveal private content or delete from the web UI;
- MCP creates one polished Chinese/English article from one input without storing that input;
- a highly similar article prevents a duplicate write and returns the existing article;
- every created article is private regardless of model output or client input;
- MCP can list, read, update, delete, search, tag, link, and change article visibility;
- the web UI contains only Home, Articles, Article, and Graph surfaces, plus header authentication;
- Home supports public keyword and tag search; only the signed-in owner can use AI answers grounded in
  authorized articles;
- private articles never appear on anonymous pages, search, feeds, metadata, or graph views;
- the real OpenNext Worker builds and deploys on Cloudflare.

## Not in the first release

- Multiple owners, teams, comments, or social features
- Owner dashboard or browser editor
- Automatic publication, revisions, or stored source history
- Background jobs or editorial approval pipelines
- Unbounded tag creation or typed entity relations
