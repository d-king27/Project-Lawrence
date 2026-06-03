import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import { config } from "dotenv";
import pdfParse from "pdf-parse";

import { createRuleChunks } from "../src/lib/rules/chunker";
import { embedTexts } from "../src/lib/rules/embeddings";
import { insertRuleChunks } from "../src/lib/rules/vectra";
import type { ChunkManifest, RulesIngestManifest } from "../src/lib/rules/types";

config({ path: ".env.local" });
config();

const rulesDownloadDir = process.env.RULES_DOWNLOAD_DIR?.trim() || "data/raw-rules";
const parsedRulesOutputDir = process.env.PARSED_RULES_OUTPUT_DIR?.trim() || "data/parsed-rules";
const localVectorIndexDir = process.env.LOCAL_VECTOR_INDEX_DIR?.trim() || "data/vector-index";
const embeddingModel = process.env.OPENAI_EMBEDDING_MODEL?.trim() || "text-embedding-3-small";
const chunkTargetTokens = Number(process.env.CHUNK_TARGET_TOKENS ?? 600);
const chunkOverlapTokens = Number(process.env.CHUNK_OVERLAP_TOKENS ?? 100);
const manifestPath = path.join(rulesDownloadDir, "manifest.json");

if (!Number.isFinite(chunkTargetTokens) || chunkTargetTokens <= 0) {
  throw new Error("CHUNK_TARGET_TOKENS must be a positive number.");
}

if (!Number.isFinite(chunkOverlapTokens) || chunkOverlapTokens < 0) {
  throw new Error("CHUNK_OVERLAP_TOKENS must be zero or a positive number.");
}

if (chunkOverlapTokens >= chunkTargetTokens) {
  throw new Error("CHUNK_OVERLAP_TOKENS must be smaller than CHUNK_TARGET_TOKENS.");
}

const manifest = JSON.parse(await readFile(manifestPath, "utf8")) as RulesIngestManifest;
const document = manifest.documents.find((item) => item.id === "core-rules") ?? manifest.documents[0];

if (!document) {
  throw new Error(`No documents found in ${manifestPath}. Run npm run ingest first.`);
}

const pdfPath = path.resolve(document.localPath);
const pdfBuffer = await readFile(pdfPath);
const parsedPdf = await pdfParse(pdfBuffer);
const chunks = createRuleChunks(parsedPdf.text, document, {
  targetTokens: chunkTargetTokens,
  overlapTokens: chunkOverlapTokens,
});

if (chunks.length === 0) {
  throw new Error(`No text chunks were created from ${pdfPath}.`);
}

console.log(`Extracted ${parsedPdf.numpages} pages from ${document.title}`);
console.log(`Created ${chunks.length} chunks. Embedding with ${embeddingModel}...`);

const embeddings = await embedTexts({
  texts: chunks.map((chunk) => chunk.text),
  model: embeddingModel,
});

await insertRuleChunks({
  indexDir: localVectorIndexDir,
  chunks,
  embeddings,
});

await mkdir(parsedRulesOutputDir, { recursive: true });

const chunkManifest: ChunkManifest = {
  builtAt: new Date().toISOString(),
  embeddingModel,
  chunkTargetTokens,
  chunkOverlapTokens,
  sourceManifestPath: manifestPath.replaceAll("\\", "/"),
  chunkCount: chunks.length,
  chunks,
};

const chunkManifestPath = path.join(parsedRulesOutputDir, "core-rules.chunks.json");
await writeFile(chunkManifestPath, `${JSON.stringify(chunkManifest, null, 2)}\n`);

console.log(`Saved local vector index to ${localVectorIndexDir}`);
console.log(`Saved chunk manifest to ${chunkManifestPath.replaceAll("\\", "/")}`);
