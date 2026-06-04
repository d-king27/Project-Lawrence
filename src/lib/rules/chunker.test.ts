import { describe, expect, it } from "vitest";

import { createRuleChunksFromPages, estimateTokens, extractParagraphs } from "./chunker";
import type { IngestedRuleDocument } from "./types";

const document: IngestedRuleDocument = {
  id: "core-rules",
  title: "Warhammer 40,000 Core Rules",
  sourceUrl: "https://example.com/core-rules.pdf",
  localPath: "data/raw-rules/core-rules.pdf",
  sha256: "abc123",
  bytes: 123,
  contentType: "application/pdf",
};

describe("rule chunker", () => {
  it("normalizes PDF text into paragraphs", () => {
    expect(extractParagraphs("First line\ncontinues.\n\nSecond paragraph.")).toEqual([
      "First line continues.",
      "Second paragraph.",
    ]);
  });

  it("preserves page and paragraph metadata on chunks", () => {
    const chunks = createRuleChunksFromPages(
      [
        {
          pageNumber: 2,
          text: "Objective markers are controlled by units nearby.\n\nModels have an Objective Control characteristic.",
        },
        {
          pageNumber: 3,
          text: "If there is a tie, neither player controls that objective marker.",
        },
      ],
      document,
      {
        targetTokens: 60,
        overlapTokens: 0,
      },
    );

    expect(chunks).toHaveLength(1);
    expect(chunks[0].metadata.pageStart).toBe(2);
    expect(chunks[0].metadata.pageEnd).toBe(3);
    expect(chunks[0].metadata.paragraphStart).toBe(1);
    expect(chunks[0].metadata.paragraphEnd).toBe(1);
    expect(chunks[0].metadata.title).toBe("Warhammer 40,000 Core Rules");
  });

  it("creates overlapping chunks when the target size is exceeded", () => {
    const chunks = createRuleChunksFromPages(
      [
        {
          pageNumber: 1,
          text: [
            "First paragraph explains the first rule interaction in plain language.",
            "Second paragraph explains the next part of the same rule sequence.",
            "Third paragraph closes the example with a different rules consequence.",
          ].join("\n\n"),
        },
      ],
      document,
      {
        targetTokens: 18,
        overlapTokens: 10,
      },
    );

    expect(chunks.length).toBeGreaterThan(1);
    expect(chunks[1].text).toContain("Second paragraph");
    expect(chunks.every((chunk) => estimateTokens(chunk.text) > 0)).toBe(true);
  });
});
