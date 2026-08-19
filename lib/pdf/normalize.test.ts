import { describe, expect, it } from 'vitest';
import { normalizePdfText } from './normalize';

describe('normalizePdfText', () => {
  it('joins pages with blank lines and trims each', () => {
    expect(normalizePdfText(['  page one  ', 'page two'])).toBe('page one\n\npage two');
  });

  it('collapses runs of spaces and tabs', () => {
    expect(normalizePdfText(['a   b\t\tc'])).toBe('a b c');
  });

  it('de-hyphenates words split across line breaks', () => {
    expect(normalizePdfText(['soft-\nware engineer'])).toBe('software engineer');
  });

  it('keeps intentional hyphens intact', () => {
    expect(normalizePdfText(['state-of-the-art'])).toBe('state-of-the-art');
  });

  it('drops empty pages and caps blank runs', () => {
    expect(normalizePdfText(['a\n\n\n\nb', '   ', 'c'])).toBe('a\n\nb\n\nc');
  });
});
