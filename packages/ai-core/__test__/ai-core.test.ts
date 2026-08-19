import { afterEach, describe, expect, it, vi } from "vite-plus/test";

import { gatewayEndpoint, gatewayHeaders } from "../src";
import { runModel } from "../src/model";

const gateway = { accountId: "account", token: "secret" };

function sseResponse(frames: readonly string[], init: ResponseInit = {}): Response {
  const encoder = new TextEncoder();
  const body = new ReadableStream<Uint8Array>({
    start(controller) {
      for (const frame of frames) controller.enqueue(encoder.encode(frame));
      controller.close();
    },
  });
  return new Response(body, init);
}

function sseChunk(delta: string): string {
  return `data: ${JSON.stringify({ choices: [{ delta: { content: delta } }] })}\n\n`;
}

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
        sseResponse([sseChunk("中文"), sseChunk("结果"), "data: [DONE]\n\n"], {
          headers: { "content-type": "text/event-stream" },
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
          stream: true,
        }),
      }),
    );
  });

  it("rejects malformed completion frames without a fallback", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn(() => Promise.resolve(sseResponse(["data: not-json\n\n"]))),
    );

    await expect(runModel(gateway, "system", "prompt")).rejects.toThrow();
  });

  it("accepts a terminal usage chunk with an empty choices array", async () => {
    const request = vi.fn(() =>
      Promise.resolve(
        sseResponse([
          sseChunk("中"),
          sseChunk("文"),
          'data: {"id":"x","choices":[],"usage":{"prompt_tokens":2,"completion_tokens":2,"total_tokens":4}}\n\n',
          "data: [DONE]\n\n",
        ]),
      ),
    );
    vi.stubGlobal("fetch", request);

    await expect(runModel(gateway, "system", "prompt")).resolves.toBe("中文");
  });
});
