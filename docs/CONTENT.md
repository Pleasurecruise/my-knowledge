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
  editions: { zh: ArticleText; en: ArticleText } & Record<string, ArticleText>;
  tags: string[];
  visibility: Visibility;
  contentHash: string;
  createdAt: string;
  updatedAt: string;
};
```

`editions` is keyed by canonical BCP 47 language tags. `zh` and `en` are required for every generated
article; additional editions such as `ja` are optional and do not add DTO fields, routes, or database
columns. `createArticle` receives the complete locale set explicitly, so `zh`, `en`, and `ja` create a
Japanese edition without a new environment variable, DTO field, route, or schema change.
`ArticleSummary` omits every Markdown body. List, search, citation, related, and graph responses use
summaries unless the caller requests one article. Timestamps are UTC ISO strings. The slug is created
from the Chinese title, made unique once, and never changes during updates.

## Markdown

R2 stores one Markdown document per edition locale. Each begins with YAML frontmatter containing
only `title`, `summary`, and `tags` in that order. All editions have identical normalized tags and
wiki-link targets; translated link labels may differ. The body may contain CommonMark/GFM, fenced
code, math, Mermaid, Vega/Vega-Lite JSON, JSON Canvas, callouts, and `[[slug]]` or `[[slug|label]]`
links. Title and body are separate fields; normalization removes one leading level-one heading so a
client that submits `# title` cannot duplicate the Article header. Other body headings are retained.

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

`createArticle` receives conversation content and returns a locale-keyed article with required `zh`
and `en` editions. It generates Chinese first, then every requested target locale while preserving
structure, tags, wiki-link targets, code, charts, and claims. It stores neither input nor an
intermediate result.

`updateArticle` receives a complete `documents` locale map plus `expectedHash`. The map must retain
`zh` and `en`, and may add or remove other canonical locales such as `ja`. It does not accept partial
field patches, call the model, or infer a translation. Visibility changes remain a separate MCP
operation. Locale keys that collide after BCP 47 normalization are rejected rather than overwriting
one edition. This keeps the mutation surface small and prevents editions from silently diverging.

The browser editor instead accepts one source locale, title, body, and tags. Save regenerates that
edition's one-sentence summary and uses AI to synchronize the complete stored locale set before the
same canonical validation and conditional R2/D1 write. This is one coordinated mutation; a failed summary,
translation, validation, embedding, or write leaves the current version unchanged.
