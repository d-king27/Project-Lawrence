import { env } from "@/lib/env";
import { embedText } from "./embeddings";
import { formatRuleSourceLocation } from "./source-location";
import { queryRuleChunks, type RuleVectorMetadata } from "./vectra";

export type RetrievedRuleSource = {
  id: string;
  label: string;
  title: string;
  sourceUrl: string;
  chunkIndex: number;
  location: string;
  pageStart: number;
  pageEnd: number;
  paragraphStart: number;
  paragraphEnd: number;
  score: number;
  preview: string;
  text: string;
};

export type RuleRetrievalResult = {
  sources: RetrievedRuleSource[];
  context: string;
  query: string;
  topK: number;
  minScore: number;
  rawResultCount: number;
  error?: string;
};

export async function retrieveRuleContext(question: string): Promise<RuleRetrievalResult> {
  try {
    const vector = await embedText({
      text: question,
      model: env.openaiEmbeddingModel,
    });

    const results = await queryRuleChunks({
      indexDir: env.localVectorIndexDir,
      vector,
      topK: env.retrievalTopK,
    });

    const sources = results
      .filter((result) => result.score >= env.retrievalMinScore)
      .map((result, index) => toRetrievedSource(result.item.metadata, result.score, index + 1));

    return {
      sources,
      context: formatRetrievedContext(sources),
      query: question,
      topK: env.retrievalTopK,
      minScore: env.retrievalMinScore,
      rawResultCount: results.length,
    };
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown retrieval error.";
    return {
      sources: [],
      context: "",
      query: question,
      topK: env.retrievalTopK,
      minScore: env.retrievalMinScore,
      rawResultCount: 0,
      error: message,
    };
  }
}

function toRetrievedSource(
  metadata: RuleVectorMetadata,
  score: number,
  sourceNumber: number,
): RetrievedRuleSource {
  const text = String(metadata.text);
  const chunkIndex = Number(metadata.chunkIndex);
  const pageStart = Number(metadata.pageStart ?? 1);
  const pageEnd = Number(metadata.pageEnd ?? pageStart);
  const paragraphStart = Number(metadata.paragraphStart ?? 1);
  const paragraphEnd = Number(metadata.paragraphEnd ?? paragraphStart);

  return {
    id: String(metadata.chunkId),
    label: `S${sourceNumber}`,
    title: String(metadata.title),
    sourceUrl: String(metadata.sourceUrl),
    chunkIndex,
    location: formatRuleSourceLocation(pageStart, pageEnd, paragraphStart, paragraphEnd),
    pageStart,
    pageEnd,
    paragraphStart,
    paragraphEnd,
    score,
    preview: text.replace(/\s+/g, " ").slice(0, 260),
    text,
  };
}

function formatRetrievedContext(sources: RetrievedRuleSource[]) {
  if (sources.length === 0) {
    return "No retrieved rules context was found for this question.";
  }

  return sources
    .map(
      (source) => `[${source.label}]
Document: ${source.title}
Chunk: ${source.id}
Location: ${source.location}
Score: ${source.score.toFixed(4)}
Source URL: ${source.sourceUrl}
Text:
${source.text}`,
    )
    .join("\n\n---\n\n");
}
