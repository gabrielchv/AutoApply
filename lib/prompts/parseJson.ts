import type { ZodType } from 'zod';

/** The model produced unusable output twice in a row. */
export class InvalidOutputError extends Error {
  constructor(
    message: string,
    readonly issues: string,
  ) {
    super(message);
    this.name = 'InvalidOutputError';
  }
}

/**
 * Extracts a JSON object from LLM output: tolerates ```json fences and prose
 * around the object, then parses the outermost {...} span. Throws on
 * anything unparsable.
 */
export function extractJson(text: string): unknown {
  const unfenced = text.replace(/```(?:json)?/gi, '');
  const start = unfenced.indexOf('{');
  const end = unfenced.lastIndexOf('}');
  if (start === -1 || end <= start) {
    throw new SyntaxError('No JSON object found in model output');
  }
  return JSON.parse(unfenced.slice(start, end + 1)) as unknown;
}

export interface RetryContext {
  previousResponse: string;
  feedback: string;
}

function validationFeedback(error: unknown): string {
  if (error instanceof SyntaxError) {
    return `Your previous output was not parseable JSON: ${error.message}. Return only a single valid JSON object.`;
  }
  return `Your previous output failed schema validation: ${String(error)}. Return corrected JSON only.`;
}

/**
 * Runs `call`, parses and validates the response; on failure, retries exactly
 * once with feedback describing what was wrong. Pure higher-order logic — the
 * caller decides how `call` reaches an LLM.
 */
export async function parseWithRetry<T>(
  schema: ZodType<T>,
  call: (retry?: RetryContext) => Promise<string>,
): Promise<T> {
  const first = await call();
  const firstAttempt = tryParse(schema, first);
  if (firstAttempt.ok) return firstAttempt.value;

  const second = await call({
    previousResponse: first,
    feedback: firstAttempt.feedback,
  });
  const secondAttempt = tryParse(schema, second);
  if (secondAttempt.ok) return secondAttempt.value;

  throw new InvalidOutputError(
    'The model returned unusable output twice — try a stronger model.',
    secondAttempt.feedback,
  );
}

function tryParse<T>(
  schema: ZodType<T>,
  text: string,
): { ok: true; value: T } | { ok: false; feedback: string } {
  let raw: unknown;
  try {
    raw = extractJson(text);
  } catch (error) {
    return { ok: false, feedback: validationFeedback(error) };
  }
  const result = schema.safeParse(raw);
  if (result.success) return { ok: true, value: result.data };
  const issues = result.error.issues
    .map((issue) => `${issue.path.join('.') || '(root)'}: ${issue.message}`)
    .join('; ');
  return { ok: false, feedback: validationFeedback(issues) };
}
