# Frontend design

Use Rana’s silver-white/ink surfaces, slate-blue actions, amber metadata and matcha accents. Preserve the icon, fine borders and restrained radii.

Bundle Geist, Geist Mono and Lora with licenses. Interface text is 14px; supporting text is 13px. Chinese uses system sans, English uses Lora. Reading text is 15px with 1.7 line height. Reading width is 650px within a 1120px shell. Title blocks have no separator.

Home lists chronological articles. Explore combines search and Graph through compact icon controls. Reading hides the masthead and inherits language/theme settings. Return and owner edit actions share the title row and align vertically. Return follows the tab’s bounded reading trail, survives reloads and excludes creation editors.

Article rows pair document thumbnails with resolved titles and descriptions. Backlinks focus and scroll to the first source reference, including deferred cards. Alignment follows [Content](CONTENT.md). Editors offer rich/source modes and stage visibility in a component select until Save. Keep focus visible, respect reduced motion and hide scrollbars.

Error pages share reading width, calm spacing and clear recovery actions. Social covers use public metadata. Header controls follow language, API key, theme, account order. Authentication failures show transient messages; mutation failures remain retryable. Verify responsive states through the [frontend specification](../.agents/specs/frontend.md).
