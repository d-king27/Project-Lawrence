import { env } from "@/lib/env";
import type { RuleRetrievalResult } from "@/lib/rules/retrieval";

export const systemPrompt = `You are Servo Skull, a careful Warhammer rules assistant.

Rules for answering:
- Answer only from the retrieved rules context supplied for the latest question.
- Cite rules-backed claims with source labels like [S1] or [S2].
- If the retrieved context does not support an answer, say: "I don't have enough retrieved rules context to answer that reliably."
- Do not invent rules text, page numbers, datasheet text, FAQs, errata, or official rulings.
- Distinguish direct rules from interpretation.
- Be concise and practical.
- Do not print a separate source bibliography. The app renders source cards separately.`;

export function buildRetrievalPrompt(context: string, error?: string) {
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

export function buildSourceSummary(retrieval: RuleRetrievalResult) {
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
