export type IngestedRuleDocument = {
  id: string;
  title: string;
  sourceUrl: string;
  localPath: string;
  sha256: string;
  bytes: number;
  contentType?: string;
};

export type RulesIngestManifest = {
  ingestedAt: string;
  documents: IngestedRuleDocument[];
};

export type RuleChunkMetadata = {
  documentId: string;
  title: string;
  sourceUrl: string;
  localPath: string;
  sha256: string;
  chunkIndex: number;
  pageStart: number;
  pageEnd: number;
  paragraphStart: number;
  paragraphEnd: number;
  tokenEstimate: number;
};

export type RuleChunk = {
  id: string;
  text: string;
  metadata: RuleChunkMetadata;
};

export type ChunkManifest = {
  builtAt: string;
  embeddingModel: string;
  chunkTargetTokens: number;
  chunkOverlapTokens: number;
  sourceManifestPath: string;
  chunkCount: number;
  chunks: RuleChunk[];
};
