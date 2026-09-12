# Frontend design

Present a quiet personal knowledge blog through typography, open space, hairline separators, and a restrained blue accent. Use the shared cold, low-chroma light/dark tokens and native font stacks. Avoid marketing heroes, promotional cards, dashboard navigation, decorative motion, and duplicated controls. Shared primitives come from Base UI-backed shadcn; ordinary composition uses Tailwind utilities.

Home contains search only. Articles is a compact year/month/day index; New appears for the owner in Chinese. Article uses a centered 650px reading measure, desktop TOC/action rails, and compact phone actions. Graph uses a bounded wide canvas and internally scrollable relationships, without filters. The masthead exposes three destinations plus language, credential, theme, and account actions.

Language follows the registry and selects a current article translation. Code and wide tables scroll locally. Media uses native controls, wrapping captions, explicit posters or opening-frame previews, and no autoplay. Missing provider data displays an explicit status and source link.

Reduced motion disables transitions rather than introducing tiny transitions on static SVG attributes. Verify phone/desktop, themes, locale changes, keyboard access, overflow, and clean consoles. Screenshots and repeatable browser requirements belong to [frontend verification](../.agents/specs/frontend.md).
