# Skill registry and loading

Status: Implemented; this is the only project skill registry

Remote use is supported. Agent Skills are instruction files, so Cloudflare can send them to the
model like any other prompt. The constraint is that a Worker has no developer filesystem and should
not fetch mutable GitHub content during a request.

## Production skills

| Skill       | Source        | Stage                                                    |
| :---------- | :------------ | :------------------------------------------------------- |
| `write`     | `tw93/Waza`   | Editorial rules for the body                             |
| `translate` | Project-owned | Produce each locale requested by the validated operation |
| `vega`      | Project-owned | Quantitative charts                                      |
| `canvas`    | Project-owned | Concept maps and knowledge maps                          |

The deterministic `selectSkills` function reads short catalog descriptions and returns `write` plus
zero or more visual skill IDs. It does not draft the article or become another prompt. The writing
call receives the project article contract, pinned Waza material, and only the selected project-owned
rich-content skills.

Summary, hierarchical tags, and proposed wiki links are outputs of the writing call. They are not
separate skills. Embedding, similarity, CRUD, indexing, authorization, and rendering remain
deterministic TypeScript.

## Build-time acquisition

`packages/skills/sources.lock.json` records repository, commit, path, declared license, content hash,
and usage for each external file. `pnpm skills:sync` is the only command that reads GitHub. It
downloads only locked files, verifies hashes, updates attribution, and bundles only entries marked
`runtime`.
Project-owned skills live beside the loader and are reviewed as ordinary source.

The Worker imports that generated registry as a normal module. A request performs an in-memory lookup:

```ts
const selected = skillRegistry.get(skillId);
```

There is no request-time GitHub access, filesystem scan, global Codex directory, R2 skill storage, or
mutable latest-version lookup. Updating a skill is an explicit dependency update and code review.

## Prompt precedence

Upstream skills are source material, not an authority above the product contract. Prompt order is:

1. privacy, output schema, supported Markdown, and default-private project rules;
2. adapted Waza editorial rules and selected project-owned rich-content guidance;
3. the submitted content and existing tag/link context.

The Waza wrapper applies its voice, evidence, long-form, and Chinese prose rules to the article body.
It explicitly disables Waza's `🥷` prefix, edited-text-only response shape, interactive questions,
durable-context behavior, and shell/Python punctuation gate. The upstream punctuation checker remains
a pinned test oracle; equivalent character checks run as deterministic TypeScript in production.
This adaptation is required to use Waza without corrupting YAML frontmatter or making a Worker depend
on a local agent filesystem.

Waza is MIT-licensed and its reviewed `write` files may be bundled with attribution. The
markdown-viewer repository declares GPL-3.0 in its README but has no license file at the reviewed
commit. Its pinned Vega/Canvas files remain `referenceOnly`: the sync command verifies them but never
places their text in the Worker. Implement the project-owned skills from the supported fenced-block
contracts and public formats without copying upstream wording, templates, fonts, or assets.

## Remote compatibility

Vega/Vega-Lite, JSON Canvas, and Mermaid are suitable because the web UI renders their portable source
in the browser. A runtime skill may not introduce raw HTML/CSS or require another remote renderer.
Other visual formats are outside the first release.

## Rules

- Load the smallest relevant skill set for each request.
- Pin upstream commits and exact hashes.
- Keep deterministic behavior in code.
- Preserve upstream licenses and attribution.
- Add a runtime skill only when it materially changes generated source syntax or editorial judgment.
