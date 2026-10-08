import { getCookie, getRequestHeaders } from "@tanstack/react-start/server";

import { resolveInterfaceI18n } from "@/i18n/registry";

export const interfaceLocaleCookie = "my-knowledge:locale";

export function getInterfaceI18n() {
  return resolveInterfaceI18n(
    getCookie(interfaceLocaleCookie),
    getRequestHeaders().get("accept-language"),
  );
}
