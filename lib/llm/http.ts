import { LlmError } from './types';

export function joinUrl(baseUrl: string, path: string): string {
  return `${baseUrl.replace(/\/+$/, '')}${path}`;
}

export async function postJson(
  url: string,
  headers: Record<string, string>,
  body: unknown,
): Promise<unknown> {
  let response: Response;
  try {
    response = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', ...headers },
      body: JSON.stringify(body),
    });
  } catch (error) {
    throw new LlmError(
      `Could not reach ${url}: ${error instanceof Error ? error.message : String(error)}`,
      'network',
    );
  }

  if (!response.ok) {
    const detail = await response.text().catch(() => '');
    const kind =
      response.status === 401 || response.status === 403
        ? 'auth'
        : response.status === 429
          ? 'rate-limit'
          : 'provider';
    throw new LlmError(
      `Provider returned ${response.status}: ${detail.slice(0, 300)}`,
      kind,
    );
  }

  return response.json().catch(() => {
    throw new LlmError('Provider returned a non-JSON body', 'provider');
  });
}
