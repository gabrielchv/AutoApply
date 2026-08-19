import { joinUrl, postJson } from './http';
import type { LlmRequest, LlmResponse, LlmSettings } from './types';
import { LlmError } from './types';

interface OpenAiChatCompletion {
  choices?: { message?: { content?: string | null } }[];
}

/**
 * Chat Completions dialect — spoken by OpenAI, OpenRouter, Groq, Ollama and
 * Gemini's compatibility endpoint. `baseUrl` is expected to include the API
 * root (e.g. "https://api.openai.com/v1").
 */
export async function completeOpenAi(
  settings: LlmSettings,
  request: LlmRequest,
): Promise<LlmResponse> {
  const data = (await postJson(
    joinUrl(settings.baseUrl, '/chat/completions'),
    { Authorization: `Bearer ${settings.apiKey}` },
    {
      model: settings.model,
      messages: request.messages,
      ...(request.maxTokens !== undefined && { max_tokens: request.maxTokens }),
      ...(request.temperature !== undefined && { temperature: request.temperature }),
      ...(request.jsonMode && { response_format: { type: 'json_object' } }),
    },
  )) as OpenAiChatCompletion;

  const text = data.choices?.[0]?.message?.content;
  if (!text) {
    throw new LlmError('Provider returned an empty completion', 'empty');
  }
  return { text };
}
