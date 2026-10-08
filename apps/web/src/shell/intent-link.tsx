import { Link, useLocation } from "@tanstack/react-router";
import type { ReactNode, AriaAttributes } from "react";

export function IntentLink({
  children,
  href: destination,
  ...props
}: {
  href: string;
  children: ReactNode;
  className?: string | undefined;
  title?: string | undefined;
  "aria-label"?: string | undefined;
  "aria-current"?: AriaAttributes["aria-current"];
}) {
  const { pathname, searchStr } = useLocation();
  const href =
    pathname === "/explore" && /^\/articles\/[^/?#]+$/u.test(destination)
      ? `${destination}?${new URLSearchParams({ from: `/explore${searchStr}` })}`
      : destination;
  const url = new URL(href, "https://knowledge.invalid");
  return (
    <Link
      {...props}
      to={url.pathname}
      search={Object.fromEntries(url.searchParams)}
      hash={url.hash.slice(1)}
      preload="intent"
    >
      {children}
    </Link>
  );
}
