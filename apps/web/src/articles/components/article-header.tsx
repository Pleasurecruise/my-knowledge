import type { ArticleHeaderProps } from "./article-header.types";

export function ArticleHeader({ children, title }: ArticleHeaderProps) {
  return (
    <header className="article-heading">
      <div className="article-heading-top">
        <h1 className="font-serif text-[length:var(--text-section)] font-normal leading-[var(--leading-heading)] text-foreground">
          {title}
        </h1>
        {children}
      </div>
    </header>
  );
}
