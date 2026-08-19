import { useEffect, useState } from 'react';
import { browser } from 'wxt/browser';
import { runFill } from '../../lib/fill/orchestrate';
import type { FillResult } from '../../lib/fill/types';
import { loadProfile } from '../../lib/storage/profile';
import { loadLlmSettings } from '../../lib/storage/settings';

type Phase =
  | { state: 'checking' }
  | { state: 'unconfigured'; missing: 'settings' | 'profile' }
  | { state: 'ready' }
  | { state: 'busy'; step: 'scanning' | 'mapping' | 'filling' }
  | { state: 'done'; result: FillResult }
  | { state: 'error'; message: string };

const STEP_LABELS = {
  scanning: 'Scanning the page…',
  mapping: 'Asking your LLM to map the form…',
  filling: 'Filling…',
} as const;

export function App() {
  const [phase, setPhase] = useState<Phase>({ state: 'checking' });

  useEffect(() => {
    void (async () => {
      const [settings, profile] = await Promise.all([loadLlmSettings(), loadProfile()]);
      if (!settings) setPhase({ state: 'unconfigured', missing: 'settings' });
      else if (!profile) setPhase({ state: 'unconfigured', missing: 'profile' });
      else setPhase({ state: 'ready' });
    })();
  }, []);

  async function fill() {
    try {
      const [tab] = await browser.tabs.query({ active: true, currentWindow: true });
      if (!tab?.id) throw new Error('No active tab.');

      const outcome = await runFill(tab.id, undefined, (step) =>
        setPhase({ state: 'busy', step }),
      );
      if (outcome.ok) setPhase({ state: 'done', result: outcome.result });
      else setPhase({ state: 'error', message: outcome.error.message });
    } catch (error) {
      setPhase({ state: 'error', message: String(error) });
    }
  }

  const openOptions = () => void browser.runtime.openOptionsPage();

  return (
    <main className="panel">
      <header className="panel-header">
        <h1>AutoApply</h1>
      </header>

      {phase.state === 'unconfigured' && (
        <section className="section">
          <p>
            {phase.missing === 'settings'
              ? 'Configure your LLM provider first.'
              : 'Upload your CV to build a profile first.'}
          </p>
          <button className="primary" onClick={openOptions}>
            Open settings
          </button>
        </section>
      )}

      {(phase.state === 'ready' || phase.state === 'busy') && (
        <section className="section">
          <button
            className="primary"
            disabled={phase.state === 'busy'}
            onClick={() => void fill()}
          >
            Fill this page
          </button>
          {phase.state === 'busy' && <p className="muted">{STEP_LABELS[phase.step]}</p>}
          <p className="muted small">
            Fields are filled and highlighted — nothing is ever submitted for you.
          </p>
        </section>
      )}

      {phase.state === 'done' && (
        <section className="section">
          <Summary result={phase.result} onAgain={fill} />
        </section>
      )}

      {phase.state === 'error' && (
        <section className="section">
          <p className="error">{phase.message}</p>
          <button className="primary" onClick={() => void fill()}>
            Try again
          </button>
        </section>
      )}
    </main>
  );
}

function Summary({ result, onAgain }: { result: FillResult; onAgain: () => void }) {
  const count = (outcome: string) =>
    result.outcomes.filter((entry) => entry.outcome === outcome).length;
  const manual = result.outcomes.filter(
    (entry) => entry.outcome === 'needs-manual' || entry.outcome === 'failed',
  );

  return (
    <>
      <p>
        <strong>{count('filled')}</strong> filled · {count('skipped')} skipped ·{' '}
        {manual.length} need your attention
      </p>
      {manual.length > 0 && (
        <ul className="manual-list">
          {manual.map((entry) => (
            <li key={entry.id}>{entry.label || 'Unlabeled field'}</li>
          ))}
        </ul>
      )}
      <p className="muted small">Review the form, then submit it yourself.</p>
      <button className="secondary" onClick={onAgain}>
        Fill again
      </button>
    </>
  );
}
