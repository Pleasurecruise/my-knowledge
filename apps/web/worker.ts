import openNextWorker from "./.open-next/worker.js";

export { ApiKeyDurableObject } from "./src/auth/api-key-object";

export default { fetch: openNextWorker.fetch } satisfies ExportedHandler<CloudflareEnv>;
