import { completeAnthropic } from './anthropic';
import { completeOpenAi } from './openai';
import type { LlmRequest, LlmResponse, LlmSettings } from './types';

/**
 * Single entry point for LLM calls; dispatches on the configured wire format.
 * Only the background worker may import this module (it holds the API key).
 */
export function complete(
  settings: LlmSettings,
  request: LlmRequest,
): Promise<LlmResponse> {
  switch (settings.format) {
    case 'openai':
      return completeOpenAi(settings, request);
    case 'anthropic':
      return completeAnthropic(settings, request);
  }
}
