import { fillPlanSchema, sanitizePlan } from '../fill/planSchema';
import type { FillPlan } from '../fill/types';
import { complete } from '../llm/client';
import type { LlmMessage, LlmSettings } from '../llm/types';
import { LlmError } from '../llm/types';
import type {
  BackgroundRequest,
  CvFilePayload,
  ErrorPayload,
  ResponseFor,
  Result,
} from '../messaging/protocol';
import { err, ok } from '../messaging/protocol';
import type { ProfileContent } from '../profile/schema';
import { profileContentSchema } from '../profile/schema';
import type { RetryContext } from '../prompts/parseJson';
import { InvalidOutputError, parseWithRetry } from '../prompts/parseJson';
import { buildMappingPrompt } from '../prompts/mapForm';
import { buildStructureCvPrompt } from '../prompts/structureCv';
import type { PageContext, ScrapedField } from '../scrape/types';
import { loadCvFile } from '../storage/cvFile';
import { loadProfile } from '../storage/profile';
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

function toErrorPayload(error: unknown): ErrorPayload {
  if (error instanceof LlmError) {
    return { message: error.message, kind: error.kind };
  }
  if (error instanceof InvalidOutputError) {
    return { message: error.message, kind: 'invalid-output' };
  }
  return { message: String(error), kind: 'provider' };
}

/**
 * Builds the `call` used by parseWithRetry: base conversation on the first
 * attempt; on retry, the failed response plus corrective feedback are
 * appended so the model can fix its own output.
 */
function llmJsonCall(settings: LlmSettings, baseMessages: LlmMessage[]) {
  const jsonMode =
    settings.format === 'anthropic' || (settings.supportsJsonMode ?? false);
  return async (retry?: RetryContext): Promise<string> => {
    const messages: LlmMessage[] = retry
      ? [
          ...baseMessages,
          { role: 'assistant', content: retry.previousResponse },
          { role: 'user', content: retry.feedback },
        ]
      : baseMessages;
    const response = await complete(settings, { messages, jsonMode, maxTokens: 8192 });
    return response.text;
  };
}

async function handleStructureCv(rawText: string): Promise<Result<ProfileContent>> {
  const settings = await requireSettings();
  if (!settings.ok) return settings;
  try {
    const profile = await parseWithRetry(
      profileContentSchema,
      llmJsonCall(settings.value, buildStructureCvPrompt(rawText)),
    );
    return ok(profile);
  } catch (error) {
    return err(toErrorPayload(error));
  }
}

async function handleMapForm(
  fields: ScrapedField[],
  pageContext: PageContext,
): Promise<Result<FillPlan>> {
  const settings = await requireSettings();
  if (!settings.ok) return settings;
  const profile = await loadProfile();
  if (!profile) {
    return err({
      message: 'No profile yet. Upload your CV in AutoApply settings first.',
      kind: 'not-configured',
    });
  }
  try {
    const plan = await parseWithRetry(
      fillPlanSchema,
      llmJsonCall(settings.value, buildMappingPrompt(fields, profile, pageContext)),
    );
    return ok(
      sanitizePlan(
        plan,
        fields.map((field) => field.id),
      ),
    );
  } catch (error) {
    return err(toErrorPayload(error));
  }
}

async function handleTestConnection(settings: LlmSettings): Promise<Result<string>> {
  try {
    const response = await complete(settings, {
      messages: [{ role: 'user', content: 'Reply with the single word: OK' }],
      maxTokens: 16,
    });
    return ok(response.text.trim());
  } catch (error) {
    return err(toErrorPayload(error));
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
      return (await handleStructureCv(message.rawText)) as ResponseFor<M>;
    case 'MAP_FORM':
      return (await handleMapForm(message.fields, message.pageContext)) as ResponseFor<M>;
  }
}
