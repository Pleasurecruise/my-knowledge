import { describe, expect, it } from "vite-plus/test";

import { selectSkills, skillRegistry } from "../src";

describe("skill selection", () => {
  it("loads only writing for ordinary prose", () => {
    expect(selectSkills("写一篇关于可靠软件边界的文章")).toEqual(["write"]);
  });

  it("adds only relevant portable visual skills", () => {
    expect(selectSkills("Use this data trend in a chart and a concept map")).toEqual([
      "write",
      "vega",
      "canvas",
    ]);
  });

  it("has instructions for every selectable skill", () => {
    for (const id of selectSkills("统计趋势和知识图")) {
      expect(skillRegistry.get(id)?.instructions.length).toBeGreaterThan(20);
    }
  });
});
