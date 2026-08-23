"use client";

import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@my-knowledge/ui/components/alert-dialog";
import { Button } from "@my-knowledge/ui/components/button";
import { Tooltip, TooltipContent, TooltipTrigger } from "@my-knowledge/ui/components/tooltip";
import { Copy, RefreshCw, Shield } from "@my-knowledge/ui/icons";
import { useEffect, useState } from "react";
import { z } from "zod";

import { authClient } from "@/auth/client";
import type { InterfaceMessages } from "@/i18n/registry";

const apiKeyStatusSchema = z.discriminatedUnion("configured", [
  z.object({ configured: z.literal(false) }),
  z.object({ configured: z.literal(true), createdAt: z.iso.datetime() }),
]);

const generatedApiKeySchema = z.object({
  apiKey: z.string().regex(/^sk-[A-Za-z0-9_-]{43}$/u),
  createdAt: z.iso.datetime(),
});

export function ApiKeyAction({ messages }: { messages: InterfaceMessages["shell"] }) {
  const { data: session } = authClient.useSession();
  const [configured, setConfigured] = useState(false);
  const [loading, setLoading] = useState(true);
  const [statusFailed, setStatusFailed] = useState(false);
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [keyOpen, setKeyOpen] = useState(false);
  const [apiKey, setApiKey] = useState("");
  const [copied, setCopied] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!session) return;
    const controller = new AbortController();
    fetch("/api/settings/api-key", { signal: controller.signal })
      .then(async (response) => {
        if (!response.ok) throw new Error(`API key status failed with status ${response.status}.`);
        return apiKeyStatusSchema.parse(await response.json());
      })
      .then((status) => setConfigured(status.configured))
      .catch(() => {
        if (!controller.signal.aborted) setStatusFailed(true);
      })
      .finally(() => {
        if (!controller.signal.aborted) setLoading(false);
      });
    return () => controller.abort();
  }, [session]);

  async function generateApiKey(method: "POST" | "PUT") {
    setLoading(true);
    setError(null);
    try {
      const response = await fetch("/api/settings/api-key", { method });
      if (!response.ok)
        throw new Error(`API key generation failed with status ${response.status}.`);
      const generated = generatedApiKeySchema.parse(await response.json());
      setApiKey(generated.apiKey);
      setConfigured(true);
      setCopied(false);
      setConfirmOpen(false);
      setKeyOpen(true);
    } catch {
      setError(messages.apiKeyGenerationFailed);
    } finally {
      setLoading(false);
    }
  }

  async function copyApiKey() {
    try {
      await navigator.clipboard.writeText(apiKey);
      setCopied(true);
      setError(null);
    } catch {
      setError(messages.apiKeyCopyFailed);
    }
  }

  if (!session) return null;

  const actionLabel = configured ? messages.regenerateApiKey : messages.generateApiKey;

  return (
    <>
      <Tooltip>
        <TooltipTrigger
          render={
            <Button
              aria-label={statusFailed ? messages.apiKeyStatusFailed : actionLabel}
              disabled={loading || statusFailed}
              onClick={() => (configured ? setConfirmOpen(true) : void generateApiKey("POST"))}
              size="icon-sm"
              type="button"
              variant="ghost"
            />
          }
        >
          {configured ? <RefreshCw className={loading ? "animate-spin" : ""} /> : <Shield />}
        </TooltipTrigger>
        <TooltipContent>{statusFailed ? messages.apiKeyStatusFailed : actionLabel}</TooltipContent>
      </Tooltip>

      <AlertDialog onOpenChange={setConfirmOpen} open={confirmOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{messages.regenerateApiKeyTitle}</AlertDialogTitle>
            <AlertDialogDescription>{messages.regenerateApiKeyDescription}</AlertDialogDescription>
          </AlertDialogHeader>
          {error ? (
            <p className="text-destructive text-sm" role="alert">
              {error}
            </p>
          ) : null}
          <AlertDialogFooter>
            <AlertDialogCancel disabled={loading}>{messages.cancel}</AlertDialogCancel>
            <AlertDialogAction disabled={loading} onClick={() => void generateApiKey("PUT")}>
              {messages.regenerate}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <AlertDialog
        onOpenChange={(open) => {
          setKeyOpen(open);
          if (!open) {
            setApiKey("");
            setCopied(false);
            setError(null);
          }
        }}
        open={keyOpen}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{messages.apiKeyGeneratedTitle}</AlertDialogTitle>
            <AlertDialogDescription>{messages.apiKeyGeneratedDescription}</AlertDialogDescription>
          </AlertDialogHeader>
          <div className="bg-muted border-border flex items-center gap-2 rounded-md border p-2">
            <code className="min-w-0 flex-1 break-all px-1 font-mono text-xs">{apiKey}</code>
            <Button
              className="shrink-0"
              onClick={() => void copyApiKey()}
              size="sm"
              variant="outline"
            >
              <Copy data-icon="inline-start" />
              {copied ? messages.apiKeyCopied : messages.copyApiKey}
            </Button>
          </div>
          {error ? (
            <p className="text-destructive text-sm" role="alert">
              {error}
            </p>
          ) : null}
          <AlertDialogFooter>
            <AlertDialogCancel variant="default">{messages.done}</AlertDialogCancel>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
