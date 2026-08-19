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
