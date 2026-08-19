import { complete } from '../llm/client';
import type { LlmSettings } from '../llm/types';
import { LlmError } from '../llm/types';
import type {
  BackgroundRequest,
  CvFilePayload,
  ErrorPayload,
  ResponseFor,
  Result,
} from '../messaging/protocol';
import { err, ok } from '../messaging/protocol';
import { loadCvFile } from '../storage/cvFile';
import { loadLlmSettings } from '../storage/settings';

const NOT_CONFIGURED: ErrorPayload = {
  message: 'No LLM provider configured. Open AutoApply settings first.',
  kind: 'not-configured',
};

async function requireSettings(): Promise<Result<LlmSettings>> {
  const settings = await loadLlmSettings();
  if (!settings || !settings.baseUrl || !settings.model) {
    return err(NOT_CONFIGURED);
  }
  return ok(settings);
}

async function handleTestConnection(settings: LlmSettings): Promise<Result<string>> {
  try {
    const response = await complete(settings, {
      messages: [{ role: 'user', content: 'Reply with the single word: OK' }],
      maxTokens: 16,
    });
    return ok(response.text.trim());
  } catch (error) {
    if (error instanceof LlmError) {
      return err({ message: error.message, kind: error.kind });
    }
    return err({ message: String(error), kind: 'provider' });
  }
}

async function handleGetCvFile(): Promise<Result<CvFilePayload | null>> {
  const stored = await loadCvFile();
  if (!stored) return ok(null);
  return ok({
    bytes: stored.bytes,
    fileName: stored.fileName,
    mimeType: stored.mimeType,
  });
}

/**
 * The single entry point for messages the background worker answers. This is
 * the only code path with access to the API key; content scripts and UI pages
 * talk to providers exclusively through it.
 */
export async function handleBackgroundMessage<M extends BackgroundRequest>(
  message: M,
): Promise<ResponseFor<M>> {
  switch (message.type) {
    case 'GET_CV_FILE':
      return (await handleGetCvFile()) as ResponseFor<M>;
    case 'TEST_CONNECTION':
      return (await handleTestConnection(message.settings)) as ResponseFor<M>;
    case 'STRUCTURE_CV':
    case 'MAP_FORM': {
      const settings = await requireSettings();
      if (!settings.ok) return settings as ResponseFor<M>;
      // LLM-backed handlers land with the ingestion and mapping features.
      return err({
        message: 'Not implemented yet.',
        kind: 'provider',
      }) as ResponseFor<M>;
    }
  }
}
