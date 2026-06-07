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
  const modelProvider = env.anthropicApiKey ? "anthropic" : env.openaiApiKey ? "openai" : "gateway";
  const model =
    modelProvider === "anthropic"
      ? anthropic(env.anthropicModel)
      : modelProvider === "openai"
        ? openai(env.openaiModel)
        : env.aiGatewayModel;
  const providerOptions = getProviderOptions(modelProvider);

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
        maxOutputTokens: env.anthropicMaxOutputTokens,
        temperature: env.anthropicTemperature,
        topP: env.anthropicTopP,
        providerOptions,
      });

      writer.merge(result.toUIMessageStream());
    },
  });

  return createUIMessageStreamResponse({ stream });
}

function getProviderOptions(modelProvider: "anthropic" | "openai" | "gateway") {
  if (!env.anthropicPromptCache) {
    return undefined;
  }

  if (modelProvider === "anthropic") {
    return {
      anthropic: {
        cacheControl: { type: "ephemeral" },
      },
    } as const;
  }

  if (modelProvider === "gateway") {
    return {
      gateway: {
        caching: "auto",
      },
    } as const;
  }

  return undefined;
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
