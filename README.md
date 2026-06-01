# Project-Lawrence
warhammer 11th ed llm
Codex workspace check: I am in `C:\Users\Dan\Documents\Codex\Project-Lawrence` and ready to work on Project-Lawrence with Dan.

# Project Lawrence

Project Lawrence is a rules-grounded Warhammer assistant intended to demonstrate a reliable LLM workflow: parse official rules documents, index them, retrieve and rerank relevant passages, stream cited answers, and regression-test answer quality.

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

For parsing:

```bash
RULES_PDF_PATH="path/to/rules.pdf" npm run parse:rules
```
