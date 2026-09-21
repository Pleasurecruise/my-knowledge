import { Toaster } from "@my-knowledge/ui/components/toast";
import Image from "next/image";
import Link from "next/link";
import { Plus } from "@my-knowledge/ui/icons";
import { buttonVariants } from "@my-knowledge/ui/components/button";
import { ReadingTrail } from "@/articles/components/reading-trail";
import { SiteHeader } from "@/shell/site-header";
import { getCloudflareContext } from "@opennextjs/cloudflare";
import { themeStorageKey } from "@my-knowledge/ui/lib/theme";
import type { Metadata } from "next";

import { AuthAction } from "@/auth/components/auth-action";
import { ApiKeyAction } from "@/auth/components/api-key-action";
import { LanguageAction } from "@/i18n/components/language-action";
import { getInterfaceI18n } from "@/i18n/server";
import { PrimaryNavigation } from "@/shell/primary-navigation";
import { ThemeAction } from "@/theme/components/theme-action";

import "./globals.css";

export async function generateMetadata(): Promise<Metadata> {
  const { env } = await getCloudflareContext({ async: true });
  return {
    metadataBase: new URL(env.BETTER_AUTH_URL),
    title: {
      default: "my knowledge",
      template: "%s · my knowledge",
    },
    description: "A private-first multilingual knowledge library.",
    icons: { icon: "/logo.png?v=avatar", apple: "/logo.png?v=avatar" },
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
          <SiteHeader
            label={i18n.messages.shell.moreActions}
            preferences={
              <div className="site-preferences">
                <LanguageAction />
                <ThemeAction messages={i18n.messages.shell} />
              </div>
            }
            discovery={<PrimaryNavigation messages={i18n.messages.shell} />}
            identity={
              <div className="site-identity">
                <Image alt="" src="/logo.png" width={44} height={44} priority />
                <span>Pleasure1234</span>
              </div>
            }
            action={
              <Link
                href="/articles/new"
                aria-label={i18n.messages.articles.newArticle}
                className={buttonVariants({ size: "icon-sm", variant: "ghost" })}
              >
                <Plus aria-hidden="true" />
              </Link>
            }
            controls={
              <>
                <ApiKeyAction messages={i18n.messages.shell} />
                <AuthAction googleClientId={env.GOOGLE_CLIENT_ID} messages={i18n.messages.shell} />
              </>
            }
          />
          <main>{children}</main>
        </ReadingTrail>
        <Toaster />
      </body>
    </html>
  );
}
