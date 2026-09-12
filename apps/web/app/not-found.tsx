import { buttonVariants } from "@my-knowledge/ui/components/button";
import { ArrowLeft } from "@my-knowledge/ui/icons";
import Link from "next/link";

import { getInterfaceI18n } from "@/i18n/server";

export default async function NotFound() {
  const i18n = await getInterfaceI18n();

  return (
    <div className="page-shell flex min-h-[60svh] items-center">
      <div className="mx-auto w-full max-w-(--article-measure) py-10">
        <p className="font-mono text-[10px] tracking-[0.18em] text-muted-foreground">
          {i18n.messages.notFound.code}
        </p>
        <h1 className="mt-5 text-2xl font-medium tracking-tight sm:text-3xl">
          {i18n.messages.notFound.title}
        </h1>
        <p className="mt-4 max-w-md text-sm leading-7 text-muted-foreground">
          {i18n.messages.notFound.description}
        </p>
        <nav className="mt-8 flex flex-wrap gap-3" aria-label={i18n.messages.notFound.navigation}>
          <Link className={buttonVariants({ variant: "outline" })} href="/">
            <ArrowLeft data-icon="inline-start" />
            {i18n.messages.notFound.home}
          </Link>
        </nav>
      </div>
    </div>
  );
}
