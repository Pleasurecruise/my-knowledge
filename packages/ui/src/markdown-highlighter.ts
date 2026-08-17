import { createHighlighterCore } from "@shikijs/core";
import { createJavaScriptRawEngine } from "@shikijs/engine-javascript";

import css from "@shikijs/langs-precompiled/css";
import html from "@shikijs/langs-precompiled/html";
import javascript from "@shikijs/langs-precompiled/javascript";
import json from "@shikijs/langs-precompiled/json";
import jsx from "@shikijs/langs-precompiled/jsx";
import markdown from "@shikijs/langs-precompiled/markdown";
import shellscript from "@shikijs/langs-precompiled/shellscript";
import sql from "@shikijs/langs-precompiled/sql";
import svelte from "@shikijs/langs-precompiled/svelte";
import tsx from "@shikijs/langs-precompiled/tsx";
import typescript from "@shikijs/langs-precompiled/typescript";
import vue from "@shikijs/langs-precompiled/vue";
import yaml from "@shikijs/langs-precompiled/yaml";
import githubDark from "@shikijs/themes/github-dark";
import githubLight from "@shikijs/themes/github-light";

export const markdownHighlighter = createHighlighterCore({
  langs: [
    css,
    html,
    javascript,
    json,
    jsx,
    markdown,
    shellscript,
    sql,
    svelte,
    tsx,
    typescript,
    vue,
    yaml,
  ],
  themes: [githubDark, githubLight],
  engine: createJavaScriptRawEngine(),
});
