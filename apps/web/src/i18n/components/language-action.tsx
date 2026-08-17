import { Button } from "@my-knowledge/ui/components/button";
import { Languages } from "@my-knowledge/ui/icons";
import { cookies } from "next/headers";

import { interfaceLocales } from "@/i18n/registry";
import { getInterfaceI18n, interfaceLocaleCookie } from "@/i18n/server";

export async function LanguageAction() {
  const current = await getInterfaceI18n();
  const currentIndex = interfaceLocales.findIndex(({ code }) => code === current.code);
  if (currentIndex < 0) throw new Error("Current interface locale is not registered");
  const next = interfaceLocales[(currentIndex + 1) % interfaceLocales.length];
  if (!next) throw new Error("Next interface locale is not registered");

  async function cycleLanguage() {
    "use server";

    const selected = await getInterfaceI18n();
    const selectedIndex = interfaceLocales.findIndex(({ code }) => code === selected.code);
    if (selectedIndex < 0) throw new Error("Current interface locale is not registered");
    const following = interfaceLocales[(selectedIndex + 1) % interfaceLocales.length];
    if (!following) throw new Error("Next interface locale is not registered");
    const cookieStore = await cookies();
    cookieStore.set(interfaceLocaleCookie, following.code, {
      httpOnly: true,
      maxAge: 60 * 60 * 24 * 365,
      sameSite: "lax",
      secure: process.env.NODE_ENV === "production",
    });
  }

  return (
    <form action={cycleLanguage}>
      <Button
        aria-label={`${current.messages.shell.changeLanguage}: ${next.label}`}
        className="px-2"
        size="sm"
        title={next.label}
        type="submit"
        variant="ghost"
      >
        <Languages />
        <span className="text-[0.6875rem] tracking-wide uppercase">
          {current.code.split("-")[0]}
        </span>
      </Button>
    </form>
  );
}
