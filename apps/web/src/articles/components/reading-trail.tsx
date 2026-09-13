"use client";

import { createContext, useLayoutEffect, useRef, useState, type ReactNode } from "react";
import { usePathname, useSearchParams } from "next/navigation";

export const ArticleReturnContext = createContext<string | null>(null);
const storageKey = "readingTrail";

export function ReadingTrail({ children }: { children: ReactNode }) {
  const pathname = usePathname();
  const query = useSearchParams();
  const current = pathname === "/explore" && query.size ? `${pathname}?${query}` : pathname;
  const previous = useRef<string | null>(null);
  const [destination, setDestination] = useState<{ current: string; href: string } | null>(null);
  useLayoutEffect(() => {
    if (pathname === "/articles/new") return;
    const articleId = document.querySelector<HTMLElement>("[data-article-id]")?.dataset.articleId;
    const canonical = articleId ? `/articles/${articleId}` : current;
    let paths: string[] = [];
    const stored = (sessionStorage.getItem(storageKey) ?? "").split("\n");
    if (
      stored.length <= 9 &&
      stored.every(
        (path) =>
          path !== "/articles/new" &&
          /^\/(?:articles\/[^/?#\s]+|explore(?:\?[^#\s]*)?)?$/u.test(path),
      ) &&
      (stored.at(-1) === canonical || stored.at(-1) === previous.current)
    )
      paths = stored;
    const index = paths.indexOf(canonical);
    paths = index >= 0 ? paths.slice(0, index + 1) : [...paths, canonical].slice(-9);
    previous.current = canonical;
    setDestination({ current, href: paths.at(-2) ?? "" });
    sessionStorage.setItem(storageKey, paths.join("\n"));
  }, [current, pathname]);
  return (
    <ArticleReturnContext
      value={destination?.current === current ? destination.href || null : null}
    >
      {children}
    </ArticleReturnContext>
  );
}
