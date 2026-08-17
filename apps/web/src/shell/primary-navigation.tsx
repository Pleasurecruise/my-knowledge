"use client";

import { buttonVariants } from "@my-knowledge/ui/components/button";
import { House, Library, Network } from "@my-knowledge/ui/icons";
import Link from "next/link";
import { usePathname } from "next/navigation";

import type { InterfaceMessages } from "@/i18n/registry";

export function PrimaryNavigation({ messages }: { messages: InterfaceMessages["shell"] }) {
  const pathname = usePathname();
  const articlesActive = pathname.startsWith("/articles");
  const graphActive = pathname === "/graph";

  return (
    <nav aria-label={messages.navigation} className="flex items-center gap-1">
      <Link
        aria-current={pathname === "/" ? "page" : undefined}
        className={buttonVariants({
          size: "sm",
          variant: pathname === "/" ? "secondary" : "ghost",
        })}
        href="/"
      >
        <House data-icon="inline-start" />
        {messages.home}
      </Link>
      <Link
        aria-current={articlesActive ? "page" : undefined}
        className={buttonVariants({
          size: "sm",
          variant: articlesActive ? "secondary" : "ghost",
        })}
        href="/articles"
      >
        <Library data-icon="inline-start" />
        {messages.articles}
      </Link>
      <Link
        aria-current={graphActive ? "page" : undefined}
        className={buttonVariants({
          size: "sm",
          variant: graphActive ? "secondary" : "ghost",
        })}
        href="/graph"
      >
        <Network data-icon="inline-start" />
        {messages.graph}
      </Link>
    </nav>
  );
}
