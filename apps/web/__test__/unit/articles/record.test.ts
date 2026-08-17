import { describe, expect, it } from "vite-plus/test";

import {
  articleObjectKey,
  articleVectorId,
  parseArticleVectorId,
} from "@/articles/persistence/record";

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

describe("article vector identifiers", () => {
  it("round trips a valid article ID and content hash", () => {
    const id = "9ec1feaf-37d3-4b88-b529-9c0c7802d886";
    const hash = "a".repeat(64);

    expect(parseArticleVectorId(articleVectorId(id, hash))).toEqual({ id, hash });
  });

  it("rejects malformed provider identifiers", () => {
    expect(parseArticleVectorId("missing-separator")).toBeUndefined();
    expect(parseArticleVectorId(`not-a-uuid:${"a".repeat(64)}`)).toBeUndefined();
    expect(parseArticleVectorId("9ec1feaf-37d3-4b88-b529-9c0c7802d886:short")).toBeUndefined();
  });
});
