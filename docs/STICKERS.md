# Sticker catalog

The owner selected four Telegram packs. Public mirror snapshots provide:

| Key          | Pack              | Images | Source                                                        |
| ------------ | ----------------- | ------ | ------------------------------------------------------------- |
| `suzume5`    | SuzumeS5          | 30     | [Fullyst](https://fullyst.com/en/stickers/SuzumeS5)           |
| `baishengnv` | 白圣女            | 117    | [Stickers.wiki](https://stickers.wiki/telegram/baishengnv/)   |
| `denghuoju8` | 灯火橘8           | 16     | [Combot](https://combot.org/stickers/in_AJEJDC_by_NaiDrawBot) |
| `daimao2`    | 呆猫八条集合包 #2 | 20     | [Combot](https://combot.org/stickers/daimaoextended2)         |

Combot snapshots date to July 2024 and July 2026 respectively; they may omit newer Telegram
stickers. The catalog references remote WebP images. No artwork files were copied or license grant
verified; rights and availability remain with authors/providers. Never renumber published names.

Write `:denghuoju8_01:` or `:daimao2_01:`. Unknown shortcodes remain literal.
`packages/content/src/emoji-packs.json` matches Vesper's `crates/md-dialect/src/emoji-packs.json`.
Packs contain `key` (ASCII alphanumeric), `name`, `display` (`emoji` or `sticker`), and `items`
(`name`, HTTPS `value`). Item names exclude whitespace/colons. Duplicate shortcodes and URLs
containing credentials are invalid. Matching is case-sensitive; code, math, links, image alt text
and generated embeds stay unchanged. Compilation never reads images or requires Telegram credentials.
