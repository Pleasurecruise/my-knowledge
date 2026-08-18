import openNextWorker from "./.open-next/worker.js";

import { consumeArticleJob } from "@/article-jobs/consumer";
import type { ArticleJobMessage } from "@/article-jobs";

export default {
  fetch: openNextWorker.fetch,

  async queue(batch, env): Promise<void> {
    for (const message of batch.messages) await consumeArticleJob(env, message);
  },
} satisfies ExportedHandler<CloudflareEnv, ArticleJobMessage>;
