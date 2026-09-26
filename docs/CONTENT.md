# Content contract

Chinese is canonical; translations require its hash. Frontmatter: `title`, `summary`, `tags`. Route: `/articles/{uuid}`. Supports GFM, math, callouts, footnotes, anchors, Mermaid, Vega and Canvas. Invalid blocks show source.

## Dialects

`embed:<kind>` validates fields. `align`: wide, narrow, left or right.

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

Twitter normalizes HTTPS X/Twitter URLs. Server-fetched `react-tweet` data supplies authors, text, media and quoted posts without widgets. Requests explicitly send JSON Accept and User-Agent headers: Workers supply no default User-Agent, which X rejects. GitHub/link/Twitter data caches hourly; stocks cache five minutes. Failures never cache. Article references deduplicate authorized metadata, preserving chapter anchors. Annotations require one mark; optional `color`/`url` style/link notes.

## Source editing

Examples use outer fences or closed triple-fence wrappers. Unsupported conversions retain source mode. Shortcodes follow [Stickers](STICKERS.md).
