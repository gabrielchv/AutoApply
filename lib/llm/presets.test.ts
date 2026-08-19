import { describe, expect, it } from 'vitest';
import { findPreset, PROVIDER_PRESETS } from './presets';

describe('provider presets', () => {
  it('exposes the six launch providers with unique ids', () => {
    const ids = PROVIDER_PRESETS.map((preset) => preset.id);
    expect(ids).toEqual([
      'openai',
      'anthropic',
      'gemini',
      'openrouter',
      'groq',
      'ollama',
    ]);
    expect(new Set(ids).size).toBe(ids.length);
  });

  it('gives every preset a well-formed base URL without trailing slash', () => {
    for (const preset of PROVIDER_PRESETS) {
      expect(preset.baseUrl, preset.id).toMatch(/^https?:\/\//);
      expect(preset.baseUrl.endsWith('/'), preset.id).toBe(false);
    }
  });

  it('only anthropic uses the anthropic wire format', () => {
    const anthropicFormats = PROVIDER_PRESETS.filter((p) => p.format === 'anthropic');
    expect(anthropicFormats.map((p) => p.id)).toEqual(['anthropic']);
  });

  it('finds presets by id and returns undefined otherwise', () => {
    expect(findPreset('groq')?.baseUrl).toBe('https://api.groq.com/openai/v1');
    expect(findPreset('nope')).toBeUndefined();
  });
});
