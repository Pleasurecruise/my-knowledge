# Frontend design

Use Rana’s silver-white/ink surfaces, slate-blue actions, amber metadata, matcha accents, fine borders and restrained radii. Preserve the icon; show focus, respect reduced motion and hide scrollbars.

Bundle Geist, Geist Mono and Lora with licenses. Interface/supporting text is 14px/13px. Chinese uses system sans, English uses Lora. Reading text uses 15px/1.7. Reading width is 650px within a 1120px shell. Title blocks have no separator.

Home lists chronological articles. Explore combines search and Graph through compact icon controls. Reading hides the masthead and inherits language/theme settings. Return and owner edit actions share the title row and align vertically. Return follows the tab’s bounded reading trail, survives reloads and excludes creation editors.

Article rows pair document thumbnails with resolved titles and descriptions. Backlinks focus and scroll to the first source reference, including deferred cards. Alignment follows [Content](CONTENT.md). Editors offer rich/source modes and stage visibility in a component select until Save. Quotes preserve original text; diffs retain plus/minus markers and keyboard scrolling.

Error pages share reading width, calm spacing and recovery actions. Social covers use public metadata. Header controls follow language, API key, theme, account order. Authentication failures show transient messages; mutation failures remain retryable. Verify responsive states through the [frontend specification](../.agents/specs/frontend.md).
