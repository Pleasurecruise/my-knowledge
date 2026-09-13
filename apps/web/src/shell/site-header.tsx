"use client";

import { Button } from "@my-knowledge/ui/components/button";
import { ChevronLeft } from "@my-knowledge/ui/icons";
import { usePathname, useSearchParams } from "next/navigation";
import { useId, useRef, useState, type ReactNode } from "react";

export function SiteHeader({
  controls,
  preferences,
  discovery,
  identity,
  action,
  owner,
  label,
}: {
  controls: ReactNode;
  preferences: ReactNode;
  discovery: ReactNode;
  identity: ReactNode;
  action: ReactNode;
  owner: boolean;
  label: string;
}) {
  const pathname = usePathname();
  const query = useSearchParams();
  const location = `${pathname}?${query}`;
  const [openedAt, setOpenedAt] = useState<string | null>(null);
  const expanded = openedAt === location;
  const controlsId = useId();
  const toggle = useRef<HTMLButtonElement>(null);
  const reading =
    pathname.startsWith("/articles/") && pathname !== "/articles/new" && query.get("edit") !== "1";
  return (
    <header className="site-shell" hidden={reading}>
      {pathname === "/" ? identity : null}
      <div
        className="site-actions"
        onKeyDown={(event) => {
          if (event.key === "Escape" && expanded) {
            setOpenedAt(null);
            toggle.current?.focus();
          }
        }}
      >
        <div className="site-extra-actions" hidden={!owner || !expanded} id={controlsId}>
          {discovery}
          {action}
          <div className="site-controls">{controls}</div>
        </div>
        {owner ? (
          <Button
            className="site-expander"
            ref={toggle}
            size="icon-sm"
            variant="ghost"
            aria-label={label}

            aria-expanded={expanded}
            aria-controls={controlsId}
            onClick={() => setOpenedAt(expanded ? null : location)}
          >
            <ChevronLeft aria-hidden="true" />
          </Button>
        ) : null}
        {preferences}
      </div>
    </header>
  );
}
