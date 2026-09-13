"use client";

import { Search, Library } from "@my-knowledge/ui/icons";
import { IntentLink as Link } from "./intent-link";
import { usePathname } from "next/navigation";

import type { InterfaceMessages } from "@/i18n/registry";

export function PrimaryNavigation({ messages }: { messages: InterfaceMessages["shell"] }) {
  const pathname = usePathname();
  const articlesActive = pathname === "/" || pathname.startsWith("/articles");

  return (
    <nav aria-label={messages.navigation} className="primary-navigation">
      <Link
        aria-current={articlesActive ? "page" : undefined}
        className="primary-navigation-link"
        href="/"
      >
        <Library data-icon="inline-start" />
        <span className="sr-only">{messages.articles}</span>
      </Link>
      <Link
        aria-current={pathname === "/explore" ? "page" : undefined}
        className="primary-navigation-link"
        href="/explore"
      >
        <Search data-icon="inline-start" />
        <span className="sr-only">{messages.explore}</span>
      </Link>
    </nav>
  );
}
