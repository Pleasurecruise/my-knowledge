import type { PageLayoutProps } from "./page-layout.types";

export function PageLayout({ action, children, description, title, view }: PageLayoutProps) {
  return (
    <div className={`page-shell ${view === "narrow" ? "page-shell-narrow" : ""}`}>
      <header className="page-heading">
        <div className="flex items-center justify-between gap-4">
          <h1>{title}</h1>
          {action}
        </div>
        <p>{description}</p>
      </header>
      <div className="page-content">{children}</div>
    </div>
  );
}
