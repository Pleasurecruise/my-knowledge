# Content contract

Chinese is canonical; translations require its hash. Frontmatter: `title`, `summary`, `tags`. `/articles/{uuid}`.

Supports GFM, math, callouts, footnotes, anchors, Mermaid, Vega and Canvas. Invalid blocks show source.

## Dialects

`embed:<kind>` fences reject invalid fields.

| Kind         | Required content                           |
| ------------ | ------------------------------------------ |
| github       | `repo: owner/name`                         |
| twitter      | `url: https://x.com/handle/status/id`      |
| stock        | `code: AAPL`                               |
| link         | `url`                                      |
| article      | 1–50 same-site URLs, optional `url:`       |
| media        | `type: audio` or `video`, `src`            |
| architecture | `flowchart LR` or sanitized SVG            |
| storyboard   | `title`, repeated `step`, or sanitized SVG |
| quote        | `author`, `---`, text                      |
| diff         | `title`, `---`, unified diff               |
| annotation   | `mark`, `note`, `---`, plain text          |

Annotations require one mark; optional `color`/`url` style/link notes. `align`: wide, narrow, left or right within page width. GitHub/link/Twitter metadata cache hourly; stocks cache five minutes. Twitter normalizes HTTPS post URLs and renders oEmbed author/text without scripts. Failures never cache. Article references deduplicate authorized metadata per request/identity, preserving chapter anchors.

## Source editing

Examples use longer outer fences or closed triple-fence wrappers. Unsupported conversions retain source mode.

Image shortcodes: [Stickers](STICKERS.md).
