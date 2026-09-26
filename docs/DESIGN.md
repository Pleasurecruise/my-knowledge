# Frontend design

Pages share a 650px column and 72px top spacing. Home shows the avatar, yearly article lists, dates and visibility pills. The avatar supplies browser icons; the footer links Twitter, Design, GitHub and personal navigation.

Language/theme remain visible outside reading. The owner's circular expander reveals navigation, creation and account controls; Escape closes it. Article actions sit beside the title without a toolbar, statistics or TOC. Icons have accessible labels; clipboard results use localized bottom toasts.

Shared components own controls. Editors use 32px metadata controls, writing areas of at least 448px or 65svh, 14px desktop/16px phone text and 1.5 line spacing. Source resizes vertically.

Silver, slate blue, matcha and amber support 16px/1.8 reading with Geist, Geist Mono and Lora. Diagrams fit the column and wrap labels; tables preserve first-column labels with keyboard scrolling. Code wraps with a top-right copy icon. Annotation arrows follow highlighted text. Inline emoji measure 2rem; stickers fit within 6rem. Markdown images load lazily without referrers.

Tweet cards isolate component styles from prose and use theme tokens, author headers, readable text, media and dates. Images preserve aspect ratios; videos play on demand.

Verify through the [frontend specification](../.agents/specs/frontend.md).
