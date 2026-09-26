# Frontend design

Pages share a 650px column with 72px top spacing. Home shows the avatar, yearly article lists, dates and visibility pills. The avatar supplies browser icons; footer links cover social and personal navigation.

Article reading/editing hides language, theme and account controls. The owner expander reveals navigation, creation and account controls; Escape closes it. Article actions sit beside titles without toolbars, statistics or TOC. Icons have labels; clipboard results use localized bottom toasts.

Shared components own controls. Editors open in Markdown source with read-only Milkdown Preview. Metadata controls measure 32px; writing areas use at least 448px or 65svh, 14px desktop/16px phone text and 1.5 line spacing. Source resizes vertically; preview tables scroll internally.

Silver, slate blue, matcha and amber support 16px/1.8 reading with Geist, Geist Mono and Lora. Diagrams fit the column and wrap labels; tables preserve first-column labels with keyboard scrolling. Code wraps with a top-right copy icon. Annotation arrows follow highlighted text. Inline emoji measure 2rem; stickers fit within 6rem. Markdown images load lazily without referrers.

Tweet cards isolate component styles from prose and use theme tokens, author headers, readable text, media and dates. Images preserve aspect ratios; videos play on demand.

Verify through the [frontend specification](../.agents/specs/frontend.md).
