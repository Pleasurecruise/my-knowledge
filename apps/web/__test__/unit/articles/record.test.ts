import { describe, expect, it } from "vite-plus/test";

import {
  articleObjectKey,
  articleVectorId,
  articleVectorMetadataSchema,
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
  it("keeps version-specific identifiers within the Vectorize limit", () => {
    const id = "9ec1feaf-37d3-4b88-b529-9c0c7802d886";
    const hash = "a".repeat(64);
    const vectorId = articleVectorId(id, hash);

    expect(vectorId).toBe(`${id.replaceAll("-", "")}:${hash.slice(0, 31)}`);
    expect(new TextEncoder().encode(vectorId).byteLength).toBe(64);
    expect(articleVectorMetadataSchema.parse({ articleId: id, contentHash: hash })).toEqual({
      articleId: id,
      contentHash: hash,
    });
  });

  it("rejects malformed provider metadata", () => {
    expect(
      articleVectorMetadataSchema.safeParse({
        articleId: "9ec1feaf-37d3-4b88-b529-9c0c7802d886",
        contentHash: "short",
      }).success,
    ).toBe(false);
  });
});
