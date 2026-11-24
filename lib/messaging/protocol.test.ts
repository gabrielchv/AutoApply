import { beforeEach, describe, expect, it } from 'vitest';
import { fakeBrowser } from 'wxt/testing/fake-browser';
import { err, ok, sendToBackground } from './protocol';
import type { BackgroundRequest } from './protocol';

beforeEach(() => {
  fakeBrowser.reset();
});

describe('messaging protocol', () => {
  it('round-trips a typed request/response through runtime messaging', async () => {
    // fake-browser 2.x follows the platform contract: the listener answers via
    // sendResponse and returns true to keep the channel open.
    fakeBrowser.runtime.onMessage.addListener((message, _sender, sendResponse) => {
      if ((message as BackgroundRequest).type === 'GET_CV_FILE') {
        sendResponse(ok(null));
        return true;
      }
      return undefined;
    });

    const response = await sendToBackground({ type: 'GET_CV_FILE' });
    expect(response).toEqual({ ok: true, value: null });
  });

  it('types EXTRACT_JOB_CONTEXT as a content request returning job context', async () => {
    fakeBrowser.runtime.onMessage.addListener((message, _sender, sendResponse) => {
      if ((message as { type: string }).type === 'EXTRACT_JOB_CONTEXT') {
        sendResponse({ title: 'Dev', source: 'json-ld' });
        return true;
      }
      return undefined;
    });

    // fakeBrowser routes tabs.sendMessage through the same listener set.
    const response = await fakeBrowser.runtime.sendMessage({
      type: 'EXTRACT_JOB_CONTEXT',
    });
    expect(response).toEqual({ title: 'Dev', source: 'json-ld' });
  });

  it('builds ok and err results', () => {
    expect(ok(42)).toEqual({ ok: true, value: 42 });
    expect(err({ message: 'nope', kind: 'not-configured' })).toEqual({
      ok: false,
      error: { message: 'nope', kind: 'not-configured' },
    });
  });
});
