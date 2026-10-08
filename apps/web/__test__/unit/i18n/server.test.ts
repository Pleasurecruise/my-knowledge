import { expect, it, vi } from "vite-plus/test";

import { getInterfaceI18n } from "@/i18n/server";

const reads = vi.hoisted(() => ({
  getCookie: vi.fn<() => string | undefined>(),
  getRequestHeaders: vi.fn<() => Headers>(),
}));
vi.mock("@tanstack/react-start/server", () => reads);

it.each([
  [undefined, undefined, "zh-CN"],
  ["en-US,en;q=0.9", undefined, "en"],
  ["ja-JP,en;q=0.8", undefined, "ja"],
  ["zh-TW,zh;q=0.9,en;q=0.8", undefined, "zh-CN"],
  ["fr-FR,de;q=0.8", undefined, "zh-CN"],
  ["ja;q=0.3,en-GB;q=0.9", undefined, "en"],
  ["en;q=0,ja;q=0.5", undefined, "ja"],
  ["en;q=invalid,ja;q=0.5", undefined, "ja"],
  ["en;q=2,ja;q=0.5", undefined, "ja"],
  ["JA-jp ; q=0.8,en;q=0.8", undefined, "ja"],
  ["*", undefined, "zh-CN"],
  ["en-US", "invalid", "en"],
  ["en-US", "ja", "ja"],
  ["en-US", "zh-CN", "zh-CN"],
])("selects %s with preference %s as %s", (language, preference, expected) => {
  reads.getCookie.mockReturnValue(preference);
  reads.getRequestHeaders.mockReturnValue(
    new Headers(language ? { "accept-language": language } : {}),
  );
  expect(getInterfaceI18n().code).toBe(expected);
});
