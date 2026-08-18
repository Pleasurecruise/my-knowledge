import { getCloudflareContext } from "@opennextjs/cloudflare";
import { headers } from "next/headers";

import { authBindingsSchema } from "@/auth/bindings";
import { createAuth } from "@/auth/server";
import type { Principal } from "@/auth/types";

export async function getPrincipal(): Promise<Principal> {
  const [{ env }, requestHeaders] = await Promise.all([
    getCloudflareContext({ async: true }),
    headers(),
  ]);
  const allowedEmail = authBindingsSchema.shape.ALLOWED_EMAIL.parse(env.ALLOWED_EMAIL);
  const auth = await createAuth();
  const session = await auth.api.getSession({ headers: requestHeaders });
  return session?.user.email.toLowerCase() === allowedEmail.toLowerCase() ? "owner" : "anonymous";
}
