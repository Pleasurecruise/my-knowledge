import { describe, expect, it } from "vite-plus/test";
import { z } from "zod";

import { generateApiKey, getApiKeyStatus, verifyApiKey } from "@/auth/api-key";

describe("API key", () => {
  it("stores one digest and immediately invalidates the previous key", async () => {
    const state: {
      apiKeyRecord: { version: 1; digest: string; createdAt: string } | null;
      writes: number;
    } = {
      apiKeyRecord: null,
      writes: 0,
    };
    const namespace = {
      getByName(name: string) {
        expect(name).toBe("my-knowledge-api-key");
        return {
          async fetch(request: Request) {
            expect(new URL(request.url).pathname).toBe("/key");
            if (request.method === "GET") {
              return state.apiKeyRecord === null
                ? new Response(null, { status: 404 })
                : Response.json(state.apiKeyRecord);
            }
            if (request.method === "PUT") {
              state.writes += 1;
              state.apiKeyRecord = z
                .object({
                  version: z.literal(1),
                  digest: z.string(),
                  createdAt: z.string(),
                })
                .parse(await request.json());
              return new Response(null, { status: 204 });
            }
            return new Response(null, { status: 405 });
          },
        };
      },
    };

    await expect(getApiKeyStatus(namespace)).resolves.toEqual({ configured: false });
    const previous = await generateApiKey(namespace);
    expect(previous.apiKey).toMatch(/^sk-[A-Za-z0-9_-]{43}$/u);
    expect(JSON.stringify(state.apiKeyRecord)).not.toContain(previous.apiKey);
    expect(state.apiKeyRecord).toMatchObject({
      version: 1,
      digest: expect.stringMatching(/^[0-9a-f]{64}$/u),
      createdAt: previous.createdAt,
    });

    const current = await generateApiKey(namespace);
    expect(state.writes).toBe(2);
    await expect(
      verifyApiKey(
        new Request("https://example.com/api/articles", {
          headers: { authorization: `Bearer ${previous.apiKey}` },
        }),
        namespace,
      ),
    ).resolves.toBe(false);
    await expect(
      verifyApiKey(
        new Request("https://example.com/api/articles", {
          headers: { authorization: `Bearer ${current.apiKey}` },
        }),
        namespace,
      ),
    ).resolves.toBe(true);
    await expect(getApiKeyStatus(namespace)).resolves.toEqual({
      configured: true,
      createdAt: current.createdAt,
    });
  });
});
