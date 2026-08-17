export function normalizeLocale(locale: string): string {
  const canonical = Intl.getCanonicalLocales(locale.trim()).at(0);
  if (!canonical) throw new Error(`Invalid locale: ${locale}`);
  return canonical.toLocaleLowerCase("en-US");
}

export function resolveLocale(
  availableLocales: readonly string[],
  requestedLocale: string | undefined,
  defaultLocale = "zh",
): string | undefined {
  const available = new Map(
    availableLocales.map((locale): [string, string] => {
      const normalized = normalizeLocale(locale);
      return [normalized, normalized];
    }),
  );
  if (requestedLocale) {
    let requested: string;
    try {
      requested = normalizeLocale(requestedLocale);
    } catch {
      return undefined;
    }
    const exact = available.get(requested);
    if (exact) return exact;
    const language = requested.split("-").at(0);
    if (language) {
      const compatible = [...available.keys()].find(
        (locale) => locale === language || locale.startsWith(`${language}-`),
      );
      if (compatible) return compatible;
    }
  }
  const normalizedDefault = normalizeLocale(defaultLocale);
  return available.get(normalizedDefault);
}
