import 'fake-indexeddb/auto';
import { beforeEach, describe, expect, it } from 'vitest';
import { fakeBrowser } from 'wxt/testing';
import { IDBFactory } from 'fake-indexeddb';
import { saveCvFile } from '../storage/cvFile';
import { saveLlmSettings } from '../storage/settings';
import { handleBackgroundMessage } from './handlers';

beforeEach(() => {
  fakeBrowser.reset();
  indexedDB = new IDBFactory();
});

describe('handleBackgroundMessage', () => {
  it('returns null when no CV file is stored', async () => {
    const response = await handleBackgroundMessage({ type: 'GET_CV_FILE' });
    expect(response).toEqual({ ok: true, value: null });
  });

  it('returns stored CV bytes with metadata', async () => {
    const bytes = new TextEncoder().encode('%PDF').buffer as ArrayBuffer;
    await saveCvFile({ bytes, fileName: 'cv.pdf', mimeType: 'application/pdf' });

    const response = await handleBackgroundMessage({ type: 'GET_CV_FILE' });
    expect(response.ok).toBe(true);
    if (response.ok && response.value) {
      expect(response.value.fileName).toBe('cv.pdf');
      expect(new TextDecoder().decode(response.value.bytes)).toBe('%PDF');
    }
  });

  it('rejects LLM requests when no provider is configured', async () => {
    const response = await handleBackgroundMessage({
      type: 'STRUCTURE_CV',
      rawText: 'some cv',
    });
    expect(response).toMatchObject({
      ok: false,
      error: { kind: 'not-configured' },
    });
  });

  it('passes the configuration guard when settings exist', async () => {
    await saveLlmSettings({
      format: 'openai',
      baseUrl: 'https://api.openai.com/v1',
      apiKey: 'sk-test',
      model: 'gpt-4.1-mini',
    });
    const response = await handleBackgroundMessage({
      type: 'STRUCTURE_CV',
      rawText: 'some cv',
    });
    // Not implemented yet, but the guard let it through.
    expect(response).toMatchObject({ ok: false, error: { kind: 'provider' } });
  });
});
