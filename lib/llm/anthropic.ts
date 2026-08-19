import { joinUrl, postJson } from './http';
import type { LlmRequest, LlmResponse, LlmSettings } from './types';
import { LlmError } from './types';

interface AnthropicMessage {
  content?: { type: string; text?: string }[];
}

/**
 * Anthropic Messages API. `baseUrl` is the host root (e.g.
 * "https://api.anthropic.com"); system messages travel in the `system` field
 * and, in JSON mode, the assistant turn is prefilled with "{" to force a bare
 * JSON object.
 */
export async function completeAnthropic(
  settings: LlmSettings,
  request: LlmRequest,
): Promise<LlmResponse> {
  const system = request.messages
    .filter((m) => m.role === 'system')
    .map((m) => m.content)
    .join('\n\n');
  const messages = request.messages
    .filter((m) => m.role !== 'system')
    .map((m) => ({ role: m.role, content: m.content }));
  if (request.jsonMode) {
    messages.push({ role: 'assistant', content: '{' });
  }

  const data = (await postJson(
    joinUrl(settings.baseUrl, '/v1/messages'),
    {
      'x-api-key': settings.apiKey,
      'anthropic-version': '2023-06-01',
      // Required by Anthropic for requests originating from browsers; the
      // user explicitly configured their own key for exactly this.
      'anthropic-dangerous-direct-browser-access': 'true',
    },
    {
      model: settings.model,
      max_tokens: request.maxTokens ?? 4096,
      ...(system && { system }),
      messages,
      ...(request.temperature !== undefined && { temperature: request.temperature }),
    },
  )) as AnthropicMessage;

  const text = data.content
    ?.filter((block) => block.type === 'text')
    .map((block) => block.text ?? '')
    .join('');
  if (!text) {
    throw new LlmError('Provider returned an empty completion', 'empty');
  }
  return { text: request.jsonMode ? `{${text}` : text };
}
