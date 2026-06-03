const DEFAULT_OPENAI_MODEL = "gpt-5.1-mini";
const DEFAULT_ANTHROPIC_MODEL = "claude-sonnet-4-6";
const DEFAULT_OPENAI_EMBEDDING_MODEL = "text-embedding-3-small";
const DEFAULT_AI_GATEWAY_MODEL = "anthropic/claude-sonnet-4-6";

function readEnv(name: string) {
  const value = process.env[name]?.trim();
  return value && value.length > 0 ? value : undefined;
}

export const env = {
  anthropicApiKey: readEnv("ANTHROPIC_API_KEY"),
  anthropicModel: readEnv("ANTHROPIC_MODEL") ?? DEFAULT_ANTHROPIC_MODEL,
  openaiApiKey: readEnv("OPENAI_API_KEY"),
  openaiModel: readEnv("OPENAI_MODEL") ?? DEFAULT_OPENAI_MODEL,
  openaiEmbeddingModel: readEnv("OPENAI_EMBEDDING_MODEL") ?? DEFAULT_OPENAI_EMBEDDING_MODEL,
  aiGatewayApiKey: readEnv("AI_GATEWAY_API_KEY"),
  aiGatewayModel: readEnv("AI_GATEWAY_MODEL") ?? DEFAULT_AI_GATEWAY_MODEL,
  llamaCloudApiKey: readEnv("LLAMA_CLOUD_API_KEY"),
  coreRulesPdfUrl: readEnv("CORE_RULES_PDF_URL"),
  rulesDownloadDir: readEnv("RULES_DOWNLOAD_DIR") ?? "data/raw-rules",
  rulesPdfPath: readEnv("RULES_PDF_PATH"),
  parsedRulesOutputDir: readEnv("PARSED_RULES_OUTPUT_DIR") ?? "data/parsed-rules",
  localVectorIndexDir: readEnv("LOCAL_VECTOR_INDEX_DIR") ?? "data/vector-index",
  chunkTargetTokens: Number(readEnv("CHUNK_TARGET_TOKENS") ?? 600),
  chunkOverlapTokens: Number(readEnv("CHUNK_OVERLAP_TOKENS") ?? 100),
  pineconeApiKey: readEnv("PINECONE_API_KEY"),
  pineconeIndex: readEnv("PINECONE_INDEX") ?? "project-lawrence-rules",
  pineconeCloud: readEnv("PINECONE_CLOUD") ?? "aws",
  pineconeRegion: readEnv("PINECONE_REGION") ?? "us-east-1",
  cohereApiKey: readEnv("COHERE_API_KEY"),
  confidentApiKey: readEnv("CONFIDENT_API_KEY"),
};

export function getMissingChatEnv() {
  if (env.anthropicApiKey || env.aiGatewayApiKey) {
    return [];
  }

  return ["ANTHROPIC_API_KEY or AI_GATEWAY_API_KEY"];
}

export function getMissingIngestionEnv() {
  return [
    ["LLAMA_CLOUD_API_KEY", env.llamaCloudApiKey],
    ["CORE_RULES_PDF_URL", env.coreRulesPdfUrl],
  ]
    .filter(([, value]) => !value)
    .map(([name]) => name);
}

export function getMissingRetrievalEnv() {
  return [
    ["PINECONE_API_KEY", env.pineconeApiKey],
    ["PINECONE_INDEX", env.pineconeIndex],
    ["COHERE_API_KEY", env.cohereApiKey],
  ]
    .filter(([, value]) => !value)
    .map(([name]) => name);
}
