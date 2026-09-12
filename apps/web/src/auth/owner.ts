import { getCloudflareContext } from "@opennextjs/cloudflare";
import { getSessionCookie } from "better-auth/cookies";
import { cache } from "react";
import { headers } from "next/headers";

import { authBindingsSchema } from "@/auth/bindings";
import { verifyApiKey } from "@/auth/api-key";
import { createAuth } from "@/auth/server";
import type { Principal } from "@/auth/types";

export const getPrincipal = cache(async (): Promise<Principal> => {
  const requestHeaders = await headers();
  if (!getSessionCookie(requestHeaders)) return "anonymous";
  const { env } = await getCloudflareContext({ async: true });
  const allowedEmail = authBindingsSchema.shape.ALLOWED_EMAIL.parse(env.ALLOWED_EMAIL);
  const auth = await createAuth();
  const session = await auth.api.getSession({ headers: requestHeaders });
  return session?.user.email.toLowerCase() === allowedEmail.toLowerCase() ? "owner" : "anonymous";
});

export async function isOwnerRequest(env: CloudflareEnv, request: Request): Promise<boolean> {
  if (request.headers.has("authorization")) {
    return verifyApiKey(request, env.API_KEY);
  }
  return (await getPrincipal()) === "owner";
}
