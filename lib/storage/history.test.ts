import { beforeEach, describe, expect, it } from 'vitest';
import { fakeBrowser } from 'wxt/testing';
import { clearHistory, loadHistory, recordFill } from './history';

beforeEach(() => {
  fakeBrowser.reset();
});

const entry = (url: string, filledAt = '2026-08-01T00:00:00Z') => ({
  url,
  title: 'Engineer',
  company: 'Acme',
  filledAt,
  counts: { filled: 10, skipped: 2, manual: 1 },
});

describe('fill history', () => {
  it('records newest first', async () => {
    await recordFill(entry('https://a.com/1'));
    await recordFill(entry('https://b.com/2'));
    const history = await loadHistory();
    expect(history.map((item) => item.url)).toEqual([
      'https://b.com/2',
      'https://a.com/1',
    ]);
  });

  it('upserts by normalized URL, moving the entry to the front', async () => {
    await recordFill(entry('https://a.com/1'));
    await recordFill(entry('https://b.com/2'));
    await recordFill({
      ...entry('https://A.com/1?utm_source=x', '2026-08-02T00:00:00Z'),
      counts: { filled: 12, skipped: 0, manual: 0 },
    });

    const history = await loadHistory();
    expect(history).toHaveLength(2);
    expect(history[0]?.url).toBe('https://a.com/1');
    expect(history[0]?.counts.filled).toBe(12);
    expect(history[0]?.filledAt).toBe('2026-08-02T00:00:00Z');
  });

  it('caps the list at 200 entries', async () => {
    for (let i = 0; i < 205; i++) {
      await recordFill(entry(`https://a.com/${i}`));
    }
    const history = await loadHistory();
    expect(history).toHaveLength(200);
    expect(history[0]?.url).toBe('https://a.com/204');
  });

  it('clears completely', async () => {
    await recordFill(entry('https://a.com/1'));
    await clearHistory();
    expect(await loadHistory()).toEqual([]);
  });
});
