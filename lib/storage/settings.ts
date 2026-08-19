import { storage } from 'wxt/utils/storage';
import type { LlmSettings } from '../llm/types';

/**
 * LLM settings live in storage.local only — never storage.sync, which would
 * replicate the API key to the user's browser account.
 */
const llmSettingsItem = storage.defineItem<LlmSettings | null>('local:llmSettings', {
  fallback: null,
});

export function loadLlmSettings(): Promise<LlmSettings | null> {
  return llmSettingsItem.getValue();
}

export function saveLlmSettings(settings: LlmSettings): Promise<void> {
  return llmSettingsItem.setValue(settings);
}

export function clearLlmSettings(): Promise<void> {
  return llmSettingsItem.removeValue();
}
