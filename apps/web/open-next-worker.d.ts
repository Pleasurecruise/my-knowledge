declare module "*.open-next/worker.js" {
  const worker: { fetch: ExportedHandlerFetchHandler<CloudflareEnv> };
  export default worker;
}
