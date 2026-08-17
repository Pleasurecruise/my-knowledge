import { z } from "zod";

export const authBindingsSchema = z.object({
  ALLOWED_EMAIL: z.email(),
  BETTER_AUTH_SECRET: z.string().min(32),
  BETTER_AUTH_URL: z.url(),
  GOOGLE_CLIENT_ID: z.string().min(1),
  GOOGLE_CLIENT_SECRET: z.string().min(1),
});
