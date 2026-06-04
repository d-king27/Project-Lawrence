# Project-Lawrence
warhammer 11th ed llm
Codex workspace check: I am in `C:\Users\Dan\Documents\Codex\Project-Lawrence` and ready to work on Project-Lawrence with Dan.

# Project Servo Skull

Project Servo Skull is a rules-grounded Warhammer assistant intended to demonstrate a reliable LLM workflow: parse official rules documents, index them, retrieve and rerank relevant passages, stream cited answers, and regression-test answer quality.

## Current Base

- Next.js App Router project shell in `src/app`
- Streaming chat endpoint at `src/app/api/chat/route.ts`
- Grimdark rules console UI at `src/app/page.tsx`
- LlamaParse starter script at `scripts/parse-rules.ts`
- Environment placeholders in `.env.local` and `.env.example`

## Planned Stack

- Next.js + Vercel AI SDK for streaming chat
- LlamaParse for table-preserving PDF to Markdown conversion
- Pinecone Serverless for filtered hybrid retrieval
- Cohere Rerank before model context insertion
- DeepEval for regression tests against rules-answer quality

## Local Setup

```bash
npm install
npm run dev
```

## Environment Setup

Copy `.env.example` into `.env.local` and fill in the services you are actively using.

Chat needs one of:

- `ANTHROPIC_API_KEY` with `ANTHROPIC_MODEL`
- `AI_GATEWAY_API_KEY` with `AI_GATEWAY_MODEL`

Embeddings need:

- `OPENAI_API_KEY`
- `OPENAI_EMBEDDING_MODEL`
- `LOCAL_VECTOR_INDEX_DIR`
- `CHUNK_TARGET_TOKENS`
- `CHUNK_OVERLAP_TOKENS`

Rules ingestion needs:

- `LLAMA_CLOUD_API_KEY`
- `CORE_RULES_PDF_URL`
- `RULES_DOWNLOAD_DIR`
- `RULES_PDF_PATH`
- `PARSED_RULES_OUTPUT_DIR`

Retrieval needs:

- `PINECONE_API_KEY`
- `PINECONE_INDEX`
- `PINECONE_CLOUD`
- `PINECONE_REGION`
- `COHERE_API_KEY`

Evaluation needs:

- `CONFIDENT_API_KEY`

For parsing:

```bash
RULES_PDF_PATH="path/to/rules.pdf" npm run parse:rules
```

For one-off ingestion of the current Core Rules PDF:

```bash
npm run ingest
```

For a local development vector index:

```bash
npm run build:index
npm run retrieve:test -- "Can a unit charge after advancing?"
```

After the local index exists, the chat endpoint retrieves from Vectra, injects the top chunks into the model context, and asks Servo Skull to cite sources with `[S1]`, `[S2]`, etc.

For tests:

```bash
npm test
npm run test:watch
```
