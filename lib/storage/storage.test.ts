import 'fake-indexeddb/auto';
import { beforeEach, describe, expect, it } from 'vitest';
import { fakeBrowser } from 'wxt/testing';
import { IDBFactory } from 'fake-indexeddb';
import type { LlmSettings } from '../llm/types';
import { emptyProfile } from '../profile/empty';
import { deleteCvFile, loadCvFile, saveCvFile } from './cvFile';
import { clearProfile, loadProfile, saveProfile } from './profile';
import { clearLlmSettings, loadLlmSettings, saveLlmSettings } from './settings';

const settings: LlmSettings = {
  format: 'openai',
  baseUrl: 'https://api.openai.com/v1',
  apiKey: 'sk-test',
  model: 'gpt-4.1-mini',
};

beforeEach(() => {
  fakeBrowser.reset();
  indexedDB = new IDBFactory();
});

describe('llm settings storage', () => {
  it('round-trips settings', async () => {
    expect(await loadLlmSettings()).toBeNull();
    await saveLlmSettings(settings);
    expect(await loadLlmSettings()).toEqual(settings);
    await clearLlmSettings();
    expect(await loadLlmSettings()).toBeNull();
  });
});

describe('profile storage', () => {
  it('round-trips a valid profile', async () => {
    const profile = {
      ...emptyProfile('2026-01-01'),
      personal: {
        firstName: 'Ada',
        lastName: 'Lovelace',
        email: 'ada@example.com',
        location: {},
      },
    };
    await saveProfile(profile);
    expect(await loadProfile()).toEqual(profile);
    await clearProfile();
    expect(await loadProfile()).toBeNull();
  });

  it('returns null for stored data that fails schema validation', async () => {
    await fakeBrowser.storage.local.set({ profile: { junk: true } });
    expect(await loadProfile()).toBeNull();
  });
});

describe('cv file storage', () => {
  it('round-trips file bytes with metadata', async () => {
    const bytes = new TextEncoder().encode('%PDF-1.4 fake').buffer as ArrayBuffer;
    await saveCvFile({ bytes, fileName: 'cv.pdf', mimeType: 'application/pdf' });
    const stored = await loadCvFile();
    expect(stored?.fileName).toBe('cv.pdf');
    expect(stored?.mimeType).toBe('application/pdf');
    expect(stored && new TextDecoder().decode(stored.bytes)).toContain('%PDF-1.4');
  });

  it('returns null when nothing stored, and deletes cleanly', async () => {
    expect(await loadCvFile()).toBeNull();
    const bytes = new TextEncoder().encode('x').buffer as ArrayBuffer;
    await saveCvFile({ bytes, fileName: 'a', mimeType: 'text/plain' });
    await deleteCvFile();
    expect(await loadCvFile()).toBeNull();
  });
});
