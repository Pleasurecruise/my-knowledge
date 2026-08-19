import type { PageLayoutProps } from "./page-layout.types";

export function PageLayout({ action, children, description, title, view }: PageLayoutProps) {
  const shell = view === "narrow" ? "max-w-280 px-4 sm:px-8" : "max-w-5xl px-4 sm:px-6 lg:px-8";
  const measure = view === "narrow" ? "max-w-180" : "max-w-none";
  const bottom = view === "narrow" ? "pb-24" : "pb-0";
  return (
    <div className={`mx-auto ${shell} pt-7 ${bottom}`}>
      <header className={`mx-auto mb-8 ${measure}`}>
        <div className="flex items-start justify-between gap-4">
          <div className="relative inline-block">
            <h1 className="font-serif text-7 leading-none font-semibold text-foreground">
              {title}
            </h1>
            <span className="absolute -bottom-1.5 left-0 h-0.5 w-8 rounded-sm bg-primary" />
          </div>
          {action}
        </div>
        <p className="mt-4 text-sm text-muted-foreground">{description}</p>
      </header>
      <div className={`mx-auto mt-6 ${measure}`}>{children}</div>
    </div>
  );
}
