export function formatRuleSourceLocation(
  pageStart: number,
  pageEnd: number,
  paragraphStart: number,
  paragraphEnd: number,
) {
  if (pageStart !== pageEnd) {
    return `page ${pageStart} paragraph ${paragraphStart} to page ${pageEnd} paragraph ${paragraphEnd}`;
  }

  const page = `page ${pageStart}`;
  const paragraph =
    paragraphStart === paragraphEnd
      ? `paragraph ${paragraphStart}`
      : `paragraphs ${paragraphStart}-${paragraphEnd}`;

  return `${page}, ${paragraph}`;
}
