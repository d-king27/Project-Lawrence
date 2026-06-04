import { describe, expect, it } from "vitest";

import { formatRuleSourceLocation } from "./source-location";

describe("retrieval source labels", () => {
  it("formats a single-page source location", () => {
    expect(formatRuleSourceLocation(2, 2, 4, 4)).toBe("page 2, paragraph 4");
  });

  it("formats a single-page paragraph range", () => {
    expect(formatRuleSourceLocation(2, 2, 4, 7)).toBe("page 2, paragraphs 4-7");
  });

  it("formats a cross-page source location", () => {
    expect(formatRuleSourceLocation(2, 3, 8, 2)).toBe(
      "page 2 paragraph 8 to page 3 paragraph 2",
    );
  });
});
