import rehypeReact from "rehype-react";
import {
  Fragment,
  Suspense,
  use,
  useMemo,
  type AnchorHTMLAttributes,
  type ComponentProps,
  type ComponentType,
  type ReactNode,
} from "react";
import { jsx, jsxs } from "react/jsx-runtime";
import { unified } from "unified";

import type { ArtifactElement, CompiledMarkdown } from "./markdown-artifact";
import { CodeBlock } from "./code-block";
import { MarkdownBody } from "./markdown-body";
import { renderMarkdownEmbed, type ResolvedEmbed } from "./markdown-embeds";
import type { StructuredBlockLabels, StructuredBlockProps } from "./structured-block.types";
import { TweetCard } from "./tweet-card";

declare module "unified" {
  interface CompileResultMap {
    ReactNode: ReactNode;
  }
}

type MarkdownProps = {
  compiled: CompiledMarkdown;
  labels: StructuredBlockLabels;
  structuredBlock: ComponentType<StructuredBlockProps>;
  embeds?: readonly Promise<ResolvedEmbed>[];
  link?: ComponentType<AnchorHTMLAttributes<HTMLAnchorElement>>;
};

function embedNode(node: ArtifactElement, link: MarkdownProps["link"]) {
  return unified()
    .use(rehypeReact, { Fragment, jsx, jsxs, components: link ? { a: link } : {} })
    .stringify({ type: "root", children: [node] });
}

function EnrichedEmbed({
  embed,
  link,
}: {
  embed: Promise<ResolvedEmbed>;
  link: MarkdownProps["link"];
}) {
  const result = use(embed);
  return result.kind === "tweet" ? (
    <TweetCard tweet={result.tweet} align={result.align} />
  ) : (
    embedNode(result.card, link)
  );
}

export function Markdown({ compiled, labels, structuredBlock, embeds, link }: MarkdownProps) {
  const result = useMemo(() => {
    const { tree, deferredEmbeds } = compiled;
    return unified()
      .use(rehypeReact, {
        Fragment,
        jsx,
        jsxs,
        components: {
          ...(link ? { a: link } : {}),
          pre: (props: ComponentProps<"pre">) => <CodeBlock {...props} labels={labels} />,
          "structured-block": structuredBlock,
          "deferred-embed": ({ embedIndex }: { embedIndex: number }) => {
            const embed = deferredEmbeds[embedIndex];
            const resolved = embeds?.[embedIndex];
            if (!embed || !resolved) throw new Error("Deferred embed is missing");
            return (
              <Suspense
                fallback={
                  embed.kind === "articleList" ? null : embedNode(renderMarkdownEmbed(embed), link)
                }
              >
                <EnrichedEmbed embed={resolved} link={link} />
              </Suspense>
            );
          },
        },
      })
      .stringify(tree);
  }, [compiled, labels, structuredBlock, embeds, link]);

  return <MarkdownBody>{result}</MarkdownBody>;
}
