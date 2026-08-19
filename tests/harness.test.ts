import { describe, expect, it } from 'vitest';
import { fakeBrowser } from 'wxt/testing';

describe('test harness', () => {
  it('provides a DOM environment', () => {
    const el = document.createElement('input');
    el.value = 'hello';
    expect(el.value).toBe('hello');
  });

  it('provides a fake browser.storage', async () => {
    await fakeBrowser.storage.local.set({ probe: 42 });
    const { probe } = await fakeBrowser.storage.local.get('probe');
    expect(probe).toBe(42);
  });
});
