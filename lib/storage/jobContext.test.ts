import { beforeEach, describe, expect, it } from 'vitest';
import { fakeBrowser } from 'wxt/testing';
import { loadJobEntry, saveJobEntry } from './jobContext';

beforeEach(() => {
  fakeBrowser.reset();
});

describe('job context store', () => {
  it('round-trips an entry keyed by normalized URL', async () => {
    await saveJobEntry('https://X.com/j/1?utm_source=a', {
      context: { title: 'Dev', company: 'X', source: 'json-ld' },
      notes: 'know the CTO',
    });

    const entry = await loadJobEntry('https://x.com/j/1');
    expect(entry?.context.title).toBe('Dev');
    expect(entry?.notes).toBe('know the CTO');
    expect(entry?.updatedAt).toBeTruthy();
  });

  it('returns null for unknown postings', async () => {
    expect(await loadJobEntry('https://x.com/unknown')).toBeNull();
  });

  it('updates an existing entry in place', async () => {
    await saveJobEntry('https://x.com/j/1', {
      context: { source: 'none' },
      notes: 'v1',
    });
    await saveJobEntry('https://x.com/j/1', {
      context: { title: 'Dev', source: 'heuristic' },
      notes: 'v2',
    });
    const entry = await loadJobEntry('https://x.com/j/1');
    expect(entry?.notes).toBe('v2');
    expect(entry?.context.title).toBe('Dev');
  });

  it('evicts the least-recently-updated entries past the cap', async () => {
    for (let i = 0; i < 105; i++) {
      await saveJobEntry(`https://x.com/j/${i}`, {
        context: { source: 'none' },
        notes: '',
        updatedAt: new Date(2026, 0, 1, 0, 0, i).toISOString(),
      });
    }
    expect(await loadJobEntry('https://x.com/j/0')).toBeNull();
    expect(await loadJobEntry('https://x.com/j/4')).toBeNull();
    expect(await loadJobEntry('https://x.com/j/5')).not.toBeNull();
    expect(await loadJobEntry('https://x.com/j/104')).not.toBeNull();
  });
});
