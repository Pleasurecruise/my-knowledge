import { cookies } from "next/headers";

import { defaultInterfaceLocale, interfaceLocales } from "@/i18n/registry";

export const interfaceLocaleCookie = "my-knowledge:locale";

export async function getInterfaceI18n() {
  const cookieStore = await cookies();
  const stored = cookieStore.get(interfaceLocaleCookie);
  const requested = stored ? stored.value : defaultInterfaceLocale;
  const locale = interfaceLocales.find(({ code }) => code === requested);
  const selected = locale
    ? locale
    : interfaceLocales.find(({ code }) => code === defaultInterfaceLocale);
  if (!selected) throw new Error("The default interface locale is not registered");
  return selected;
}
