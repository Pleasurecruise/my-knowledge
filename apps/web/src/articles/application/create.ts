import { isDuplicateScore, writeChineseArticle } from "@my-knowledge/ai-core";
import { parseArticleDocuments } from "@my-knowledge/content";
import { selectSkills, skillRegistry } from "@my-knowledge/skills";

import { modelConfig } from "@/model/config";

import { findArticleByHash, listTags } from "../persistence/query";
import { findVectorArticles } from "../persistence/vector";
import { createArticle } from "../persistence/write";
import { embedText, embeddingInput } from "./embedding";

type CreateArticleResult =
  | { status: "created"; article: Awaited<ReturnType<typeof createArticle>> }
  | {
      status: "duplicate";
      similarArticle: NonNullable<Awaited<ReturnType<typeof findArticleByHash>>>;
      score: number;
    };

function requireSkill(id: "write" | "vega" | "canvas") {
  const skill = skillRegistry.get(id);
  if (!skill) throw new Error(`Runtime skill is missing: ${id}`);
  return skill;
}

export async function createArticleFromContent(
  env: CloudflareEnv,
  content: string,
): Promise<CreateArticleResult> {
  const gateway = modelConfig(env);
  const inputEmbedding = await embedText(env, content);
  const neighbors = await findVectorArticles(env, "owner", inputEmbedding, 8);
  const tags = await listTags(env, "owner");
  const selected = selectSkills(content).map(requireSkill);
  const zhMarkdown = await writeChineseArticle(
    gateway,
    content,
    selected,
    neighbors.map(({ article }) => ({
      slug: article.slug,
      title: article.editions.zh.title,
      summary: article.editions.zh.summary,
      tags: article.tags,
    })),
    tags.map((tag) => tag.path),
  );
  const document = await parseArticleDocuments({ zh: zhMarkdown });

  const exact = await findArticleByHash(env, document.contentHash);
  if (exact) return { status: "duplicate", similarArticle: exact, score: 1 };

  const embedding = await embedText(env, embeddingInput(document.editions.zh));
  const similar = await findVectorArticles(env, "owner", embedding, 1);
  const closest = similar[0];
  if (closest && isDuplicateScore(closest.score)) {
    return {
      status: "duplicate",
      similarArticle: closest.article,
      score: closest.score,
    };
  }

  return { status: "created", article: await createArticle(env, document, embedding) };
}
