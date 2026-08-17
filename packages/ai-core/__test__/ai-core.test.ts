import { describe, expect, it } from "vite-plus/test";

import {
  DUPLICATE_THRESHOLD,
  gatewayEndpoint,
  gatewayHeaders,
  isDuplicateScore,
  parseGroundedAnswer,
} from "../src";

const gateway = { accountId: "account", token: "secret" };

describe("AI boundary", () => {
  it("routes through the configured Gateway and disables payload collection and caching", () => {
    expect(gatewayEndpoint(gateway)).toBe(
      "https://gateway.ai.cloudflare.com/v1/account/default/custom-opencode/v1",
    );
    expect(gatewayHeaders(gateway)).toEqual({
      authorization: null,
      "x-api-key": null,
      "cf-aig-authorization": "Bearer secret",
      "cf-aig-collect-log-payload": "false",
      "cf-aig-skip-cache": "true",
    });
  });

  it("rejects citations outside the authorized retrieval set", () => {
    expect(parseGroundedAnswer('{"answer":"Known","citations":["one"]}', ["one"])).toEqual({
      answer: "Known",
      citations: ["one"],
    });
    expect(() =>
      parseGroundedAnswer('{"answer":"Leaked","citations":["private"]}', ["public"]),
    ).toThrow("unauthorized citation");
    expect(() =>
      parseGroundedAnswer('{"answer":"Repeated","citations":["one","one"]}', ["one"]),
    ).toThrow("Citations must be unique");
    expect(() => parseGroundedAnswer('{"answer":"Missing citations"}', ["one"])).toThrow();
    expect(() => parseGroundedAnswer("not json", ["one"])).toThrow(SyntaxError);
  });

  it("keeps the duplicate decision stable at its threshold", () => {
    expect(isDuplicateScore(DUPLICATE_THRESHOLD - Number.EPSILON)).toBe(false);
    expect(isDuplicateScore(DUPLICATE_THRESHOLD)).toBe(true);
    expect(isDuplicateScore(DUPLICATE_THRESHOLD + Number.EPSILON)).toBe(true);
  });
});
