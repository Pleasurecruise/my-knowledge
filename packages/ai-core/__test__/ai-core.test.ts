import { afterEach, describe, expect, it, vi } from "vite-plus/test";

import { DUPLICATE_THRESHOLD, gatewayEndpoint, gatewayHeaders, isDuplicateScore } from "../src";
import { runModel } from "../src/model";

const gateway = { accountId: "account", token: "secret" };

describe("AI boundary", () => {
  afterEach(() => vi.unstubAllGlobals());

  it("routes through the configured Gateway and disables payload collection and caching", () => {
    expect(gatewayEndpoint(gateway)).toBe(
      "https://gateway.ai.cloudflare.com/v1/account/default/custom-opencode/v1",
    );
    expect(gatewayHeaders(gateway)).toEqual({
      "content-type": "application/json",
      "cf-aig-authorization": "Bearer secret",
      "cf-aig-collect-log-payload": "false",
      "cf-aig-skip-cache": "true",
    });
  });

  it("uses one non-streaming completion and validates its response", async () => {
    const request = vi.fn(() =>
      Promise.resolve(
        Response.json({
          choices: [{ message: { content: " 中文结果 " } }],
        }),
      ),
    );
    vi.stubGlobal("fetch", request);

    await expect(runModel(gateway, "system", "prompt")).resolves.toBe("中文结果");
    expect(request).toHaveBeenCalledWith(
      "https://gateway.ai.cloudflare.com/v1/account/default/custom-opencode/v1/chat/completions",
      expect.objectContaining({
        method: "POST",
        headers: gatewayHeaders(gateway),
        body: JSON.stringify({
          model: "deepseek-v4-flash",
          messages: [
            { role: "system", content: "system" },
            { role: "user", content: "prompt" },
          ],
          max_tokens: 12_000,
          temperature: 0.2,
          stream: false,
        }),
      }),
    );
  });

  it("rejects malformed completion responses without a fallback", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn(() => Promise.resolve(Response.json({ choices: [] }))),
    );

    await expect(runModel(gateway, "system", "prompt")).rejects.toThrow();
  });

  it("keeps the duplicate decision stable at its threshold", () => {
    expect(isDuplicateScore(DUPLICATE_THRESHOLD - Number.EPSILON)).toBe(false);
    expect(isDuplicateScore(DUPLICATE_THRESHOLD)).toBe(true);
    expect(isDuplicateScore(DUPLICATE_THRESHOLD + Number.EPSILON)).toBe(true);
  });
});
