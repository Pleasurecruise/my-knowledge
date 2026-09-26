"use client";

import Link from "next/link";
import { usePathname, useSearchParams } from "next/navigation";
import { useState, type ReactNode, type AriaAttributes } from "react";

export function IntentLink({
  children,
  ...props
}: {
  href: string;
  children: ReactNode;
  className?: string | undefined;
  title?: string | undefined;
  "aria-label"?: string | undefined;
  "aria-current"?: AriaAttributes["aria-current"];
}) {
  const [intent, setIntent] = useState(false);
  const pathname = usePathname();
  const query = useSearchParams();
  const href =
    pathname === "/explore" && /^\/articles\/[^/?#]+$/u.test(props.href)
      ? `${props.href}?${new URLSearchParams({ from: query.size ? `/explore?${query}` : "/explore" })}`
      : props.href;
  return (
    <Link
      {...props}
      href={href}
      prefetch={intent}
      onMouseEnter={() => setIntent(true)}
      onFocus={() => setIntent(true)}
      onTouchStart={() => setIntent(true)}
    >
      {children}
    </Link>
  );
}
