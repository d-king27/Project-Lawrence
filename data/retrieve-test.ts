import { config } from "dotenv";

import { embedText } from "../src/lib/rules/embeddings";
import { queryRuleChunks } from "../src/lib/rules/vectra";

config({ path: ".env.local" });
config();

const query = process.argv.slice(2).join(" ").trim();
const localVectorIndexDir = process.env.LOCAL_VECTOR_INDEX_DIR?.trim() || "data/vector-index";
const embeddingModel = process.env.OPENAI_EMBEDDING_MODEL?.trim() || "text-embedding-3-small";
const topK = Number(process.env.RETRIEVAL_TOP_K ?? 5);

if (!query) {
  throw new Error('Pass a query, for example: npm run retrieve:test -- "Can a unit charge after advancing?"');
}

const vector = await embedText({ text: query, model: embeddingModel });
const results = await queryRuleChunks({
  indexDir: localVectorIndexDir,
  vector,
  topK,
});

if (results.length === 0) {
  console.log("No results found.");
} else {
  for (const [index, result] of results.entries()) {
    const metadata = result.item.metadata;
    const preview = metadata.text.replace(/\s+/g, " ").slice(0, 600);
    console.log(`\n#${index + 1} score=${result.score.toFixed(4)} ${metadata.chunkId}`);
    console.log(`${metadata.title} | chunk ${metadata.chunkIndex + 1}`);
    console.log(preview);
  }
}
