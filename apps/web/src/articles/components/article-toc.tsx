"use client";

import { useEffect, useState } from "react";

import type { ArticleTocProps } from "./article-toc.types";

export function ArticleToc({ headings, label }: ArticleTocProps) {
  const [activeId, setActiveId] = useState("");

  useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) => {
        const visible = entries.find(({ isIntersecting }) => isIntersecting);
        if (visible) setActiveId(visible.target.id);
      },
      { rootMargin: "0px 0px -70% 0px", threshold: 0 },
    );
    for (const { id } of headings) {
      const heading = document.getElementById(id);
      if (heading) observer.observe(heading);
    }
    return () => observer.disconnect();
  }, [headings]);

  return (
    <nav aria-label={label} className="article-toc hidden xl:block">
      <ul className="article-toc-list">
        {headings.map((heading) => (
          <li key={heading.id}>
            <span
              className="article-toc-bar"
              aria-hidden="true"
              style={{ width: Math.min(64, 16 + heading.title.length * 2) }}
            />

            <a
              aria-label={heading.title}
              title={heading.title}
              aria-current={activeId === heading.id ? "location" : undefined}
              className="article-toc-link"
              href={`#${heading.id}`}
              onClick={() => setActiveId(heading.id)}
              style={{ paddingLeft: Math.max(0, heading.depth - 2) * 8 }}
            >
              <span className="article-toc-text">{heading.title}</span>
            </a>
          </li>
        ))}
      </ul>
    </nav>
  );
}
