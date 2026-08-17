import { describe, expect, it } from "vite-plus/test";

import { defaultInterfaceLocale, interfaceLocales } from "@/i18n/registry";

describe("interface locale registry", () => {
  it("registers one unique entry for every supported interface locale", () => {
    const codes = interfaceLocales.map(({ code }) => code);

    expect(new Set(codes).size).toBe(codes.length);
    expect(codes).toContain("zh-CN");
    expect(codes).toContain("en");
    expect(codes).toContain("ja");
  });

  it("registers the documented default locale", () => {
    expect(interfaceLocales.some(({ code }) => code === defaultInterfaceLocale)).toBe(true);
  });
});
