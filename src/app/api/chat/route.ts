import { anthropic } from "@ai-sdk/anthropic";
import { openai } from "@ai-sdk/openai";
import {
  convertToModelMessages,
  createUIMessageStream,
  createUIMessageStreamResponse,
  streamText,
  type UIMessage,
} from "ai";
import { env, getMissingChatEnv } from "@/lib/env";
import { buildRetrievalPrompt, buildSourceSummary, systemPrompt } from "@/lib/chat/prompts";
import { retrieveRuleContext } from "@/lib/rules/retrieval";

export const runtime = "nodejs";
export const maxDuration = 30;

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

  const latestQuestion = getLatestUserMessageText(messages);
  const retrieval = latestQuestion
    ? await retrieveRuleContext(latestQuestion)
    : {
        sources: [],
        context: "",
        error: "No latest user question was found.",
      };

  const retrievalPrompt = buildRetrievalPrompt(retrieval.context, retrieval.error);
  const sourceSummary = buildSourceSummary(retrieval);
  const model = env.anthropicApiKey
    ? anthropic(env.anthropicModel)
    : env.openaiApiKey
      ? openai(env.openaiModel)
      : env.aiGatewayModel;

  const modelMessages = await convertToModelMessages(messages);
  const stream = createUIMessageStream({
    execute: ({ writer }) => {
      if (retrieval.sources.length > 0) {
        writer.write({
          type: "data-ruleSources",
          id: "rule-sources",
          data: retrieval.sources.map((source) => ({
            id: source.id,
            label: source.label,
            title: source.title,
            location: source.location,
            sourceUrl: source.sourceUrl,
            score: source.score,
            preview: source.preview,
            fullQuote: source.text,
          })),
        });
      }

      const result = streamText({
        model,
        system: `${systemPrompt}\n\n${retrievalPrompt}\n\n${sourceSummary}`,
        messages: modelMessages,
      });

      writer.merge(result.toUIMessageStream());
    },
  });

  return createUIMessageStreamResponse({ stream });
}

function getLatestUserMessageText(messages: UIMessage[]) {
  for (let index = messages.length - 1; index >= 0; index -= 1) {
    const message = messages[index];
    if (message.role !== "user") {
      continue;
    }

    return message.parts
      .map((part) => (part.type === "text" ? part.text : ""))
      .join("\n")
      .trim();
  }

  return "";
}
