import { describe, expect, it } from "vite-plus/test";

import { createApiCatalog, createOpenApiDocument } from "@/discovery/api-catalog";

describe("API discovery", () => {
  const origin = new URL("https://knowledge.example");

  it("links the API to its OpenAPI description and documentation", () => {
    expect(createApiCatalog(origin)).toEqual({
      linkset: [
        {
          anchor: "https://knowledge.example/api",
          "service-desc": [
            {
              href: "https://knowledge.example/api/openapi.json",
              type: "application/vnd.oai.openapi+json",
            },
          ],
          "service-doc": [
            {
              href: "https://github.com/Pleasurecruise/my-knowledge/blob/main/docs/API.md",
              type: "text/html",
            },
          ],
        },
      ],
    });
  });

  it("describes every article operation from the request schemas", () => {
    const document = createOpenApiDocument(origin);

    expect(document.servers).toEqual([{ url: "https://knowledge.example" }]);
    expect(Object.keys(document.paths["/api/articles"])).toEqual(["get", "post"]);
    expect(Object.keys(document.paths["/api/articles/{id}"])).toEqual([
      "parameters",
      "get",
      "patch",
      "delete",
    ]);
    expect(document.paths["/api/articles"].get.parameters.at(-1)?.schema).toMatchObject({
      type: "integer",
      minimum: 1,
      maximum: 100,
      default: 20,
    });
    expect(
      document.paths["/api/articles/{id}"].delete.requestBody.content["application/json"].schema,
    ).toMatchObject({ required: ["expectedHash", "expectedUpdatedAt"] });
    expect(Object.keys(document.paths["/api/tags"])).toEqual(["get"]);
  });
});
