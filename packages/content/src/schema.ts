import { z } from "zod";

export const MAX_TAGS = 5;

export const visibilitySchema = z.enum(["private", "public"]);

export const jsonCanvasSchema = z
  .object({
    nodes: z
      .array(
        z.object({
          id: z.string().min(1),
          type: z.literal("text"),
          text: z.string(),
          x: z.number(),
          y: z.number(),
          width: z.number().positive(),
          height: z.number().positive(),
        }),
      )
      .min(1),
    edges: z.array(
      z.object({
        id: z.string().min(1),
        fromNode: z.string().min(1),
        toNode: z.string().min(1),
        label: z.string().optional(),
      }),
    ),
  })
  .superRefine((canvas, context) => {
    const nodeIds = new Set(canvas.nodes.map((node) => node.id));
    if (nodeIds.size !== canvas.nodes.length) {
      context.addIssue({ code: "custom", message: "JSON Canvas node IDs must be unique" });
    }
    const edgeIds = new Set(canvas.edges.map((edge) => edge.id));
    if (edgeIds.size !== canvas.edges.length) {
      context.addIssue({ code: "custom", message: "JSON Canvas edge IDs must be unique" });
    }
    for (const edge of canvas.edges) {
      if (!nodeIds.has(edge.fromNode) || !nodeIds.has(edge.toNode)) {
        context.addIssue({
          code: "custom",
          message: `JSON Canvas edge references a missing node: ${edge.id}`,
        });
      }
    }
  });

export const articleTextSchema = z.object({
  title: z.string().trim().min(1),
  summary: z.string().trim().min(1),
  markdown: z.string().min(1),
});

const articleEditionsSchema = z
  .object({ zh: articleTextSchema, en: articleTextSchema })
  .catchall(articleTextSchema);

export const articleSchema = z.object({
  id: z.string().uuid(),
  slug: z.string().min(1),
  editions: articleEditionsSchema,
  tags: z.array(z.string()).max(MAX_TAGS),
  visibility: visibilitySchema,
  contentHash: z.string().regex(/^[a-f0-9]{64}$/u),
  createdAt: z.iso.datetime(),
  updatedAt: z.iso.datetime(),
});

export const frontmatterSchema = z
  .object({
    title: z.string().trim().min(1),
    summary: z.string().trim().min(1),
    tags: z.array(z.string()).max(MAX_TAGS),
  })
  .strict();

export type Visibility = z.infer<typeof visibilitySchema>;
export type JsonCanvas = z.infer<typeof jsonCanvasSchema>;
export type ArticleText = z.infer<typeof articleTextSchema>;
export type Article = z.infer<typeof articleSchema>;
type ArticleEditionSummary = Omit<ArticleText, "markdown">;
export type ArticleSummary = Omit<Article, "editions"> & {
  editions: { zh: ArticleEditionSummary; en: ArticleEditionSummary } & Record<
    string,
    ArticleEditionSummary
  >;
};

export type ParsedArticleDocument = {
  title: string;
  summary: string;
  tags: string[];
  body: string;
  links: string[];
  markdown: string;
};

export type ArticleDocumentSet = {
  editions: { zh: ParsedArticleDocument; en: ParsedArticleDocument } & Record<
    string,
    ParsedArticleDocument
  >;
  tags: string[];
  links: string[];
  contentHash: string;
};
