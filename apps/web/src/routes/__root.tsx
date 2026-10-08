import { buttonVariants } from "@my-knowledge/ui/components/button";
import { Toaster } from "@my-knowledge/ui/components/toast";
import { Plus } from "@my-knowledge/ui/icons";
import { themeStorageKey } from "@my-knowledge/ui/lib/theme";
import {
  createRootRoute,
  HeadContent,
  Link,
  Outlet,
  Scripts,
  useLoaderData,
} from "@tanstack/react-router";
import { createServerFn } from "@tanstack/react-start";
import { env } from "cloudflare:workers";
import type { ReactNode } from "react";

import { ReadingTrail } from "@/articles/components/reading-trail";
import { ApiKeyAction } from "@/auth/components/api-key-action";
import { AuthAction } from "@/auth/components/auth-action";
import { LanguageAction } from "@/i18n/components/language-action";
import { getInterfaceI18n } from "@/i18n/server";
import { useInterfaceI18n } from "@/i18n/client";
import { ErrorPage } from "@/shell/error";
import { NotFound } from "@/shell/not-found";
import { PrimaryNavigation } from "@/shell/primary-navigation";
import { SiteHeader } from "@/shell/site-header";
import { siteAuthor, siteDescription, siteName } from "@/shell/site";
import { ThemeAction } from "@/theme/components/theme-action";
import appStyles from "@/styles/globals.css?url";

const getShell = createServerFn({ method: "GET" }).handler(() => ({
  locale: getInterfaceI18n().code,
  googleClientId: env.GOOGLE_CLIENT_ID,
  origin: new URL(env.BETTER_AUTH_URL).origin,
}));

export const Route = createRootRoute({
  loader: () => getShell(),
  staleTime: Infinity,
  head: () => ({
    meta: [
      { charSet: "utf-8" },
      { name: "viewport", content: "width=device-width, initial-scale=1" },
      { title: siteName },
      { name: "description", content: siteDescription },
    ],
    links: [
      { rel: "icon", href: "/logo.png?v=avatar" },
      { rel: "apple-touch-icon", href: "/logo.png?v=avatar" },
      { href: "/rss.xml", rel: "alternate", title: `${siteName} RSS`, type: "application/rss+xml" },
      { href: "/fonts/fonts.css", rel: "stylesheet" },
      { href: appStyles, rel: "stylesheet" },
    ],
  }),
  shellComponent: RootDocument,
  component: Outlet,
  notFoundComponent: NotFound,
  errorComponent: ErrorPage,
});

function RootDocument({ children }: { children: ReactNode }) {
  const { googleClientId } = useLoaderData({ from: "__root__" });
  const i18n = useInterfaceI18n();

  return (
    <html lang={i18n.code} suppressHydrationWarning>
      <head>
        <HeadContent />
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
                <img
                  alt=""
                  decoding="async"
                  fetchPriority="high"
                  height={44}
                  src="/logo.png"
                  width={44}
                />
                <span>{siteAuthor}</span>
              </div>
            }
            action={
              <Link
                to="/articles/new"
                aria-label={i18n.messages.articles.newArticle}
                className={buttonVariants({ size: "icon-sm", variant: "ghost" })}
              >
                <Plus aria-hidden="true" />
              </Link>
            }
            controls={
              <>
                <ApiKeyAction messages={i18n.messages.shell} />
                <AuthAction googleClientId={googleClientId} messages={i18n.messages.shell} />
              </>
            }
          />
          <main>{children}</main>
        </ReadingTrail>
        <Toaster />
        <Scripts />
      </body>
    </html>
  );
}
