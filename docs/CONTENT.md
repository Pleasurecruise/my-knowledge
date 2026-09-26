# Content contract

Chinese is canonical; translations require its hash. Frontmatter: `title`, `summary`, `tags`. `/articles/{uuid}` supports GFM, math, callouts, footnotes, anchors, Mermaid, Vega and Canvas; invalid blocks show source.

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

Normalize HTTPS X/Twitter URLs. `react-tweet` supplies native tweet cards. Send JSON Accept/User-Agent: X rejects Workers’ missing User-Agent. GitHub/link/Twitter data caches hourly; stocks cache five minutes. Failures never cache. Article references deduplicate authorized metadata and preserve anchors. Annotations require one mark; optional `color`/`url` style/link notes.

## Source editing

Source is authoritative. Milkdown previews CommonMark/GFM unchanged; custom fences remain code. Examples use outer/closed triple fences. Shortcodes follow [Stickers](STICKERS.md).
