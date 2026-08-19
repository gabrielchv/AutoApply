import { useEffect, useState } from 'react';
import type { LlmFormat, LlmSettings } from '../../lib/llm/types';
import { findPreset, PROVIDER_PRESETS } from '../../lib/llm/presets';
import { sendToBackground } from '../../lib/messaging/protocol';
import { loadLlmSettings, saveLlmSettings } from '../../lib/storage/settings';

type Status =
  | { state: 'idle' }
  | { state: 'busy'; message: string }
  | { state: 'success'; message: string }
  | { state: 'error'; message: string };

const CUSTOM = 'custom';

interface SettingsTabProps {
  onSaved: () => void;
  /** Set when the CV step is still pending — offers it as the next action. */
  nextStep: (() => void) | null;
}

export function SettingsTab({ onSaved, nextStep }: SettingsTabProps) {
  const [presetId, setPresetId] = useState<string>(CUSTOM);
  const [format, setFormat] = useState<LlmFormat>('openai');
  const [baseUrl, setBaseUrl] = useState('');
  const [apiKey, setApiKey] = useState('');
  const [model, setModel] = useState('');
  const [status, setStatus] = useState<Status>({ state: 'idle' });

  useEffect(() => {
    void loadLlmSettings().then((settings) => {
      if (!settings) return;
      setFormat(settings.format);
      setBaseUrl(settings.baseUrl);
      setApiKey(settings.apiKey);
      setModel(settings.model);
      const match = PROVIDER_PRESETS.find(
        (preset) =>
          preset.baseUrl === settings.baseUrl && preset.format === settings.format,
      );
      setPresetId(match?.id ?? CUSTOM);
    });
  }, []);

  function applyPreset(id: string) {
    setPresetId(id);
    const preset = findPreset(id);
    if (!preset) return;
    setFormat(preset.format);
    setBaseUrl(preset.baseUrl);
    setModel(preset.suggestedModel);
  }

  function currentSettings(): LlmSettings {
    return {
      format,
      baseUrl: baseUrl.trim(),
      apiKey: apiKey.trim(),
      model: model.trim(),
    };
  }

  const incomplete = !baseUrl.trim() || !model.trim();

  const [saved, setSaved] = useState(false);

  async function handleSave() {
    setStatus({ state: 'busy', message: 'Saving…' });
    await saveLlmSettings(currentSettings());
    setStatus({ state: 'success', message: 'Saved.' });
    setSaved(true);
    onSaved();
  }

  async function handleTest() {
    setStatus({ state: 'busy', message: 'Contacting provider…' });
    const result = await sendToBackground({
      type: 'TEST_CONNECTION',
      settings: currentSettings(),
    });
    if (result.ok) {
      setStatus({ state: 'success', message: `Provider replied: “${result.value}”` });
    } else {
      setStatus({ state: 'error', message: result.error.message });
    }
  }

  const preset = findPreset(presetId);

  return (
    <div className="card">
      <h2>Step 1 — connect your LLM</h2>
      <p className="hint">
        AutoApply runs on your own API key. Nothing works until this step is done: reading
        your CV and filling forms both go through the provider you pick here.
      </p>

      <div className="field">
        <label htmlFor="preset">Provider preset</label>
        <select
          id="preset"
          value={presetId}
          onChange={(event) => applyPreset(event.target.value)}
        >
          {PROVIDER_PRESETS.map((p) => (
            <option key={p.id} value={p.id}>
              {p.label}
            </option>
          ))}
          <option value={CUSTOM}>Custom (any OpenAI-compatible endpoint)</option>
        </select>
        <span className="hint">
          Presets only pre-fill the fields below — everything stays editable.
        </span>
      </div>

      {preset?.note && <div className="note">{preset.note}</div>}

      <div className="row">
        <div className="field">
          <label htmlFor="format">Wire format</label>
          <select
            id="format"
            value={format}
            onChange={(event) => setFormat(event.target.value as LlmFormat)}
          >
            <option value="openai">OpenAI-compatible</option>
            <option value="anthropic">Anthropic</option>
          </select>
        </div>
        <div className="field">
          <label htmlFor="model">Model</label>
          <input
            id="model"
            type="text"
            value={model}
            onChange={(event) => setModel(event.target.value)}
            placeholder="gpt-4.1-mini"
          />
        </div>
      </div>

      <div className="field">
        <label htmlFor="baseUrl">Base URL</label>
        <input
          id="baseUrl"
          type="url"
          value={baseUrl}
          onChange={(event) => setBaseUrl(event.target.value)}
          placeholder="https://api.openai.com/v1"
        />
      </div>

      <div className="field">
        <label htmlFor="apiKey">API key</label>
        <input
          id="apiKey"
          type="password"
          value={apiKey}
          onChange={(event) => setApiKey(event.target.value)}
          autoComplete="off"
        />
        <span className="hint">
          Stored only in this browser's local extension storage; sent only to the base URL
          above.
        </span>
      </div>

      <div className="actions">
        <button
          className="primary"
          onClick={() => void handleSave()}
          disabled={incomplete || status.state === 'busy'}
        >
          Save
        </button>
        <button
          className="secondary"
          onClick={() => void handleTest()}
          disabled={incomplete || status.state === 'busy'}
        >
          Test connection
        </button>
        {status.state !== 'idle' && (
          <span
            className={`status ${
              status.state === 'busy'
                ? 'muted'
                : status.state === 'success'
                  ? 'success'
                  : 'error'
            }`}
          >
            {status.message}
          </span>
        )}
      </div>

      {saved && nextStep && (
        <div className="next-step">
          <div>
            <strong>Provider ready.</strong>
            <p className="hint">Next: upload your CV so AutoApply knows about you.</p>
          </div>
          <button className="primary" onClick={nextStep}>
            Continue to step 2
          </button>
        </div>
      )}
    </div>
  );
}
