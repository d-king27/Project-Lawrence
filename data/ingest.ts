import { createHash } from "node:crypto";
import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";
import { config } from "dotenv";

config({ path: ".env.local" });
config();

const coreRulesPdfUrl = process.env.CORE_RULES_PDF_URL?.trim();
const rulesDownloadDir = process.env.RULES_DOWNLOAD_DIR?.trim() || "data/raw-rules";
const outputFileName = "core-rules.pdf";

if (!coreRulesPdfUrl) {
  throw new Error("Set CORE_RULES_PDF_URL in .env.local before running ingestion.");
}

const response = await fetch(coreRulesPdfUrl);

if (!response.ok) {
  throw new Error(`Failed to download Core Rules PDF: ${response.status} ${response.statusText}`);
}

const contentType = response.headers.get("content-type") ?? "";
const pdfBytes = Buffer.from(await response.arrayBuffer());

if (!pdfBytes.subarray(0, 4).equals(Buffer.from("%PDF"))) {
  throw new Error(`Downloaded file does not look like a PDF. Content type: ${contentType || "unknown"}`);
}
const sha256 = createHash("sha256").update(pdfBytes).digest("hex");
const absoluteDownloadDir = path.resolve(rulesDownloadDir);
const absolutePdfPath = path.join(absoluteDownloadDir, outputFileName);
const relativePdfPath = path.relative(process.cwd(), absolutePdfPath).replaceAll("\\", "/");
const manifestPath = path.join(absoluteDownloadDir, "manifest.json");

await mkdir(absoluteDownloadDir, { recursive: true });
await writeFile(absolutePdfPath, pdfBytes);

const manifest = {
  ingestedAt: new Date().toISOString(),
  documents: [
    {
      id: "core-rules",
      title: "Warhammer 40,000 Core Rules",
      sourceUrl: coreRulesPdfUrl,
      localPath: relativePdfPath,
      sha256,
      bytes: pdfBytes.byteLength,
      contentType,
    },
  ],
};

await writeFile(manifestPath, `${JSON.stringify(manifest, null, 2)}\n`);

console.log(`Downloaded Core Rules PDF to ${relativePdfPath}`);
console.log(`SHA-256: ${sha256}`);
console.log(`Manifest written to ${path.relative(process.cwd(), manifestPath).replaceAll("\\", "/")}`);
