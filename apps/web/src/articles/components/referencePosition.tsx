"use client";

import { useEffect } from "react";

import { articleOrigin } from "@/articles/links";

export function ReferencePosition() {
  useEffect(() => {
    const body = document.querySelector("#article > .markdown-body");
    if (!body) return;
    let frame = 0;
    const locateReference = () => {
      observer.disconnect();
      cancelAnimationFrame(frame);
      const id = new URLSearchParams(window.location.hash.slice(1)).get("reference");
      if (!id) return;
      const path = `/articles/${encodeURIComponent(id)}`;
      const reference = Array.from(body.querySelectorAll<HTMLAnchorElement>("a[href]")).find(
        (link) => {
          const url = new URL(link.href);
          return (
            (url.origin === window.location.origin || url.origin === articleOrigin) &&
            url.pathname.replace(/\/$/u, "") === path
          );
        },
      );
      if (!reference) {
        observer.observe(body, { childList: true, subtree: true });
        return;
      }
      frame = requestAnimationFrame(() => {
        reference.focus({ preventScroll: true });
        reference.scrollIntoView({ block: "center", behavior: "instant" });
      });
    };
    const observer = new MutationObserver(locateReference);

    locateReference();
    window.addEventListener("hashchange", locateReference);
    return () => {
      observer.disconnect();
      cancelAnimationFrame(frame);
      window.removeEventListener("hashchange", locateReference);
    };
  }, []);

  return null;
}
