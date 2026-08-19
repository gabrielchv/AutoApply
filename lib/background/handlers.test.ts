import 'fake-indexeddb/auto';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { fakeBrowser } from 'wxt/testing';
import { IDBFactory } from 'fake-indexeddb';
import { saveCvFile } from '../storage/cvFile';
import { saveLlmSettings } from '../storage/settings';
import { handleBackgroundMessage } from './handlers';

beforeEach(() => {
  fakeBrowser.reset();
  indexedDB = new IDBFactory();
});

afterEach(() => {
  vi.unstubAllGlobals();
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

  it('structures CV text into a validated profile via the LLM', async () => {
    await saveLlmSettings({
      format: 'openai',
      baseUrl: 'https://api.openai.com/v1',
      apiKey: 'sk-test',
      model: 'gpt-4.1-mini',
      supportsJsonMode: true,
    });
    const llmOutput = JSON.stringify({
      personal: {
        firstName: 'Ada',
        lastName: 'Lovelace',
        email: 'ada@example.com',
      },
      skills: ['mathematics'],
    });
    vi.stubGlobal(
      'fetch',
      vi
        .fn()
        .mockResolvedValue(
          new Response(
            JSON.stringify({ choices: [{ message: { content: llmOutput } }] }),
            { status: 200 },
          ),
        ),
    );

    const response = await handleBackgroundMessage({
      type: 'STRUCTURE_CV',
      rawText: 'Ada Lovelace — ada@example.com — mathematics',
    });

    expect(response.ok).toBe(true);
    if (response.ok) {
      expect(response.value.personal.firstName).toBe('Ada');
      expect(response.value.skills).toEqual(['mathematics']);
      expect(response.value.experiences).toEqual([]);
    }
  });

  it('surfaces invalid-output after the model fails twice', async () => {
    await saveLlmSettings({
      format: 'openai',
      baseUrl: 'https://api.openai.com/v1',
      apiKey: 'sk-test',
      model: 'gpt-4.1-mini',
    });
    vi.stubGlobal(
      'fetch',
      vi
        .fn()
        .mockImplementation(() =>
          Promise.resolve(
            new Response(
              JSON.stringify({ choices: [{ message: { content: 'not json' } }] }),
              { status: 200 },
            ),
          ),
        ),
    );

    const response = await handleBackgroundMessage({
      type: 'STRUCTURE_CV',
      rawText: 'cv text',
    });
    expect(response).toMatchObject({ ok: false, error: { kind: 'invalid-output' } });
  });

  it('maps a form into a sanitized fill plan', async () => {
    await saveLlmSettings({
      format: 'openai',
      baseUrl: 'https://api.openai.com/v1',
      apiKey: 'sk-test',
      model: 'gpt-4.1-mini',
      supportsJsonMode: true,
    });
    await fakeBrowser.storage.local.set({
      profile: {
        meta: { version: 1, createdAt: '2026-01-01', updatedAt: '2026-01-01' },
        personal: {
          firstName: 'Ada',
          lastName: 'Lovelace',
          email: 'ada@example.com',
          location: {},
        },
        workAuthorization: { authorizedToWorkIn: [] },
        links: { other: [] },
        experiences: [],
        education: [],
        skills: [],
        languages: [],
        certifications: [],
        preferences: {},
        extraAnswers: [],
      },
    });
    const llmOutput = JSON.stringify({
      fields: [
        { id: 'f0', action: 'fill', value: 'Ada' },
        { id: 'ghost', action: 'fill', value: 'nope' },
      ],
    });
    vi.stubGlobal(
      'fetch',
      vi
        .fn()
        .mockResolvedValue(
          new Response(
            JSON.stringify({ choices: [{ message: { content: llmOutput } }] }),
            { status: 200 },
          ),
        ),
    );

    const response = await handleBackgroundMessage({
      type: 'MAP_FORM',
      fields: [
        {
          id: 'f0',
          kind: 'text',
          label: 'First name',
          required: true,
          alreadyFilled: false,
        },
      ],
      pageContext: { url: 'https://x.test', title: 'Apply' },
    });

    expect(response.ok).toBe(true);
    if (response.ok) {
      expect(response.value.fields).toEqual([{ id: 'f0', action: 'fill', value: 'Ada' }]);
    }
  });

  it('requires a profile before mapping', async () => {
    await saveLlmSettings({
      format: 'openai',
      baseUrl: 'https://api.openai.com/v1',
      apiKey: 'sk-test',
      model: 'gpt-4.1-mini',
    });
    const response = await handleBackgroundMessage({
      type: 'MAP_FORM',
      fields: [],
      pageContext: { url: 'https://x.test', title: 'Apply' },
    });
    expect(response).toMatchObject({ ok: false, error: { kind: 'not-configured' } });
  });
});
