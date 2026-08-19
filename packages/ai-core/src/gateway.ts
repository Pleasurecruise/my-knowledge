import { z } from "zod";

export const gatewayConfigSchema = z.object({
  accountId: z.string().min(1),
  token: z.string().min(1),
});

export type GatewayConfig = z.input<typeof gatewayConfigSchema>;

export function gatewayEndpoint(configInput: GatewayConfig): string {
  const config = gatewayConfigSchema.parse(configInput);
  return `https://gateway.ai.cloudflare.com/v1/${config.accountId}/default/compat`;
}

export function gatewayHeaders(configInput: GatewayConfig) {
  const config = gatewayConfigSchema.parse(configInput);
  return {
    "content-type": "application/json",
    "cf-aig-authorization": `Bearer ${config.token}`,
    "cf-aig-collect-log-payload": "true",
    "cf-aig-skip-cache": "true",
  };
}
