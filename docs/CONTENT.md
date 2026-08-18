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

`zh` is the authored, canonical edition; `en` and `ja` are translations that every creation and
update produces alongside it, so a current record always carries all three. `createArticle` and the
browser editor accept only Chinese input; `createArticle` receives no locale choice, and AI
understands the source conversation in whatever language it uses and writes Simplified Chinese.
Hashing, embedding, and duplicate comparison use the Chinese edition only. Reading an article renders
whichever edition matches the caller's locale, falling back to Chinese when one is missing — possible
only for content saved before a locale existed. `ArticleSummary` omits every Markdown body. List,
search, related, and graph responses use summaries unless the caller requests one article. Timestamps
are UTC ISO strings. The slug is created from the Chinese title, made unique once, and never changes
during updates.

## Markdown

R2 stores three Markdown documents, one at each of the `zh`, `en`, and `ja` object keys. Every edition
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

Article creation receives conversation content in any language. The model first writes one finished
Chinese article; a separate translation step then produces the `en` and `ja` title, summary, and body
from that Chinese result. All three editions are validated and stored together. It stores neither the
submitted input nor an intermediate result.

`updateArticle` receives one complete Chinese `document` plus `expectedHash`. It does not accept
partial field patches or call the writing model, but it does run the same translation step to refresh
`en` and `ja` from the new Chinese document before storing all three. Visibility changes remain a
separate MCP operation.

The browser editor accepts a Chinese title, body, and tags. Save regenerates the Chinese one-sentence
summary, translates the result into `en` and `ja`, then runs the same canonical validation and
conditional R2/D1 write for all three editions. This is one coordinated mutation; a failed summary,
translation, validation, embedding, or write leaves the current version unchanged.
