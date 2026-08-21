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

  it("uses one streaming completion and concatenates delta content", async () => {
    const request = vi.fn(() =>
      Promise.resolve(
        new Response(
          'data: {"choices":[{"delta":{"content":" 中文"}}]}\n\n' +
            'data: {"choices":[{"delta":{"content":"结果 "}}]}\n\n' +
            "data: [DONE]\n\n",
          { headers: { "content-type": "text/event-stream" } },
        ),
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
          stream: true,
        }),
      }),
    );
  });

  it("accepts a terminal usage chunk with an empty choices array", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn(() =>
        Promise.resolve(
          new Response(
            'data: {"choices":[{"delta":{"content":"中"}}]}\n\n' +
              'data: {"choices":[{"delta":{"content":"文"}}]}\n\n' +
              'data: {"choices":[],"usage":{"total_tokens":4}}\n\n' +
              "data: [DONE]\n\n",
          ),
        ),
      ),
    );

    await expect(runModel(gateway, "system", "prompt")).resolves.toBe("中文");
  });

  it("rejects malformed completion frames without a fallback", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn(() => Promise.resolve(new Response("data: not-json\n\n"))),
    );

    await expect(runModel(gateway, "system", "prompt")).rejects.toThrow();
  });

  it("rejects an empty response body", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn(() => Promise.resolve(new Response(null))),
    );

    await expect(runModel(gateway, "system", "prompt")).rejects.toThrow(
      "Article model stream is empty",
    );
  });
});
