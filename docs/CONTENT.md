# Content contract

Chinese is canonical; translations require its hash. Frontmatter: `title`, `summary`, `tags`. Address: `/articles/{uuid}`.

Markdown supports GFM, math, callouts, footnotes, anchors, Mermaid, Vega and Canvas. Invalid stored blocks display source.

## Dialects

Use `embed:<kind>` fences; reject invalid fields.

| Kind         | Required content                           |
| ------------ | ------------------------------------------ |
| github       | `repo: owner/name`                         |
| stock        | `code: AAPL`                               |
| link         | `url`                                      |
| article      | 1–50 same-site URLs, optional `url:`       |
| media        | `type: audio` or `video`, `src`            |
| architecture | `flowchart LR` or sanitized SVG            |
| storyboard   | `title`, repeated `step`, or sanitized SVG |
| quote        | `author`, `---`, text                      |
| diff         | `title`, `---`, unified diff               |
| annotation   | `mark`, `note`, `---`, plain text          |

Annotations require one mark occurrence; optional `color` and `url` style/link the note. `align` accepts wide, narrow, left or right within page width. GitHub/link metadata cache hourly; stock responses cache for five minutes. Failures are not cached. Article references share authorized metadata per request and identity; chapter anchors remain distinct.

## Source editing

Examples use longer outer fences or consecutively closed triple-fence wrappers. Unsupported rich-text conversions retain source mode.

Image shortcodes: [Stickers](STICKERS.md).
