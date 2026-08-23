import { DurableObject } from "cloudflare:workers";

import { apiKeyRecordSchema } from "./api-key";

export class ApiKeyDurableObject extends DurableObject<Record<string, never>> {
  constructor(ctx: DurableObjectState, env: Record<string, never>) {
    super(ctx, env);
  }

  async fetch(request: Request): Promise<Response> {
    const url = new URL(request.url);
    if (url.pathname !== "/key") return new Response(null, { status: 404 });

    if (request.method === "GET") {
      const apiKeyRecord = await this.ctx.storage.get("api-key");
      if (!apiKeyRecord) return new Response(null, { status: 404 });
      return Response.json(apiKeyRecordSchema.parse(apiKeyRecord));
    }

    if (request.method === "PUT") {
      const apiKeyRecord = apiKeyRecordSchema.parse(await request.json());
      await this.ctx.storage.put("api-key", apiKeyRecord);
      return new Response(null, { status: 204 });
    }

    return new Response(null, { status: 405, headers: { Allow: "GET, PUT" } });
  }
}
