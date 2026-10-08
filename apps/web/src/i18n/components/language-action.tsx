import { Button } from "@my-knowledge/ui/components/button";
import { Languages } from "@my-knowledge/ui/icons";
import { useRouter } from "@tanstack/react-router";
import { createServerFn } from "@tanstack/react-start";
import { setCookie } from "@tanstack/react-start/server";

import { interfaceLocales } from "@/i18n/registry";
import { getInterfaceI18n, interfaceLocaleCookie } from "@/i18n/server";
import { useInterfaceI18n } from "@/i18n/client";

const cycleLanguage = createServerFn({ method: "POST" }).handler(() => {
  const selected = getInterfaceI18n();
  const selectedIndex = interfaceLocales.findIndex(({ code }) => code === selected.code);
  if (selectedIndex < 0) throw new Error("Current interface locale is not registered");
  const following = interfaceLocales[(selectedIndex + 1) % interfaceLocales.length];
  if (!following) throw new Error("Next interface locale is not registered");
  setCookie(interfaceLocaleCookie, following.code, {
    httpOnly: true,
    maxAge: 60 * 60 * 24 * 365,
    sameSite: "lax",
    secure: import.meta.env.PROD,
  });
});

export function LanguageAction() {
  const router = useRouter();
  const current = useInterfaceI18n();
  const currentIndex = interfaceLocales.findIndex(({ code }) => code === current.code);
  if (currentIndex < 0) throw new Error("Current interface locale is not registered");
  const next = interfaceLocales[(currentIndex + 1) % interfaceLocales.length];
  if (!next) throw new Error("Next interface locale is not registered");

  return (
    <form
      onSubmit={async (event) => {
        event.preventDefault();
        await cycleLanguage();
        await router.invalidate();
      }}
    >
      <Button
        aria-label={`${current.messages.shell.changeLanguage}: ${next.label}`}
        size="sm"
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
