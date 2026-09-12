"use client";

import { Avatar, AvatarFallback, AvatarImage } from "@my-knowledge/ui/components/avatar";
import { Button } from "@my-knowledge/ui/components/button";
import {
  Popover,
  PopoverContent,
  PopoverDescription,
  PopoverHeader,
  PopoverTitle,
  PopoverTrigger,
} from "@my-knowledge/ui/components/popover";
import { LogOut } from "@my-knowledge/ui/icons";
import { createAuthClient } from "better-auth/react";
import { oneTapClient } from "better-auth/client/plugins";
import { useEffect, useMemo, useState } from "react";
import { createPortal } from "react-dom";

import { authClient } from "@/auth/client";
import type { InterfaceMessages } from "@/i18n/registry";

export function AuthAction({
  messages,
  googleClientId,
}: {
  messages: InterfaceMessages["shell"];
  googleClientId: string;
}) {
  const oneTapAuth = useMemo(
    () =>
      createAuthClient({
        plugins: [oneTapClient({ clientId: googleClientId, promptOptions: { maxAttempts: 0 } })],
      }),
    [googleClientId],
  );
  const { data: session, isPending } = authClient.useSession();
  const [error, setError] = useState<string>();

  useEffect(() => {
    if (!error) return;
    const timeout = window.setTimeout(() => setError(undefined), 5000);
    return () => window.clearTimeout(timeout);
  }, [error]);

  useEffect(() => {
    if (isPending || session) return;
    const prompt = () => {
      if (
        document.visibilityState !== "visible" ||
        document.documentElement.dataset.oneTapRequested
      )
        return;
      document.documentElement.dataset.oneTapRequested = "true";
      void oneTapAuth
        .oneTap({
          autoSelect: true,
          callbackURL: window.location.pathname + window.location.search,
          fetchOptions: {
            onError: ({ error }) =>
              setError(`${messages.signInFailed} (${error.status}: ${error.message})`),
          },
          onPromptNotification: (notification?: {
            isNotDisplayed?: () => boolean;
            isSkippedMoment?: () => boolean;
          }) => {
            if (notification?.isNotDisplayed?.() || notification?.isSkippedMoment?.())
              setError(messages.signInUnavailable);
          },
        })
        .catch((failure: unknown) => {
          if (failure instanceof DOMException && failure.name === "AbortError") return;
          setError(messages.signInFailed);
        });
    };
    document.addEventListener("visibilitychange", prompt);
    prompt();
    return () => document.removeEventListener("visibilitychange", prompt);
  }, [isPending, session, oneTapAuth, messages.signInFailed, messages.signInUnavailable]);

  async function signOut() {
    setError(undefined);
    const response = await oneTapAuth.signOut();
    if (response.error) {
      setError(messages.signOutFailed);
      return;
    }
    window.location.assign("/");
  }

  if (isPending || !session)
    return error
      ? createPortal(
          <div className="auth-toast" role="alert">
            {error}
          </div>,
          document.body,
        )
      : null;

  return (
    <Popover>
      <PopoverTrigger
        render={
          <Button
            aria-label={messages.accountMenu}
            className="rounded-full"
            size="icon-sm"
            variant="ghost"
          />
        }
      >
        <Avatar size="sm">
          {session.user.image ? <AvatarImage alt="" src={session.user.image} /> : null}
          <AvatarFallback>{session.user.name.slice(0, 1).toLocaleUpperCase()}</AvatarFallback>
        </Avatar>
      </PopoverTrigger>
      <PopoverContent align="end" className="account-popover" sideOffset={10}>
        <PopoverHeader className="account-popover-header">
          <PopoverTitle>{session.user.name}</PopoverTitle>
          <PopoverDescription className="max-w-52 truncate">
            {session.user.email}
          </PopoverDescription>
        </PopoverHeader>
        <Button className="w-full" onClick={signOut} size="sm" variant="outline">
          <LogOut data-icon="inline-start" />
          {messages.signOut}
        </Button>
        {error ? (
          <p className="text-destructive text-sm" role="alert">
            {error}
          </p>
        ) : null}
      </PopoverContent>
    </Popover>
  );
}
