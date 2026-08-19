import { writeChineseArticle } from "@my-knowledge/ai-core";
import { parseArticleDocuments } from "@my-knowledge/content";
import { selectSkills, skillRegistry } from "@my-knowledge/skills";

import { modelConfig } from "@/model/config";

import { findArticleByHash, listTags } from "../persistence/query";
import { createArticle } from "../persistence/write";
import { translateChineseDocument } from "./translation";

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
  const tags = await listTags(env, "owner");
  const selected = selectSkills(content).map(requireSkill);
  const zhMarkdown = await writeChineseArticle(
    gateway,
    content,
    selected,
    [],
    tags.map((tag) => tag.path),
  );
  const zhDocument = await parseArticleDocuments({ zh: zhMarkdown });

  const exact = await findArticleByHash(env, zhDocument.contentHash);
  if (exact) return { status: "duplicate", similarArticle: exact, score: 1 };

  const document = await translateChineseDocument(env, zhMarkdown);
  return { status: "created", article: await createArticle(env, document) };
}
