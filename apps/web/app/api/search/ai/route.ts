import { getCloudflareContext } from "@opennextjs/cloudflare";
import { z } from "zod";

import { getPrincipal } from "@/auth/owner";
import { getInterfaceI18n } from "@/i18n/server";
import { answerKnowledgeQuestion } from "@/search/application/answer";

const questionSchema = z.object({ query: z.string().trim().min(1).max(2_000) });

export async function POST(request: Request) {
  if ((await getPrincipal()) !== "owner") return new Response(null, { status: 404 });
  const [{ query }, { env }, i18n] = await Promise.all([
    request.json().then((value) => questionSchema.parse(value)),
    getCloudflareContext({ async: true }),
    getInterfaceI18n(),
  ]);
  const answer = await answerKnowledgeQuestion(env, query);
  return Response.json(
    answer.status === "answered"
      ? answer.result
      : { answer: i18n.messages.search.insufficientEvidence, citations: [] },
  );
}
