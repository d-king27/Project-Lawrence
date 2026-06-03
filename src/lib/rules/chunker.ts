import type { IngestedRuleDocument, RuleChunk } from "./types";

type RuleParagraph = {
  text: string;
  pageNumber: number;
  paragraphNumber: number;
};

export type RulePageText = {
  pageNumber: number;
  text: string;
};

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
  return createRuleChunksFromPages([{ pageNumber: 1, text }], document, options);
}

export function createRuleChunksFromPages(
  pages: RulePageText[],
  document: IngestedRuleDocument,
  options: ChunkOptions,
) {
  const paragraphs = splitOversizedParagraphs(
    pages.flatMap((page) =>
      extractParagraphs(page.text).map((text, index) => ({
        text,
        pageNumber: page.pageNumber,
        paragraphNumber: index + 1,
      })),
    ),
    options.targetTokens,
  );
  const chunks: RuleChunk[] = [];
  let current: RuleParagraph[] = [];
  let currentTokens = 0;

  for (const paragraph of paragraphs) {
    const paragraphTokens = estimateTokens(paragraph.text);

    if (current.length > 0 && currentTokens + paragraphTokens > options.targetTokens) {
      chunks.push(toChunk(document, chunks.length, current));
      current = getOverlapParagraphs(current, options.overlapTokens);
      currentTokens = estimateTokens(current.map((item) => item.text).join("\n\n"));
    }

    current.push(paragraph);
    currentTokens += paragraphTokens;
  }

  if (current.length > 0) {
    chunks.push(toChunk(document, chunks.length, current));
  }

  return chunks;
}

function splitOversizedParagraphs(paragraphs: RuleParagraph[], targetTokens: number) {
  const splitParagraphs: RuleParagraph[] = [];

  for (const paragraph of paragraphs) {
    if (estimateTokens(paragraph.text) <= targetTokens) {
      splitParagraphs.push(paragraph);
      continue;
    }

    const sentences = paragraph.text.match(/[^.!?]+[.!?]+|\S+$/g) ?? [paragraph.text];
    let current = "";
    let splitIndex = 0;

    for (const sentence of sentences.map((value) => value.trim()).filter(Boolean)) {
      const candidate = current ? `${current} ${sentence}` : sentence;
      if (estimateTokens(candidate) > targetTokens && current) {
        splitParagraphs.push({
          ...paragraph,
          paragraphNumber: paragraph.paragraphNumber + splitIndex / 100,
          text: current,
        });
        splitIndex += 1;
        current = sentence;
      } else {
        current = candidate;
      }
    }

    if (current) {
      splitParagraphs.push({
        ...paragraph,
        paragraphNumber: paragraph.paragraphNumber + splitIndex / 100,
        text: current,
      });
    }
  }

  return splitParagraphs;
}

function getOverlapParagraphs(paragraphs: RuleParagraph[], overlapTokens: number) {
  const overlap: RuleParagraph[] = [];

  for (let index = paragraphs.length - 1; index >= 0; index -= 1) {
    const candidate = [paragraphs[index], ...overlap];
    if (
      estimateTokens(candidate.map((item) => item.text).join("\n\n")) > overlapTokens &&
      overlap.length > 0
    ) {
      break;
    }

    overlap.unshift(paragraphs[index]);
  }

  return overlap;
}

function toChunk(document: IngestedRuleDocument, chunkIndex: number, paragraphs: RuleParagraph[]): RuleChunk {
  const text = paragraphs.map((paragraph) => paragraph.text).join("\n\n");
  const paddedIndex = String(chunkIndex + 1).padStart(4, "0");
  const first = paragraphs[0];
  const last = paragraphs[paragraphs.length - 1];

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
      pageStart: first.pageNumber,
      pageEnd: last.pageNumber,
      paragraphStart: Math.floor(first.paragraphNumber),
      paragraphEnd: Math.floor(last.paragraphNumber),
      tokenEstimate: estimateTokens(text),
    },
  };
}
