import type { MarkdownEmbed } from "@my-knowledge/content";
import type { ComponentProps } from "react";

import { Markdown } from "../src/markdown";
import type { ArtifactElement } from "../src/markdown-artifact";
import type { ResolvedEmbed } from "../src/markdown-embeds";
import { compileMarkdown } from "../src/markdown-compiler";

export async function renderMarkdown({
  structuredBlock,
  embeds,
  ...input
}: Omit<Parameters<typeof compileMarkdown>[0], "enrich"> & {
  structuredBlock: ComponentProps<typeof Markdown>["structuredBlock"];
  embeds?: (embed: MarkdownEmbed) => Promise<ArtifactElement>;
}) {
  const compiled = await compileMarkdown({ ...input, enrich: embeds !== undefined });
  const cards = compiled.deferredEmbeds.map(async (embed): Promise<ResolvedEmbed> => {
    if (!embeds) throw new Error("Deferred embeds require a resolver");
    return { kind: "card", card: await embeds(embed) };
  });
  return (
    <Markdown
      compiled={compiled}
      embeds={cards}
      labels={input.labels}
      structuredBlock={structuredBlock}
    />
  );
}
