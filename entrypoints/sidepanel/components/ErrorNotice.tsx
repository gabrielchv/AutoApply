import { browser } from 'wxt/browser';
import type { ErrorPayload } from '../../../lib/messaging/protocol';

const GUIDANCE: Record<ErrorPayload['kind'], string | null> = {
  'not-configured': null, // message is already actionable
  auth: 'The provider rejected your API key — check it in settings.',
  'rate-limit': 'The provider is rate-limiting you. Wait a moment and retry.',
  network: 'Could not reach your provider — check your connection or base URL.',
  provider: null,
  empty: null,
  'invalid-output':
    'Try a stronger model in settings — this one returned unusable output.',
};

export function ErrorNotice({
  error,
  onRetry,
}: {
  error: ErrorPayload;
  onRetry: () => void;
}) {
  const needsSettings = error.kind === 'not-configured' || error.kind === 'auth';
  const guidance = GUIDANCE[error.kind];

  return (
    <div className="summary">
      <p className="error">{error.message}</p>
      {guidance && <p className="muted small">{guidance}</p>}
      {needsSettings ? (
        <button
          className="secondary"
          onClick={() => void browser.runtime.openOptionsPage()}
        >
          Open settings
        </button>
      ) : (
        <button className="secondary" onClick={onRetry}>
          Try again
        </button>
      )}
    </div>
  );
}
