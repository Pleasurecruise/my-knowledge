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
import { LogIn, LogOut, User } from "@my-knowledge/ui/icons";
import { useState } from "react";

import { authClient } from "@/auth/client";
import type { InterfaceMessages } from "@/i18n/registry";

export function AuthAction({ messages }: { messages: InterfaceMessages["shell"] }) {
  const { data: session, isPending } = authClient.useSession();
  const [error, setError] = useState<string>();

  async function signIn() {
    setError(undefined);
    const response = await authClient.signIn.social({
      provider: "google",
      callbackURL: window.location.pathname,
    });
    if (response.error) setError(messages.signInFailed);
  }

  async function signOut() {
    setError(undefined);
    const response = await authClient.signOut();
    if (response.error) {
      setError(messages.signOutFailed);
      return;
    }
    window.location.assign("/");
  }

  if (isPending)
    return (
      <Button aria-label={messages.checkingSession} disabled size="icon-sm" variant="ghost">
        ···
      </Button>
    );

  return (
    <Popover>
      <PopoverTrigger
        render={
          <Button
            aria-label={session ? messages.accountMenu : messages.signInMenu}
            className="rounded-full"
            size="icon-sm"
            variant="ghost"
          />
        }
      >
        {session ? (
          <Avatar size="sm">
            {session.user.image ? <AvatarImage alt="" src={session.user.image} /> : null}
            <AvatarFallback>{session.user.name.slice(0, 1).toLocaleUpperCase()}</AvatarFallback>
          </Avatar>
        ) : (
          <LogIn />
        )}
      </PopoverTrigger>
      <PopoverContent align="end" className="w-64" sideOffset={10}>
        {session ? (
          <>
            <PopoverHeader className="items-center text-center">
              <Avatar size="lg">
                {session.user.image ? <AvatarImage alt="" src={session.user.image} /> : null}
                <AvatarFallback>{session.user.name.slice(0, 1).toLocaleUpperCase()}</AvatarFallback>
              </Avatar>
              <PopoverTitle>{session.user.name}</PopoverTitle>
              <PopoverDescription className="max-w-52 truncate">
                {session.user.email}
              </PopoverDescription>
            </PopoverHeader>
            <Button className="w-full" onClick={signOut} size="sm" variant="outline">
              <LogOut data-icon="inline-start" />
              {messages.signOut}
            </Button>
          </>
        ) : (
          <>
            <PopoverHeader className="items-center text-center">
              <Avatar size="lg">
                <AvatarFallback>
                  <User />
                </AvatarFallback>
              </Avatar>
              <PopoverTitle>{messages.anonymous}</PopoverTitle>
              <PopoverDescription>{messages.signInDescription}</PopoverDescription>
            </PopoverHeader>
            <Button className="w-full" onClick={signIn} size="sm">
              <LogIn data-icon="inline-start" />
              {messages.signIn}
            </Button>
          </>
        )}
        {error ? (
          <p className="text-destructive text-sm" role="alert">
            {error}
          </p>
        ) : null}
      </PopoverContent>
    </Popover>
  );
}
