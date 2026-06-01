import "dotenv/config";

import fs from "node:fs";
import path from "node:path";
import LlamaCloud from "@llamaindex/llama-cloud";

const rulesPdfPath = process.env.RULES_PDF_PATH;

if (!rulesPdfPath) {
  throw new Error("Set RULES_PDF_PATH to the local Games Workshop PDF you want to parse.");
}

if (!process.env.LLAMA_CLOUD_API_KEY) {
  throw new Error("Set LLAMA_CLOUD_API_KEY in .env.local before running the parser.");
}

const absolutePdfPath = path.resolve(rulesPdfPath);
const client = new LlamaCloud({
  apiKey: process.env.LLAMA_CLOUD_API_KEY,
});

const uploadedFile = await client.files.create({
  file: fs.createReadStream(absolutePdfPath),
  purpose: "parse",
});

const fileId = "id" in uploadedFile ? uploadedFile.id : undefined;

if (!fileId) {
  throw new Error("LlamaCloud upload completed, but no file id was returned.");
}

const parseJob = await client.parsing.create({
  file_id: fileId,
  tier: "agentic",
  version: "latest",
});

console.log(`Uploaded ${absolutePdfPath}`);
console.log(`Started LlamaParse job ${parseJob.id}`);
