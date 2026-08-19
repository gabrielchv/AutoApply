/**
 * Cleans the raw text pdf.js yields per page into something an LLM reads
 * well: de-hyphenates words split across line breaks, collapses runs of
 * whitespace, and separates pages with blank lines.
 */
export function normalizePdfText(pageTexts: string[]): string {
  return pageTexts
    .map((page) =>
      page
        .replace(/(\p{L})-\n(\p{L})/gu, '$1$2')
        .replace(/[ \t]+/g, ' ')
        .replace(/ ?\n ?/g, '\n')
        .replace(/\n{3,}/g, '\n\n')
        .trim(),
    )
    .filter((page) => page.length > 0)
    .join('\n\n');
}
