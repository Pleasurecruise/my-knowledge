# Content contract

Status: Proposed implementation contract

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
  zh: ArticleText;
  en: ArticleText;
  tags: string[];
  visibility: Visibility;
  contentHash: string;
  createdAt: string;
  updatedAt: string;
};
```

`ArticleSummary` omits both Markdown bodies. List, search, citation, related, and graph responses use
summaries unless the caller requests one article. Timestamps are UTC ISO strings. The slug is created
from the Chinese title, made unique once, and never changes during updates.

## Markdown

R2 stores one Chinese and one English Markdown document. Each begins with YAML frontmatter containing
only `title`, `summary`, and `tags` in that order. Both documents have identical normalized tags and
wiki-link targets; translated link labels may differ. The body may contain CommonMark/GFM, fenced
code, math, Mermaid, Vega/Vega-Lite JSON, JSON Canvas, callouts, and `[[slug]]` or `[[slug|label]]`
links.

Raw HTML, executable URLs, embedded scripts, and unknown structured-block formats are rejected.
Unknown ordinary code-fence languages render as escaped code. Renderer allowlists and sanitization are
presentation rules; they never rewrite the canonical R2 source.

## Generation and update

`createArticle` receives conversation content but returns this finished bilingual shape. It generates
the Chinese document first, then translates it while preserving structure, tags, wiki-link targets,
code, charts, and claims. It stores neither input nor an intermediate result.

`updateArticle` receives complete Chinese and English Markdown documents plus `expectedHash`. It does
not accept partial field patches, call the model, or infer a translation. Visibility changes remain a
separate MCP operation. This keeps the mutation surface small and prevents one representation from
silently diverging from the other.
