import { cookies, headers } from "next/headers";

import { defaultInterfaceLocale, interfaceLocales } from "@/i18n/registry";

export const interfaceLocaleCookie = "my-knowledge:locale";

export async function getInterfaceI18n() {
  const cookieStore = await cookies();
  const stored = cookieStore.get(interfaceLocaleCookie);
  const locale = interfaceLocales.find(({ code }) => code === stored?.value);
  if (locale) return locale;

  let selected = interfaceLocales.find(({ code }) => code === defaultInterfaceLocale);
  if (!selected) throw new Error("The default interface locale is not registered");
  const requestHeaders = await headers();
  let priority = 0;
  for (const entry of requestHeaders.get("accept-language")?.split(",") ?? []) {
    const [range, weight] = entry.trim().split(/\s*;\s*q\s*=\s*/iu);
    const language = range?.split("-")[0]?.toLowerCase();
    const quality = weight === undefined ? 1 : Number(weight);
    const candidate = interfaceLocales.find(({ code }) => code.split("-")[0] === language);
    if (candidate && quality > priority && quality <= 1) {
      selected = candidate;
      priority = quality;
    }
  }
  return selected;
}
