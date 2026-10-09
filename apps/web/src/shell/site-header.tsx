import { Button } from "@my-knowledge/ui/components/button";
import { ChevronLeft } from "@my-knowledge/ui/icons";
import { useLocation, useRouterState } from "@tanstack/react-router";
import { useId, useRef, useState, type ReactNode } from "react";

import { authClient } from "@/auth/client";

export function SiteHeader({
  controls,
  preferences,
  discovery,
  identity,
  action,
  label,
}: {
  controls: ReactNode;
  preferences: ReactNode;
  discovery: ReactNode;
  identity: ReactNode;
  action: ReactNode;
  label: string;
}) {
  const { data: session, isPending } = authClient.useSession();
  const owner = !isPending && Boolean(session);
  const { pathname, searchStr } = useLocation();
  const renderedPathname = useRouterState({
    select: (state) => (state.matches.at(-1) ?? state.location).pathname,
  });
  const location = `${pathname}${searchStr}`;
  const [openedAt, setOpenedAt] = useState<string | null>(null);
  const expanded = openedAt === location;
  const controlsId = useId();
  const toggle = useRef<HTMLButtonElement>(null);
  const articlePage =
    renderedPathname.startsWith("/articles/") && renderedPathname !== "/articles/new";
  return (
    <header className="site-shell" hidden={articlePage}>
      {renderedPathname === "/" ? identity : null}
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
