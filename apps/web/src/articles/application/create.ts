import { writeChineseArticle } from "@my-knowledge/ai-core";
import { parseArticleDocuments } from "@my-knowledge/content";
import { selectSkills, skillRegistry } from "@my-knowledge/skills";

import { modelConfig } from "@/model/config";

import { listTags } from "../persistence/query";
import { createArticle } from "../persistence/write";

function requireSkill(id: "write" | "vega" | "canvas") {
  const skill = skillRegistry.get(id);
  if (!skill) throw new Error(`Runtime skill is missing: ${id}`);
  return skill;
}

export async function createArticleFromContent(env: CloudflareEnv, id: string, content: string) {
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
  const document = await parseArticleDocuments({ zh: zhMarkdown });
  return createArticle(env, id, document);
}
