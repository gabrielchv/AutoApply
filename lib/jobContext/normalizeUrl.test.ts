import { describe, expect, it } from 'vitest';
import { normalizeUrl } from './normalizeUrl';

describe('normalizeUrl', () => {
  it('lowercases the host and strips hash and trailing slash', () => {
    expect(normalizeUrl('https://Jobs.Example.COM/apply/#section')).toBe(
      'https://jobs.example.com/apply',
    );
  });

  it('removes tracking params but keeps ATS job ids', () => {
    expect(
      normalizeUrl(
        'https://boards.example.com/jobs?gh_jid=123&utm_source=linkedin&fbclid=x&ref=feed',
      ),
    ).toBe('https://boards.example.com/jobs?gh_jid=123');
  });

  it('is stable for the same posting reached via different tracking links', () => {
    const a = normalizeUrl('https://x.com/j/42?utm_campaign=a&gclid=1');
    const b = normalizeUrl('https://X.com/j/42/#apply');
    expect(a).toBe(b);
  });

  it('passes through non-URL strings unchanged', () => {
    expect(normalizeUrl('not a url')).toBe('not a url');
  });
});
