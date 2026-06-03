import path from "node:path";
import { LocalIndex } from "vectra";

import type { RuleChunk, RuleChunkMetadata } from "./types";

export type RuleVectorMetadata = Record<string, string | number | boolean> & RuleChunkMetadata & {
  chunkId: string;
  text: string;
};

const localIndexConfig = {
  version: 1,
  metadata_config: {
    indexed: [
      "documentId",
      "title",
      "chunkId",
      "chunkIndex",
      "pageStart",
      "pageEnd",
      "paragraphStart",
      "paragraphEnd",
      "sha256",
    ],
  },
};

export function createLocalRulesIndex(indexDir: string) {
  return new LocalIndex<RuleVectorMetadata>(path.resolve(indexDir));
}

export async function resetLocalRulesIndex(indexDir: string) {
  const index = createLocalRulesIndex(indexDir);

  if (!(await index.isIndexCreated())) {
    await index.createIndex(localIndexConfig);
    return index;
  }

  await index.deleteIndex();
  await index.createIndex(localIndexConfig);
  return index;
}

export async function insertRuleChunks({
  indexDir,
  chunks,
  embeddings,
}: {
  indexDir: string;
  chunks: RuleChunk[];
  embeddings: number[][];
}) {
  if (chunks.length !== embeddings.length) {
    throw new Error(`Chunk count ${chunks.length} did not match embedding count ${embeddings.length}.`);
  }

  const index = await resetLocalRulesIndex(indexDir);

  for (let itemIndex = 0; itemIndex < chunks.length; itemIndex += 1) {
    const chunk = chunks[itemIndex];
    await index.insertItem({
      vector: embeddings[itemIndex],
      metadata: {
        ...chunk.metadata,
        chunkId: chunk.id,
        text: chunk.text,
      } satisfies RuleVectorMetadata,
    });
  }

  return index;
}

export async function queryRuleChunks({
  indexDir,
  vector,
  topK,
}: {
  indexDir: string;
  vector: number[];
  topK: number;
}) {
  const index = createLocalRulesIndex(indexDir);

  if (!(await index.isIndexCreated())) {
    throw new Error(`Local vector index does not exist at ${indexDir}. Run npm run build:index first.`);
  }

  return index.queryItems(vector, "", topK);
}
