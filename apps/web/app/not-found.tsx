import { buttonVariants } from "@my-knowledge/ui/components/button";
import { ArrowLeft, Library } from "@my-knowledge/ui/icons";
import Image from "next/image";
import Link from "next/link";

import { getInterfaceI18n } from "@/i18n/server";

export default async function NotFound() {
  const i18n = await getInterfaceI18n();

  return (
    <div className="mx-auto max-w-5xl px-4 py-20 sm:px-6 sm:py-28 lg:px-8">
      <div className="max-w-xl border-l pl-6 sm:pl-10">
        <div className="border-border relative mb-8 size-12 overflow-hidden rounded-md border">
          <Image
            alt=""
            className="scale-125 object-cover object-[56%_44%]"
            fill
            sizes="48px"
            src="/logo.png"
          />
        </div>
        <p className="text-muted-foreground font-mono text-xs">{i18n.messages.notFound.code}</p>
        <h1 className="font-heading mt-4 text-xl font-semibold tracking-[-0.015em] sm:text-[1.375rem]">
          {i18n.messages.notFound.title}
        </h1>
        <p className="text-muted-foreground mt-4 max-w-md leading-7">
          {i18n.messages.notFound.description}
        </p>
        <nav className="mt-7 flex flex-wrap gap-x-4" aria-label={i18n.messages.notFound.navigation}>
          <Link className={buttonVariants({ className: "px-0", variant: "link" })} href="/">
            <ArrowLeft data-icon="inline-start" />
            {i18n.messages.notFound.home}
          </Link>
          <Link className={buttonVariants({ className: "px-0", variant: "link" })} href="/articles">
            <Library data-icon="inline-start" />
            {i18n.messages.notFound.articles}
          </Link>
        </nav>
      </div>
    </div>
  );
}
