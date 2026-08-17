import { z } from "zod";

const modelBindingsSchema = z.object({
  CF_ACCOUNT_ID: z.string().min(1),
  CF_AIG_TOKEN: z.string().min(1),
});

export function modelConfig(env: CloudflareEnv) {
  const bindings = modelBindingsSchema.parse(env);
  return { accountId: bindings.CF_ACCOUNT_ID, token: bindings.CF_AIG_TOKEN };
}
