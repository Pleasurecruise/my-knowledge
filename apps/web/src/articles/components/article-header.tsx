import { Clock, Type } from "@my-knowledge/ui/icons";

import type { ArticleHeaderProps } from "./article-header.types";

const CJK_READING_SPEED = 350;
const LATIN_READING_SPEED = 200;
const CJK = /[\p{Script=Han}\p{Script=Hiragana}\p{Script=Katakana}\p{Script=Hangul}]/gu;

export function ArticleHeader({ children, text, title }: ArticleHeaderProps) {
  const content = text.trim();
  const cjk = Array.from(content.matchAll(CJK)).length;
  const latinWords = content.replaceAll(CJK, " ").match(/[A-Za-z0-9]+(?:['-][A-Za-z0-9]+)*/g);
  const latin = latinWords ? latinWords.length : 0;
  const total = cjk + latin;
  const compact = total / 1000;
  const contentCount =
    total < 1000
      ? String(total)
      : total < 10_000
        ? `${compact.toFixed(2).replace(/\.?0+$/, "")}K`
        : `${compact.toFixed(1).replace(/\.0$/, "")}K`;
  const readingTime = Math.max(1, Math.ceil(cjk / CJK_READING_SPEED + latin / LATIN_READING_SPEED));

  return (
    <header className="article-heading">
      <div className="article-heading-top">
        <h1 className="font-serif text-[length:var(--text-section)] font-normal leading-[var(--leading-heading)] text-foreground">
          {title}
        </h1>
        {children}
      </div>
      <div className="article-heading-footer">
        {total > 0 ? (
          <div className="article-metadata">
            <span className="inline-flex items-center gap-1">
              <Type className="size-[0.8rem]" strokeWidth={1.8} />
              <span>{contentCount}</span>
            </span>
            <span className="opacity-30">·</span>
            <span className="inline-flex items-center gap-1">
              <Clock className="size-[0.8rem]" strokeWidth={1.8} />
              <span>{readingTime} min</span>
            </span>
          </div>
        ) : null}
      </div>
    </header>
  );
}
