import { z } from "zod";

const API_KEY_INSTANCE = "my-knowledge-api-key";
const API_KEY_URL = "https://api-key.internal/key";

export const apiKeyRecordSchema = z.object({
  version: z.literal(1),
  digest: z.string().regex(/^[0-9a-f]{64}$/u),
  createdAt: z.iso.datetime(),
});

export interface ApiKeyNamespace {
  getByName(name: string): { fetch(request: Request): Promise<Response> };
}

type ApiKeyStatus = { configured: false } | { configured: true; createdAt: string };

export async function getApiKeyStatus(namespace: ApiKeyNamespace): Promise<ApiKeyStatus> {
  const response = await namespace.getByName(API_KEY_INSTANCE).fetch(new Request(API_KEY_URL));
  if (response.status === 404) return { configured: false };
  if (!response.ok) throw new Error(`API key read failed with status ${response.status}.`);
  const apiKeyRecord = apiKeyRecordSchema.parse(await response.json());
  return { configured: true, createdAt: apiKeyRecord.createdAt };
}

export async function generateApiKey(namespace: ApiKeyNamespace) {
  const random = new Uint8Array(32);
  crypto.getRandomValues(random);
  const encoded = btoa(String.fromCharCode(...random))
    .replaceAll("+", "-")
    .replaceAll("/", "_")
    .replace(/=+$/u, "");
  const apiKey = `sk-${encoded}`;
  const apiKeyRecord: z.infer<typeof apiKeyRecordSchema> = {
    version: 1,
    digest: Array.from(
      new Uint8Array(await crypto.subtle.digest("SHA-256", new TextEncoder().encode(apiKey))),
      (byte) => byte.toString(16).padStart(2, "0"),
    ).join(""),
    createdAt: new Date().toISOString(),
  };
  const response = await namespace.getByName(API_KEY_INSTANCE).fetch(
    new Request(API_KEY_URL, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(apiKeyRecord),
    }),
  );
  if (!response.ok) throw new Error(`API key write failed with status ${response.status}.`);
  return { apiKey, createdAt: apiKeyRecord.createdAt };
}

export async function verifyApiKey(request: Request, namespace: ApiKeyNamespace): Promise<boolean> {
  const authorization = request.headers.get("authorization");
  if (authorization === null) return false;
  if (!authorization.startsWith("Bearer ")) return false;
  const supplied = authorization.slice(7);
  if (!supplied) return false;
  const response = await namespace.getByName(API_KEY_INSTANCE).fetch(new Request(API_KEY_URL));
  if (response.status === 404) return false;
  if (!response.ok) throw new Error(`API key read failed with status ${response.status}.`);
  const apiKeyRecord = apiKeyRecordSchema.parse(await response.json());
  const expectedDigest = apiKeyRecord.digest;

  const suppliedDigest = Array.from(
    new Uint8Array(await crypto.subtle.digest("SHA-256", new TextEncoder().encode(supplied))),
    (byte) => byte.toString(16).padStart(2, "0"),
  ).join("");
  let difference = 0;
  for (let index = 0; index < suppliedDigest.length; index += 1) {
    difference |= suppliedDigest.charCodeAt(index) ^ expectedDigest.charCodeAt(index);
  }
  return difference === 0;
}
