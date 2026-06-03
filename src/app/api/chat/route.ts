import { anthropic } from "@ai-sdk/anthropic";
import { openai } from "@ai-sdk/openai";
import { convertToModelMessages, streamText, type UIMessage } from "ai";
import { env, getMissingChatEnv } from "@/lib/env";

export const maxDuration = 30;

const systemPrompt = `You are Lawrence, a careful Warhammer rules assistant.

Current build status:
- The chat shell is live.
- The official rules corpus has not been parsed, indexed, or reranked yet.

Rules for answering:
- Be concise and practical.
- Do not invent rules text, page numbers, datasheet text, or FAQs.
- If a question needs the rules corpus, say that the retrieval layer is not connected yet and describe what evidence would be needed.
- Once retrieval is connected, answer only from retrieved context and cite the source metadata.`;

export async function POST(req: Request) {
  const { messages }: { messages: UIMessage[] } = await req.json();
  const missingEnv = getMissingChatEnv();

  if (missingEnv.length > 0) {
    return Response.json(
      {
        error: `Missing chat environment setting: ${missingEnv.join(", ")}`,
      },
      { status: 500 },
    );
  }

  const model = env.anthropicApiKey
    ? anthropic(env.anthropicModel)
    : env.openaiApiKey
      ? openai(env.openaiModel)
      : env.aiGatewayModel;

  const result = streamText({
    model,
    system: systemPrompt,
    messages: await convertToModelMessages(messages),
  });

  return result.toUIMessageStreamResponse();
}
