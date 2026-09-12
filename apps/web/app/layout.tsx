import { ReadingTrail } from "@/articles/components/reading-trail";
import { SiteHeader } from "@/shell/site-header";
import { getCloudflareContext } from "@opennextjs/cloudflare";
import { TooltipProvider } from "@my-knowledge/ui/components/tooltip";
import { themeStorageKey } from "@my-knowledge/ui/lib/theme";
import type { Metadata } from "next";
import Image from "next/image";
import { IntentLink as Link } from "@/shell/intent-link";

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
  const [i18n, { env }] = await Promise.all([
    getInterfaceI18n(),
    getCloudflareContext({ async: true }),
  ]);

  return (
    <html data-scroll-behavior="smooth" lang={i18n.code} suppressHydrationWarning>
      <head>
        <link href="/fonts/fonts.css" rel="stylesheet" />
        <link href="/rss.xml" rel="alternate" title="my knowledge RSS" type="application/rss+xml" />
        <script
          dangerouslySetInnerHTML={{
            __html: `const storedTheme=localStorage.getItem(${JSON.stringify(themeStorageKey)});const theme=storedTheme==="light"||storedTheme==="dark"?storedTheme:matchMedia("(prefers-color-scheme: dark)").matches?"dark":"light";document.documentElement.classList.toggle("dark",theme==="dark");document.documentElement.dataset.theme=theme;`,
          }}
        />
      </head>
      <body>
        <ReadingTrail>
          <TooltipProvider>
            <SiteHeader
              controls={
                <>
                  <LanguageAction />
                  <ApiKeyAction messages={i18n.messages.shell} />
                  <ThemeAction messages={i18n.messages.shell} />
                  <AuthAction
                    googleClientId={env.GOOGLE_CLIENT_ID}
                    messages={i18n.messages.shell}
                  />
                </>
              }
            >
              <Link className="group mr-auto flex min-w-0 items-center gap-3" href="/">
                <span className="border-border relative size-7 shrink-0 overflow-hidden rounded-md border">
                  <Image
                    alt=""
                    className="scale-125 object-cover object-[56%_44%]"
                    fill
                    priority
                    sizes="28px"
                    src="/logo.png"
                  />
                </span>
                <span className="min-w-0">
                  <span className="font-serif block truncate text-xl leading-none font-normal">
                    my knowledge
                  </span>
                  <span className="text-muted-foreground mt-1 hidden text-xs sm:block">
                    {i18n.messages.shell.subtitle}
                  </span>
                </span>
              </Link>
              <div className="site-navigation">
                <PrimaryNavigation messages={i18n.messages.shell} />
              </div>
            </SiteHeader>
            <main>{children}</main>
          </TooltipProvider>
        </ReadingTrail>
      </body>
    </html>
  );
}
