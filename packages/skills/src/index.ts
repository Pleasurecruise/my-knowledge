import { generatedSkills } from "./generated/registry";
import { canvasSkill } from "./project/canvas";
import { translateSkill } from "./project/translate";
import { vegaSkill } from "./project/vega";

export type SkillId = "write" | "translate" | "vega" | "canvas";

export type RuntimeSkill = {
  id: SkillId;
  description: string;
  instructions: string;
};

export const skillRegistry = new Map<SkillId, RuntimeSkill>([
  [
    "write",
    {
      id: "write",
      description: "Editorial rules for evidence-minded long-form Chinese prose.",
      instructions: generatedSkills.write,
    },
  ],
  [
    "translate",
    {
      id: "translate",
      description: "Preserve the complete article while producing another locale edition.",
      instructions: translateSkill,
    },
  ],
  [
    "vega",
    {
      id: "vega",
      description: "Add a portable quantitative chart when real data benefits from one.",
      instructions: vegaSkill,
    },
  ],
  [
    "canvas",
    {
      id: "canvas",
      description: "Add a portable concept map when relationships benefit from spatial structure.",
      instructions: canvasSkill,
    },
  ],
]);

export function selectSkills(content: string): SkillId[] {
  const selected: SkillId[] = ["write"];
  const normalized = content.toLowerCase();

  if (/数据|统计|趋势|data|statistics|trend/u.test(normalized)) selected.push("vega");
  if (/概念图|知识图|关系图|concept map|knowledge map/u.test(normalized)) selected.push("canvas");

  return selected;
}
