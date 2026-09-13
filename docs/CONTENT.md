# Content contract

Chinese is canonical; translations require its hash. Frontmatter supplies `title`, `summary`, `tags`. `/articles/{uuid}` addresses preserve legacy aliases. Cards and graph references authorize either identity; cards link to UUIDs.

Markdown supports GFM, math, callouts, wiki links, footnotes, anchors, Mermaid, Vega and Canvas. Submission rejects unsafe/malformed content. Stored invalid blocks display source.

## Dialects

Use `embed:<kind>` fences. Reject unknown, duplicate or empty fields.

| Kind         | Required content                                |
| ------------ | ----------------------------------------------- |
| github       | `repo: owner/name`                              |
| stock        | `code: AAPL`                                    |
| link         | `url`                                           |
| article      | 1–50 same-site URLs, optionally prefixed `url:` |
| media        | `type: audio` or `video`, `src`                 |
| architecture | `flowchart LR` or sanitized SVG                 |
| storyboard   | `title`, repeated `step`, or sanitized SVG      |
| quote        | `author`, `---`, text                           |
| diff         | `title`, `---`, unified diff                    |
| annotation   | `mark`, `note`, `---`, plain text               |

Annotations require one mark occurrence; optional `color` and `url` style/link the note. `align` accepts wide, narrow, left or right within the page width. Public GitHub metadata caches for one hour.

## Source editing

Examples use longer outer fences. Consecutively closed triple-fence wrappers also work. Rich text exports safe fences; unsupported conversions retain source mode.
