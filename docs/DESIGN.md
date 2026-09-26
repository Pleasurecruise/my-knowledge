# Frontend design

Pages share a 650px column and 72px top spacing. Home shows the avatar, yearly article lists, dates and visibility pills. The avatar supplies browser icons. The bottom footer links Twitter, Design, GitHub and personal navigation.

Language/theme remain visible outside reading. The owner's circular expander reveals navigation, creation and account controls; Escape closes it. Reading places return, share and owner edit actions beside the title, without toolbar, statistics or TOC. Icons have accessible labels; clipboard results use bottom toasts.

Shared components own control styles. Editors use 32px metadata controls, writing areas of at least 448px or 65svh, 14px desktop/16px phone text and 1.5 line spacing. Source resizes vertically.

Silver, slate blue, matcha and amber support 16px/1.8 reading and social images. Fonts bundle Geist, Geist Mono and Lora. Diagrams fit the column; architecture wraps labels, grows node heights, and uses columns or paired rows based on the diagram container width. Code wraps; a top-right copy icon copies source with localized toasts. Tables retain first-column labels and allow keyboard-accessible horizontal scrolling. Annotation arrows follow highlighted text.

Shortcode images align inline: emoji are 2rem squares; stickers preserve aspect ratio within 6rem. Images load lazily without referrers.

Verify through the [frontend specification](../.agents/specs/frontend.md).
