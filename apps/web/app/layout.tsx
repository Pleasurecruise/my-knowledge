import { getCloudflareContext } from "@opennextjs/cloudflare";
import { TooltipProvider } from "@my-knowledge/ui/components/tooltip";
import { themeStorageKey } from "@my-knowledge/ui/lib/theme";
import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";

import { AuthAction } from "@/auth/components/auth-action";
import { ApiKeyAction } from "@/auth/components/api-key-action";
import { LanguageAction } from "@/i18n/components/language-action";
import { getInterfaceI18n } from "@/i18n/server";
import { PrimaryNavigation } from "@/shell/primary-navigation";
import { ThemeAction } from "@/theme/components/theme-action";

import "./globals.css";

export const dynamic = "force-dynamic";

export async function generateMetadata(): Promise<Metadata> {
  const { env } = await getCloudflareContext({ async: true });
  return {
    metadataBase: new URL(env.BETTER_AUTH_URL),
    title: {
      default: "my knowledge",
      template: "%s · my knowledge",
    },
    description: "A private-first multilingual knowledge library.",
    icons: { icon: "/logo.png", apple: "/logo.png" },
  };
}

export default async function RootLayout({ children }: LayoutProps<"/">) {
  const i18n = await getInterfaceI18n();

  return (
    <html data-scroll-behavior="smooth" lang={i18n.code} suppressHydrationWarning>
      <head>
        <link href="/rss.xml" rel="alternate" title="my knowledge RSS" type="application/rss+xml" />
        <script
          dangerouslySetInnerHTML={{
            __html: `const storedTheme=localStorage.getItem(${JSON.stringify(themeStorageKey)});const theme=storedTheme==="light"||storedTheme==="dark"?storedTheme:matchMedia("(prefers-color-scheme: dark)").matches?"dark":"light";document.documentElement.classList.toggle("dark",theme==="dark");document.documentElement.dataset.theme=theme;`,
          }}
        />
      </head>
      <body>
        <TooltipProvider>
          <header className="mx-auto max-w-5xl px-4 pt-8 sm:px-6 sm:pt-12 lg:px-8">
            <div className="border-border flex flex-wrap items-center gap-3 border-b pb-5">
              <Link className="group mr-auto flex min-w-0 items-end gap-3" href="/">
                <span className="border-border relative size-9 shrink-0 overflow-hidden rounded-md border">
                  <Image
                    alt=""
                    className="scale-125 object-cover object-[56%_44%] transition-transform group-hover:scale-[1.32]"
                    fill
                    priority
                    sizes="36px"
                    src="/logo.png"
                  />
                </span>
                <span className="min-w-0">
                  <span className="font-heading block truncate text-xl leading-none font-semibold tracking-[-0.025em]">
                    my knowledge
                  </span>
                  <span className="text-muted-foreground mt-1 hidden text-xs sm:block">
                    {i18n.messages.shell.subtitle}
                  </span>
                </span>
              </Link>
              <div className="order-last w-full sm:order-none sm:w-auto">
                <PrimaryNavigation messages={i18n.messages.shell} />
              </div>
              <div className="flex items-center gap-1">
                <LanguageAction />
                <ApiKeyAction messages={i18n.messages.shell} />
                <ThemeAction messages={i18n.messages.shell} />
                <AuthAction messages={i18n.messages.shell} />
              </div>
            </div>
          </header>
          <main>{children}</main>
        </TooltipProvider>
      </body>
    </html>
  );
}
