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
import { retrieveRuleContext } from "@/lib/rules/retrieval";

export const runtime = "nodejs";
export const maxDuration = 30;

const systemPrompt = `You are Servo Skull, a careful Warhammer rules assistant.

Rules for answering:
- Answer only from the retrieved rules context supplied for the latest question.
- Cite rules-backed claims with source labels like [S1] or [S2].
- If the retrieved context does not support an answer, say: "I don't have enough retrieved rules context to answer that reliably."
- Do not invent rules text, page numbers, datasheet text, FAQs, errata, or official rulings.
- Distinguish direct rules from interpretation.
- Be concise and practical.
- Do not print a separate source bibliography. The app renders source cards separately.`;

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

function buildRetrievalPrompt(context: string, error?: string) {
  if (error) {
    return `Retrieval status:
The local rules retrieval layer could not return context.
Error: ${error}

Instruction:
Tell the user that the local rules index is not available yet or needs to be rebuilt. Do not answer the rules question from general knowledge.`;
  }

  return `Retrieved rules context for the latest user question:

${context}`;
}

function buildSourceSummary(retrieval: Awaited<ReturnType<typeof retrieveRuleContext>>) {
  if (retrieval.error) {
    return `Retrieval diagnostics:
- Query: ${retrieval.query}
- Local index: ${env.localVectorIndexDir}
- Embedding model: ${env.openaiEmbeddingModel}
- Error: ${retrieval.error}

When answering, include this diagnostics block under "Retrieval status" so the developer can fix the pipeline.`;
  }

  if (retrieval.sources.length === 0) {
    return `Retrieval diagnostics:
- Query: ${retrieval.query}
- Local index: ${env.localVectorIndexDir}
- Embedding model: ${env.openaiEmbeddingModel}
- Requested top K: ${retrieval.topK}
- Raw results returned: ${retrieval.rawResultCount}
- Minimum score: ${retrieval.minScore}
- Sources after filtering: 0

When answering, include this diagnostics block under "Retrieval status" so the developer can tune retrieval.`;
  }

  const lines = retrieval.sources.map(
    (source) =>
      `- [${source.label}] ${source.title}, ${source.location}, ${source.id}, score ${source.score.toFixed(4)}, preview: ${source.preview}`,
  );

  return `Retrieved source summary:
${lines.join("\n")}`;
}
