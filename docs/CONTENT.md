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

`zh` is the authored, canonical edition; `en` and `ja` are optional derived translations stored after
Chinese creation or update completes. `createArticle` and the
browser editor accept only Chinese input; `createArticle` receives no locale choice, and AI
understands the source conversation in whatever language it uses and writes Simplified Chinese.
The content hash uses the Chinese edition only and identifies a version for optimistic concurrency,
cache keys, and search-index authorization; it does not identify duplicate articles. Reading an
article renders a translation only when its source hash matches the current Chinese hash, falling
back to Chinese while a translation is absent, failed, or stale. `ArticleSummary` omits every
Markdown body. List, search, related, and graph responses use summaries unless the caller requests
one article. Timestamps are UTC ISO strings. The slug is created from the Chinese title, made unique
once, and never changes during updates.

## Markdown

R2 stores canonical Chinese Markdown and any derived translation Markdown under stable article-ID
keys. Every edition
begins with YAML frontmatter containing only `title`, `summary`, and `tags` in that order, and the
translated `en`/`ja` editions carry the same (untranslated) tags as `zh`. The body may contain
CommonMark/GFM, fenced code, math, Mermaid, Vega/Vega-Lite JSON, JSON Canvas, callouts, and `[[slug]]`
or `[[slug|label]]` links, and translation preserves this structure rather than reformatting it. Title
and body are separate fields; normalization removes one leading level-one heading so a client that
submits `# title` cannot duplicate the Article header. Other body headings are retained.

Raw HTML, executable URLs, embedded scripts, and unknown structured-block formats are rejected.
HTML-like text and URL examples inside code spans or fenced code remain valid escaped code. JSON
Canvas accepts portable text nodes with explicit IDs, coordinates, dimensions, and uniquely
identified edges that reference existing nodes; incomplete spatial data is rejected before storage.
Unknown ordinary code-fence languages render as escaped code. Renderer allowlists and sanitization
are presentation rules; they never rewrite the canonical R2 source.

The server rendering pipeline follows the my-memos long-form compiler behavior while ending in React
nodes instead of serialized HTML. It decodes entities inside code nodes, maps structured fences
before highlighting, assigns stable anchors to body headings, wraps wide tables, and shares one
module-level Shiki instance. The fine-grained bundle contains JavaScript/JSX,
TypeScript/TSX, JSON, HTML, CSS, shell, YAML, Markdown, SQL, Svelte, and Vue aliases with GitHub light
and dark themes. It uses Shiki's precompiled grammars and raw JavaScript engine without the aggregate
`shiki` package. Unsupported language names remain escaped plain text without exception-driven
fallback. Mermaid, Vega, and JSON Canvas remain separate structured components behind renderer-level
no-SSR bundle boundaries and never pass through Shiki.

## Generation and update

Article creation receives conversation content in any language. The model writes one finished Chinese
article, which is validated, stored in R2, uploaded to AI Search, and recorded in D1 as public. Only
then do independent `en` and `ja` Queue messages derive translations. Creation performs no
content-hash or similarity lookup, so identical submissions may create separate articles.

`updateArticle` receives one complete Chinese `document` plus `expectedHash`. It stores and indexes
that Chinese version without waiting for translation, then queues fresh `en` and `ja` derivatives.
Visibility changes remain a separate MCP operation.

The browser editor accepts a Chinese title, body, and tags. Save regenerates the Chinese one-sentence
summary and runs the canonical R2/AI Search/D1 write for Chinese only. Translation is subsequent
derived work and cannot roll back a successful Chinese save.
