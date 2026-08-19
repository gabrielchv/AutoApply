/**
 * Wire format the configured endpoint speaks. Everything OpenAI-compatible
 * (OpenAI, OpenRouter, Groq, Ollama, Gemini's compat endpoint) uses 'openai';
 * Anthropic's Messages API needs its own shape.
 */
export type LlmFormat = 'openai' | 'anthropic';

export interface LlmSettings {
  format: LlmFormat;
  baseUrl: string;
  apiKey: string;
  model: string;
  /**
   * Whether the endpoint honors OpenAI's response_format json_object
   * (Gemini's compat endpoint and Ollama don't guarantee it). Anthropic
   * ignores this — its JSON mode is a prompt-level prefill.
   */
  supportsJsonMode?: boolean;
}

export interface LlmMessage {
  role: 'system' | 'user' | 'assistant';
  content: string;
}

export interface LlmRequest {
  messages: LlmMessage[];
  /** Ask for JSON output where the provider supports it. */
  jsonMode?: boolean;
  maxTokens?: number;
  temperature?: number;
}

export interface LlmResponse {
  text: string;
}

export class LlmError extends Error {
  constructor(
    message: string,
    readonly kind: 'auth' | 'rate-limit' | 'network' | 'provider' | 'empty',
  ) {
    super(message);
    this.name = 'LlmError';
  }
}
