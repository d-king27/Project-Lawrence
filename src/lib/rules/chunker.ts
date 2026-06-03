import type { IngestedRuleDocument, RuleChunk } from "./types";

export type ChunkOptions = {
  targetTokens: number;
  overlapTokens: number;
};

export function estimateTokens(text: string) {
  const wordCount = text.trim().split(/\s+/).filter(Boolean).length;
  return Math.max(1, Math.ceil(wordCount * 1.33));
}

export function extractParagraphs(text: string) {
  return text
    .replace(/\r\n?/g, "\n")
    .replace(/-\n(?=\w)/g, "")
    .split(/\n{2,}/)
    .map((block) => block.replace(/\n+/g, " ").replace(/\s+/g, " ").trim())
    .filter((block) => block.length > 0);
}

export function createRuleChunks(
  text: string,
  document: IngestedRuleDocument,
  options: ChunkOptions,
) {
  const paragraphs = splitOversizedParagraphs(extractParagraphs(text), options.targetTokens);
  const chunks: RuleChunk[] = [];
  let current: string[] = [];
  let currentTokens = 0;

  for (const paragraph of paragraphs) {
    const paragraphTokens = estimateTokens(paragraph);

    if (current.length > 0 && currentTokens + paragraphTokens > options.targetTokens) {
      chunks.push(toChunk(document, chunks.length, current));
      current = getOverlapParagraphs(current, options.overlapTokens);
      currentTokens = estimateTokens(current.join("\n\n"));
    }

    current.push(paragraph);
    currentTokens += paragraphTokens;
  }

  if (current.length > 0) {
    chunks.push(toChunk(document, chunks.length, current));
  }

  return chunks;
}

function splitOversizedParagraphs(paragraphs: string[], targetTokens: number) {
  const splitParagraphs: string[] = [];

  for (const paragraph of paragraphs) {
    if (estimateTokens(paragraph) <= targetTokens) {
      splitParagraphs.push(paragraph);
      continue;
    }

    const sentences = paragraph.match(/[^.!?]+[.!?]+|\S+$/g) ?? [paragraph];
    let current = "";

    for (const sentence of sentences.map((value) => value.trim()).filter(Boolean)) {
      const candidate = current ? `${current} ${sentence}` : sentence;
      if (estimateTokens(candidate) > targetTokens && current) {
        splitParagraphs.push(current);
        current = sentence;
      } else {
        current = candidate;
      }
    }

    if (current) {
      splitParagraphs.push(current);
    }
  }

  return splitParagraphs;
}

function getOverlapParagraphs(paragraphs: string[], overlapTokens: number) {
  const overlap: string[] = [];

  for (let index = paragraphs.length - 1; index >= 0; index -= 1) {
    const candidate = [paragraphs[index], ...overlap];
    if (estimateTokens(candidate.join("\n\n")) > overlapTokens && overlap.length > 0) {
      break;
    }

    overlap.unshift(paragraphs[index]);
  }

  return overlap;
}

function toChunk(document: IngestedRuleDocument, chunkIndex: number, paragraphs: string[]): RuleChunk {
  const text = paragraphs.join("\n\n");
  const paddedIndex = String(chunkIndex + 1).padStart(4, "0");

  return {
    id: `${document.id}:chunk:${paddedIndex}`,
    text,
    metadata: {
      documentId: document.id,
      title: document.title,
      sourceUrl: document.sourceUrl,
      localPath: document.localPath,
      sha256: document.sha256,
      chunkIndex,
      tokenEstimate: estimateTokens(text),
    },
  };
}
