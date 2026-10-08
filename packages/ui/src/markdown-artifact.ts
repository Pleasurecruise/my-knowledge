import type { MarkdownEmbed } from "@my-knowledge/content";
import { z } from "zod";

export type DeferredEmbed = Extract<
  MarkdownEmbed,
  { kind: "link" | "github" | "stock" | "twitter" | "articleList" }
>;
type ArtifactText = { type: "text"; value: string };
type ArtifactComment = { type: "comment"; value: string };
export type ArtifactElement = {
  type: "element";
  tagName: string;
  properties: Record<string, string | number | boolean | null | (string | number)[]>;
  children: (ArtifactElement | ArtifactText | ArtifactComment)[];
};
export type CompiledMarkdown = {
  tree: {
    type: "root";
    children: (ArtifactElement | ArtifactText | ArtifactComment | { type: "doctype" })[];
  };
  deferredEmbeds: DeferredEmbed[];
};
export type MarkdownCache = {
  get(key: string): Promise<string | null>;
  put(key: string, value: string, options: { expirationTtl: number }): Promise<void>;
};

const text = z.object({ type: z.literal("text"), value: z.string() });
const comment = z.object({ type: z.literal("comment"), value: z.string() });
export const artifactElementSchema: z.ZodType<ArtifactElement> = z.lazy(() =>
  z.object({
    type: z.literal("element"),
    tagName: z.string(),
    properties: z.record(
      z.string(),
      z.union([
        z.string(),
        z.number(),
        z.boolean(),
        z.null(),
        z.array(z.union([z.string(), z.number()])),
      ]),
    ),
    children: z.array(z.union([artifactElementSchema, text, comment])),
  }),
);
const align = z.enum(["left", "right", "wide", "narrow"]);

export const compiledMarkdownSchema: z.ZodType<CompiledMarkdown> = z.object({
  tree: z.object({
    type: z.literal("root"),
    children: z.array(
      z.union([artifactElementSchema, text, comment, z.object({ type: z.literal("doctype") })]),
    ),
  }),
  deferredEmbeds: z.array(
    z.discriminatedUnion("kind", [
      z.object({ kind: z.literal("github"), repo: z.string(), align }),
      z.object({ kind: z.literal("stock"), code: z.string(), align }),
      z.object({ kind: z.literal("link"), url: z.string(), align }),
      z.object({ kind: z.literal("twitter"), url: z.string(), align }),
      z.object({ kind: z.literal("articleList"), urls: z.array(z.string()), align }),
    ]),
  ),
});
