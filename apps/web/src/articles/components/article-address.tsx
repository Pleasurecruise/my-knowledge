"use client";

import { useEffect } from "react";

export function ArticleAddress({ id }: { id: string }) {
  useEffect(() => {
    const url = new URL(window.location.href);
    const pathname = `/articles/${id}`;
    if (url.pathname === pathname) return;
    url.pathname = pathname;
    window.history.replaceState(window.history.state, "", url);
  }, [id]);
  return null;
}
