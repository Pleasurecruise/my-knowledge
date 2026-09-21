import { getCloudflareContext } from "@opennextjs/cloudflare";
import type { Auth, BetterAuthOptions } from "better-auth";
import { betterAuth } from "better-auth/minimal";
import { oneTap } from "better-auth/plugins";
import { drizzleAdapter } from "better-auth/adapters/drizzle";
import { drizzle } from "drizzle-orm/d1";

import { authBindingsSchema } from "@/auth/bindings";
import { authSchema } from "@/db/schema";

async function authBuilder(): Promise<Auth> {
  const { env } = await getCloudflareContext({ async: true });
  const bindings = authBindingsSchema.parse(env);
  const allowedEmail = bindings.ALLOWED_EMAIL.toLowerCase();
  return betterAuth<BetterAuthOptions>({
    plugins: [oneTap()],
    appName: "my knowledge",
    baseURL: bindings.BETTER_AUTH_URL,
    secret: bindings.BETTER_AUTH_SECRET,
    database: drizzleAdapter(drizzle(env.DB, { schema: authSchema }), {
      provider: "sqlite",
      schema: authSchema,
    }),
    socialProviders: {
      google: {
        clientId: bindings.GOOGLE_CLIENT_ID,
        clientSecret: bindings.GOOGLE_CLIENT_SECRET,
      },
    },
    advanced: {
      ipAddress: {
        ipAddressHeaders: ["cf-connecting-ip"],
      },
    },
    databaseHooks: {
      user: {
        create: {
          before: async (newUser) => {
            if (newUser.email.toLowerCase() !== allowedEmail) return false;
            return { data: newUser };
          },
        },
      },
    },
  });
}

let authPromise: Promise<Auth> | null = null;

export function createAuth() {
  if (authPromise === null) {
    authPromise = authBuilder();
  }
  return authPromise;
}
