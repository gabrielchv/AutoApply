import type { LlmFormat } from './types';

export interface ProviderPreset {
  id: string;
  label: string;
  format: LlmFormat;
  baseUrl: string;
  /** A sensible default; the user can type any model the provider serves. */
  suggestedModel: string;
  /** Whether the endpoint honors response_format json_object. */
  supportsJsonMode: boolean;
  /** Shown in the settings UI (e.g. Ollama's CORS requirement). */
  note?: string;
}

/**
 * Presets only pre-fill the form — every field stays editable, and any
 * OpenAI-compatible endpoint works via the Custom option.
 */
export const PROVIDER_PRESETS: readonly ProviderPreset[] = [
  {
    id: 'openai',
    label: 'OpenAI',
    format: 'openai',
    baseUrl: 'https://api.openai.com/v1',
    suggestedModel: 'gpt-4.1-mini',
    supportsJsonMode: true,
  },
  {
    id: 'anthropic',
    label: 'Anthropic',
    format: 'anthropic',
    baseUrl: 'https://api.anthropic.com',
    suggestedModel: 'claude-haiku-4-5',
    supportsJsonMode: true,
  },
  {
    id: 'gemini',
    label: 'Google Gemini',
    format: 'openai',
    baseUrl: 'https://generativelanguage.googleapis.com/v1beta/openai',
    suggestedModel: 'gemini-2.5-flash',
    supportsJsonMode: false,
    note: 'Uses the OpenAI-compatible endpoint; JSON mode support is not guaranteed.',
  },
  {
    id: 'openrouter',
    label: 'OpenRouter',
    format: 'openai',
    baseUrl: 'https://openrouter.ai/api/v1',
    suggestedModel: 'anthropic/claude-haiku-4.5',
    supportsJsonMode: true,
  },
  {
    id: 'groq',
    label: 'Groq',
    format: 'openai',
    baseUrl: 'https://api.groq.com/openai/v1',
    suggestedModel: 'llama-3.3-70b-versatile',
    supportsJsonMode: true,
  },
  {
    id: 'ollama',
    label: 'Ollama (local)',
    format: 'openai',
    baseUrl: 'http://localhost:11434/v1',
    suggestedModel: 'llama3.1',
    supportsJsonMode: false,
    note: "Start Ollama with OLLAMA_ORIGINS='chrome-extension://*,moz-extension://*' so it accepts requests from the extension. No API key needed — enter anything.",
  },
] as const;

export function findPreset(id: string): ProviderPreset | undefined {
  return PROVIDER_PRESETS.find((preset) => preset.id === id);
}
