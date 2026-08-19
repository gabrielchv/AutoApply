import { describe, expect, it, vi } from 'vitest';
import { z } from 'zod';
import { extractJson, InvalidOutputError, parseWithRetry } from './parseJson';

describe('extractJson', () => {
  it('parses a bare JSON object', () => {
    expect(extractJson('{"a": 1}')).toEqual({ a: 1 });
  });

  it('strips markdown fences', () => {
    expect(extractJson('```json\n{"a": 1}\n```')).toEqual({ a: 1 });
  });

  it('slices JSON out of surrounding prose', () => {
    expect(extractJson('Here you go:\n{"a": {"b": 2}}\nHope that helps!')).toEqual({
      a: { b: 2 },
    });
  });

  it('throws when there is no object', () => {
    expect(() => extractJson('no json here')).toThrow(SyntaxError);
  });

  it('throws on malformed JSON', () => {
    expect(() => extractJson('{"a": }')).toThrow();
  });
});

const schema = z.object({ name: z.string() });

describe('parseWithRetry', () => {
  it('returns validated data on the first try', async () => {
    const call = vi.fn().mockResolvedValue('{"name": "ok"}');
    await expect(parseWithRetry(schema, call)).resolves.toEqual({ name: 'ok' });
    expect(call).toHaveBeenCalledTimes(1);
  });

  it('retries once with feedback and succeeds', async () => {
    const call = vi
      .fn()
      .mockResolvedValueOnce('{"name": 42}')
      .mockResolvedValueOnce('{"name": "fixed"}');
    await expect(parseWithRetry(schema, call)).resolves.toEqual({ name: 'fixed' });
    expect(call).toHaveBeenCalledTimes(2);
    const retry = call.mock.calls[1]?.[0] as {
      previousResponse: string;
      feedback: string;
    };
    expect(retry.previousResponse).toBe('{"name": 42}');
    expect(retry.feedback).toContain('schema validation');
    expect(retry.feedback).toContain('name');
  });

  it('gives syntax-specific feedback for unparsable output', async () => {
    const call = vi
      .fn()
      .mockResolvedValueOnce('not json at all')
      .mockResolvedValueOnce('{"name": "fixed"}');
    await parseWithRetry(schema, call);
    const retry = call.mock.calls[1]?.[0] as { feedback: string };
    expect(retry.feedback).toContain('not parseable JSON');
  });

  it('throws InvalidOutputError after two failures', async () => {
    const call = vi.fn().mockResolvedValue('garbage');
    await expect(parseWithRetry(schema, call)).rejects.toBeInstanceOf(InvalidOutputError);
    expect(call).toHaveBeenCalledTimes(2);
  });
});
