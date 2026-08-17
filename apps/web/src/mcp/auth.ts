import { z } from "zod";

const mcpBindingsSchema = z.object({ MCP_API_KEY: z.string().min(32) });

async function matchesSecret(candidate: string, expected: string): Promise<boolean> {
  const encoder = new TextEncoder();
  const [left, right] = await Promise.all([
    crypto.subtle.digest("SHA-256", encoder.encode(candidate)),
    crypto.subtle.digest("SHA-256", encoder.encode(expected)),
  ]);
  const leftBytes = new Uint8Array(left);
  const rightBytes = new Uint8Array(right);
  let difference = 0;
  for (let index = 0; index < leftBytes.length; index += 1) {
    const leftByte = leftBytes.at(index);
    const rightByte = rightBytes.at(index);
    if (leftByte === undefined || rightByte === undefined) throw new Error("Invalid secret hash");
    difference |= leftByte ^ rightByte;
  }
  return difference === 0;
}

export async function isMcpAuthorized(env: CloudflareEnv, request: Request): Promise<boolean> {
  const { MCP_API_KEY } = mcpBindingsSchema.parse(env);
  const authorization = request.headers.get("authorization");
  const token = authorization?.startsWith("Bearer ") ? authorization.slice(7) : "";
  return matchesSecret(token, MCP_API_KEY);
}
