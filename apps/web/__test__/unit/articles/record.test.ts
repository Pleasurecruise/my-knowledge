import { describe, expect, it } from "vite-plus/test";

import { articleObjectKey } from "@/articles/persistence/record";

describe("article object keys", () => {
  it("stores untagged editions below the knowledge prefix", () => {
    expect(articleObjectKey("readable-slug", [], "zh-CN")).toBe("knowledge/readable-slug/zh-cn.md");
  });

  it("uses the complete primary hierarchical tag as folders", () => {
    expect(
      articleObjectKey("react-server-components", ["engineering/frontend", "react"], "en"),
    ).toBe("knowledge/engineering/frontend/react-server-components/en.md");
  });
});
