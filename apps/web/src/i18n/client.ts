import { useLoaderData } from "@tanstack/react-router";

import { resolveInterfaceI18n } from "@/i18n/registry";

export function useInterfaceI18n() {
  const { locale } = useLoaderData({ from: "__root__" });
  return resolveInterfaceI18n(locale, null);
}
