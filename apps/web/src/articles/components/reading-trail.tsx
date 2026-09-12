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
    let paths: string[] = [];
    const stored = (sessionStorage.getItem(storageKey) ?? "").split("\n");
    if (
      stored.length <= 9 &&
      stored.every(
        (path) =>
          path !== "/articles/new" &&
          /^\/(?:articles\/[^/?#\s]+|explore(?:\?[^#\s]*)?)?$/u.test(path),
      ) &&
      (stored.at(-1) === current || stored.at(-1) === previous.current)
    )
      paths = stored;
    const index = paths.indexOf(current);
    paths = index >= 0 ? paths.slice(0, index + 1) : [...paths, current].slice(-9);
    previous.current = current;
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
