# Content contract

Status: Implemented contract

This document owns the portable article format shared by MCP, storage, search, and rendering. Database
columns and cross-store order remain in [Database](DATABASE.md).

## Domain shape

```ts
type Visibility = "private" | "public";

type ArticleText = {
  title: string;
  summary: string;
  markdown: string;
};

type Article = {
  id: string;
  slug: string;
  editions: { zh: ArticleText } & Record<string, ArticleText>;
  tags: string[];
  visibility: Visibility;
  contentHash: string;
  createdAt: string;
  updatedAt: string;
};
```

`zh` is the authored, canonical edition; `en` and `ja` are optional supplied translations. REST may
submit all three together, while MCP and the browser editor accept Chinese input.
The content hash uses the Chinese edition only and identifies a version for optimistic concurrency,
cache keys, and search-index authorization; it does not identify duplicate articles. Reading an
article renders a translation only when its source hash matches the current Chinese hash, falling
back to Chinese while a translation is absent, failed, or stale. `ArticleSummary` omits every
Markdown body. List, search, related, and graph responses use summaries unless the caller requests
one article. Timestamps are UTC ISO strings. The slug is created from the Chinese title, made unique
once, and never changes during updates.

A tag equal to `daily` or beginning with `daily/`, ignoring case, classifies an article as daily.
This uses existing tags rather than an additional article type field; `daily-notes` is not a match.

## Markdown

R2 stores canonical Chinese Markdown and any supplied translation Markdown under stable article-ID
keys. Every edition
begins with YAML frontmatter containing only `title`, `summary`, and `tags` in that order, and the
translated `en`/`ja` editions carry the same (untranslated) tags as `zh`. The body may contain
CommonMark/GFM, fenced code, math, Mermaid, Vega/Vega-Lite JSON, JSON Canvas, callouts, and `[[slug]]`
or `[[slug|label]]` links, and translation preserves this structure rather than reformatting it. Title
and body are separate fields; normalization removes one leading level-one heading so a client that
submits `# title` cannot duplicate the Article header. Other body headings and leading code indentation are retained.

Raw HTML, executable URLs, embedded scripts, and unknown structured-block formats are rejected.
HTML-like text and URL examples inside code spans or fenced code remain valid escaped code. JSON
Canvas accepts portable text nodes with explicit IDs, coordinates, dimensions, and uniquely
identified edges that reference existing nodes; incomplete spatial data is rejected before storage.
Unknown ordinary code-fence languages render as escaped code. Renderer allowlists and sanitization
are presentation rules; they never rewrite the canonical R2 source.

The dialect follows my-workspace's syntax, implemented in TypeScript and React:

| Fence                | Body                                                                           | Rendering                      |
| :------------------- | :----------------------------------------------------------------------------- | :----------------------------- |
| `embed:link`         | `url: https://example.com/article`                                             | Open Graph metadata card       |
| `embed:github`       | `repo: owner/name`                                                             | Repository metadata card       |
| `embed:stock`        | `code: AAPL`                                                                   | Monthly closing-price chart    |
| `embed:architecture` | `flowchart LR` and one `node --> node` edge per line, with optional `[labels]` | Static architecture SVG        |
| `embed:storyboard`   | `title:` and two to six `step: heading \| description` lines                   | Static hand-drawn sequence SVG |

Embeds accept `align: left|right|wide`, defaulting to `wide`. Architecture and storyboard also accept
one SVG document with `viewBox`, `title`, and `desc`; optional alignment precedes the SVG or diagram.
Their distinct class profiles use application theme tokens. Sanitization permits static shapes and
text while removing scripts, external references, and styles. Unknown kinds, duplicate or unsupported
fields, and incomplete blocks fail validation.

Repository and stock cards read public GitHub REST and Yahoo Finance chart data in the Worker.
`embed:link` reads server-provided HTML for the first `og:title`, `og:description`, `og:site_name`,
and `og:image`. Missing text uses the page title, standard description, or hostname; images are
optional and relative image URLs resolve against the final page URL. `og:url` does not replace the
card destination. Metadata becomes text nodes, never executable markup.

All card reads are credential-free, bounded to six seconds and 512 KiB, and run at most four
concurrently per article. Link cards accept HTTP(S) hostnames on standard ports and at most five
validated redirects; IP literals and local hostnames are rejected. They use the Worker's public
fetch boundary, without private-network bindings or incoming request headers. Repository and stock
reads reject redirects. Provider failures display an explicit status and source link.
Stock charts show one month of daily closes and the change from the preceding close.
Ordinary Markdown links do not fetch metadata; enrichment never changes stored Markdown.

The server compiler produces React nodes, stable heading anchors, and scrollable tables. Article
relationships and the table of contents use Markdown nodes: code examples create neither links nor
headings, Setext headings are supported, and existing links are not wrapped in wiki-link anchors.
Ordinary code entities are decoded; structured fence source is preserved verbatim.

One shared Shiki instance highlights backtick and tilde fences, including nested fences, with GitHub
light/dark themes. Its precompiled JavaScript-engine bundle supports JavaScript/JSX, TypeScript/TSX,
JSON, HTML, CSS, shell, YAML, Markdown, SQL, Svelte, and Vue aliases. Other languages remain escaped
plain text. Structured blocks bypass Shiki; Mermaid, Vega, and JSON Canvas use separate renderer-level
no-SSR boundaries.

## Ingestion and update

REST creation receives completed semantic Markdown from a local workflow. It requires Chinese and
may include English and Japanese, validates cross-edition tags and wiki-link targets, stores Chinese
in R2, and records the public D1 row using the write order in [Database](DATABASE.md#writes). Supplied
translations are then stored in R2 with source-hash metadata. Creation performs no content-hash or similarity lookup, so
identical submissions may create separate articles.

MCP create and update receive one complete Chinese `document`; REST update may submit all supported
editions with `expectedHash`. A Chinese update immediately makes older translation metadata stale.
Visibility changes remain separate operations.

The browser editor accepts a Chinese title, one-sentence summary, body, and tags. Save serializes that
input into the same canonical Markdown and performs no model call.
