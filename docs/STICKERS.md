# Sticker catalog

The preferred green-cat pack is `suzume`: 16 named 300×300 images from
[Suzume’s public collection](https://szm.de5.net/posts/suzume5/). Its contact sheet is excluded.
Use `:suzume_思考:` or `:suzume_期待:`. Display preserves aspect ratio within 6rem.
Existing `suzume5` (30 Fullyst references) and `baishengnv` (117 Stickers.wiki references)
retain their published names. Never reuse names for different artwork.

The owner requested removal of the compressed 128px Combot packs `daimao2` and `denghuoju8`.
Migrate article shortcodes before deploying their removal; unknown shortcodes remain literal.
The catalog references remote images, without bundling artwork or implying a license grant.
Rights and availability remain with authors/providers.

`packages/content/src/emoji-packs.json` matches Vesper's `crates/md-dialect/src/emoji-packs.json`.
Packs contain `key` (ASCII alphanumeric), `name`, `display` (`emoji` or `sticker`), and `items`
(`name`, HTTPS `value`). Item names exclude whitespace/colons. Duplicate shortcodes and URLs
containing credentials are invalid. Matching is case-sensitive; code, math, links, image alt text
and generated embeds stay unchanged. Compilation never downloads images or requires Telegram credentials.
