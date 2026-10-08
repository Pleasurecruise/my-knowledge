import handler from "@tanstack/react-start/server-entry";

import { resolveInterfaceI18n } from "./i18n/registry";

export { ArticleWriter } from "./articles/writer";

export { ApiKeyDurableObject } from "./auth/api-key-object";

const discoveryLinks = [
  '</.well-known/api-catalog>; rel="api-catalog"',
  '</api/openapi.json>; rel="service-desc"; type="application/vnd.oai.openapi+json"',
  '<https://github.com/Pleasurecruise/my-knowledge/blob/main/docs/API.md>; rel="service-doc"',
  '</llms.txt>; rel="describedby"; type="text/plain"',
].join(", ");

async function render(request: Request, url: URL) {
  const rendered = await handler.fetch(request);
  const response = new Response(rendered.body, rendered);
  if (
    !response.headers.has("cache-control") &&
    response.headers.get("content-type")?.startsWith("text/html")
  )
    response.headers.set(
      "Cache-Control",
      "private, no-cache, no-store, max-age=0, must-revalidate",
    );
  if (url.pathname === "/") response.headers.set("Link", discoveryLinks);
  if (url.hostname === "localhost")
    response.headers.set("Referrer-Policy", "no-referrer-when-downgrade");
  return response;
}

export default {
  async fetch(request, env, ctx) {
    const url = new URL(request.url);
    const articleId = url.pathname.startsWith("/articles/")
      ? url.pathname.slice("/articles/".length)
      : null;
    if (
      request.method !== "GET" ||
      request.headers.has("cookie") ||
      (url.pathname !== "/" && (articleId === null || articleId === "" || articleId.includes("/")))
    )
      return render(request, url);
    const version =
      articleId === null
        ? await env.DB.prepare(
            "SELECT count(*) || '-' || max(updatedAt) AS version FROM articles",
          ).first<string>("version")
        : await env.DB.prepare(
            "SELECT updatedAt AS version FROM articles WHERE id = ? AND visibility = 'public'",
          )
            .bind(articleId)
            .first<string>("version");
    if (version === null) return render(request, url);
    const key = new URL(url);
    key.searchParams.set("__version", version);
    key.searchParams.set(
      "__locale",
      resolveInterfaceI18n(undefined, request.headers.get("accept-language")).code,
    );
    const pages = await caches.open("pages");
    const cached = await pages.match(key);
    if (cached) {
      const hit = new Response(cached.body, cached);
      hit.headers.set("Cache-Control", "private, no-cache");
      return hit;
    }
    const response = await render(request, url);
    if (response.status !== 200 || response.headers.has("set-cookie")) return response;
    const stored = new Response(response.clone().body, response);
    stored.headers.set("Cache-Control", "public, max-age=86400");
    ctx.waitUntil(pages.put(key, stored));
    return response;
  },
} satisfies ExportedHandler<CloudflareEnv>;
