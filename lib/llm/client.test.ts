import { afterEach, describe, expect, it, vi } from 'vitest';
import { complete } from './client';
import type { LlmSettings } from './types';
import { LlmError } from './types';

const openAiSettings: LlmSettings = {
  format: 'openai',
  baseUrl: 'https://api.openai.com/v1/',
  apiKey: 'sk-test',
  model: 'gpt-4.1-mini',
};

const anthropicSettings: LlmSettings = {
  format: 'anthropic',
  baseUrl: 'https://api.anthropic.com',
  apiKey: 'sk-ant-test',
  model: 'claude-haiku-4-5',
};

function mockFetch(status: number, body: unknown) {
  const fetchMock = vi.fn().mockResolvedValue(
    new Response(JSON.stringify(body), {
      status,
      headers: { 'Content-Type': 'application/json' },
    }),
  );
  vi.stubGlobal('fetch', fetchMock);
  return fetchMock;
}

afterEach(() => {
  vi.unstubAllGlobals();
});

describe('openai format', () => {
  it('posts to chat/completions with bearer auth and returns the text', async () => {
    const fetchMock = mockFetch(200, {
      choices: [{ message: { content: 'hello' } }],
    });

    const result = await complete(openAiSettings, {
      messages: [
        { role: 'system', content: 'sys' },
        { role: 'user', content: 'hi' },
      ],
      jsonMode: true,
      maxTokens: 100,
    });

    expect(result.text).toBe('hello');
    const [url, init] = fetchMock.mock.calls[0] as [string, RequestInit];
    expect(url).toBe('https://api.openai.com/v1/chat/completions');
    expect((init.headers as Record<string, string>).Authorization).toBe('Bearer sk-test');
    const body = JSON.parse(init.body as string);
    expect(body.model).toBe('gpt-4.1-mini');
    expect(body.messages).toHaveLength(2);
    expect(body.max_tokens).toBe(100);
    expect(body.response_format).toEqual({ type: 'json_object' });
  });

  it('maps 401 to an auth error', async () => {
    mockFetch(401, { error: 'bad key' });
    await expect(
      complete(openAiSettings, { messages: [{ role: 'user', content: 'hi' }] }),
    ).rejects.toMatchObject({ name: 'LlmError', kind: 'auth' });
  });

  it('maps 429 to a rate-limit error', async () => {
    mockFetch(429, {});
    await expect(
      complete(openAiSettings, { messages: [{ role: 'user', content: 'hi' }] }),
    ).rejects.toMatchObject({ kind: 'rate-limit' });
  });

  it('maps network failure to a network error', async () => {
    vi.stubGlobal('fetch', vi.fn().mockRejectedValue(new TypeError('offline')));
    await expect(
      complete(openAiSettings, { messages: [{ role: 'user', content: 'hi' }] }),
    ).rejects.toMatchObject({ kind: 'network' });
  });

  it('treats an empty completion as an error', async () => {
    mockFetch(200, { choices: [{ message: { content: '' } }] });
    await expect(
      complete(openAiSettings, { messages: [{ role: 'user', content: 'hi' }] }),
    ).rejects.toMatchObject({ kind: 'empty' });
  });
});

describe('anthropic format', () => {
  it('posts to /v1/messages with anthropic headers, system field and prefill', async () => {
    const fetchMock = mockFetch(200, {
      content: [{ type: 'text', text: '"a": 1}' }],
    });

    const result = await complete(anthropicSettings, {
      messages: [
        { role: 'system', content: 'sys' },
        { role: 'user', content: 'hi' },
      ],
      jsonMode: true,
    });

    expect(result.text).toBe('{"a": 1}');
    const [url, init] = fetchMock.mock.calls[0] as [string, RequestInit];
    expect(url).toBe('https://api.anthropic.com/v1/messages');
    const headers = init.headers as Record<string, string>;
    expect(headers['x-api-key']).toBe('sk-ant-test');
    expect(headers['anthropic-dangerous-direct-browser-access']).toBe('true');
    const body = JSON.parse(init.body as string);
    expect(body.system).toBe('sys');
    expect(body.messages).toEqual([
      { role: 'user', content: 'hi' },
      { role: 'assistant', content: '{' },
    ]);
    expect(body.max_tokens).toBe(4096);
  });

  it('joins multiple text blocks and skips prefill outside json mode', async () => {
    mockFetch(200, {
      content: [
        { type: 'text', text: 'foo' },
        { type: 'text', text: 'bar' },
      ],
    });
    const result = await complete(anthropicSettings, {
      messages: [{ role: 'user', content: 'hi' }],
    });
    expect(result.text).toBe('foobar');
  });
});

describe('LlmError', () => {
  it('is an Error with a kind', () => {
    const error = new LlmError('boom', 'provider');
    expect(error).toBeInstanceOf(Error);
    expect(error.kind).toBe('provider');
  });
});
