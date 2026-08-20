import { afterEach, describe, expect, it, vi } from "vite-plus/test";

import { gatewayEndpoint, gatewayHeaders } from "../src";
import { runModel } from "../src/model";

const gateway = { accountId: "account", token: "secret" };

describe("AI boundary", () => {
  afterEach(() => vi.unstubAllGlobals());

  it("routes through the configured Gateway with payload collection enabled and caching disabled", () => {
    expect(gatewayEndpoint(gateway)).toBe(
      "https://gateway.ai.cloudflare.com/v1/account/default/compat",
    );
    expect(gatewayHeaders(gateway)).toEqual({
      "content-type": "application/json",
      "cf-aig-authorization": "Bearer secret",
      "cf-aig-collect-log-payload": "true",
      "cf-aig-skip-cache": "true",
    });
  });

  it("uses one non-streaming completion", async () => {
    const request = vi.fn(() =>
      Promise.resolve(
        Response.json({
          id: "completion",
          choices: [{ message: { role: "assistant", content: " 中文结果 " } }],
        }),
      ),
    );
    vi.stubGlobal("fetch", request);

    await expect(runModel(gateway, "system", "prompt")).resolves.toBe("中文结果");
    expect(request).toHaveBeenCalledWith(
      "https://gateway.ai.cloudflare.com/v1/account/default/compat/chat/completions",
      expect.objectContaining({
        method: "POST",
        headers: gatewayHeaders(gateway),
        body: JSON.stringify({
          model: "dynamic/article",
          messages: [
            { role: "system", content: "system" },
            { role: "user", content: "prompt" },
          ],
        }),
      }),
    );
  });

  it("rejects a malformed completion without a fallback", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn(() => Promise.resolve(new Response("not-json"))),
    );

    await expect(runModel(gateway, "system", "prompt")).rejects.toThrow();
  });

  it("rejects a completion without a choice", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn(() => Promise.resolve(Response.json({ id: "completion", choices: [] }))),
    );

    await expect(runModel(gateway, "system", "prompt")).rejects.toThrow();
  });
});
