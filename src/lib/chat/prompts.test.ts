import { describe, expect, it } from "vitest";

import { buildRetrievalPrompt, buildSourceSummary, systemPrompt } from "./prompts";
import type { RuleRetrievalResult } from "@/lib/rules/retrieval";

describe("chat prompts", () => {
  it("guards against unsupported rules answers", () => {
    expect(systemPrompt).toContain("Answer only from the retrieved rules context");
    expect(systemPrompt).toContain("Do not invent rules text");
    expect(systemPrompt).toContain("[S1]");
  });

  it("tells the model not to answer from general knowledge when retrieval fails", () => {
    const prompt = buildRetrievalPrompt("", "Local vector index does not exist.");

    expect(prompt).toContain("could not return context");
    expect(prompt).toContain("Do not answer the rules question from general knowledge");
  });

  it("includes developer diagnostics when no chunks are retrieved", () => {
    const retrieval: RuleRetrievalResult = {
      query: "How do objective control rules work?",
      sources: [],
      context: "",
      topK: 5,
      minScore: -1,
      rawResultCount: 0,
    };

    const summary = buildSourceSummary(retrieval);

    expect(summary).toContain("Raw results returned: 0");
    expect(summary).toContain("Sources after filtering: 0");
  });

  it("summarizes retrieved source cards for the model", () => {
    const retrieval: RuleRetrievalResult = {
      query: "How does line of sight work?",
      context: "[S1]\nText: Line of sight...",
      topK: 5,
      minScore: -1,
      rawResultCount: 1,
      sources: [
        {
          id: "core-rules:chunk:0001",
          label: "S1",
          title: "Warhammer 40,000 Core Rules",
          sourceUrl: "https://example.com/core-rules.pdf",
          chunkIndex: 0,
          location: "page 2, paragraph 4",
          pageStart: 2,
          pageEnd: 2,
          paragraphStart: 4,
          paragraphEnd: 4,
          score: 0.82,
          preview: "Line of sight is drawn as an imaginary line.",
          text: "Line of sight is drawn as an imaginary line.",
        },
      ],
    };

    const summary = buildSourceSummary(retrieval);

    expect(summary).toContain("[S1] Warhammer 40,000 Core Rules");
    expect(summary).toContain("page 2, paragraph 4");
    expect(summary).toContain("score 0.8200");
  });
});
