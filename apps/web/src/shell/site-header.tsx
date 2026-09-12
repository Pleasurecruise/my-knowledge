"use client";

import { usePathname, useSearchParams } from "next/navigation";
import type { ReactNode } from "react";

export function SiteHeader({ children, controls }: { children: ReactNode; controls: ReactNode }) {
  const pathname = usePathname();
  const query = useSearchParams();
  const reading =
    pathname.startsWith("/articles/") && pathname !== "/articles/new" && query.get("edit") !== "1";
  return (
    <>
      <header className="site-masthead" hidden={reading}>
        <div className="site-masthead-row">
          {children}
          <div className="site-controls">{controls}</div>
        </div>
      </header>
    </>
  );
}
