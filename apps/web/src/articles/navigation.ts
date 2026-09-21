export function articleReturnHref(from: string | string[] | undefined): string {
  if (typeof from !== "string" || !from.startsWith("/explore")) return "/";
  const url = new URL(from, "https://knowledge.invalid");
  if (url.origin !== "https://knowledge.invalid" || url.pathname !== "/explore") return "/";
  const query = new URLSearchParams();
  const search = url.searchParams.get("query");
  if (search) query.set("query", search);
  return query.size ? `/explore?${query}` : "/explore";
}
