import { useEffect, useState } from 'react';
import { browser } from 'wxt/browser';
import { runFill } from '../../lib/fill/orchestrate';
import type { FillResult } from '../../lib/fill/types';
import { loadProfile } from '../../lib/storage/profile';
import { loadLlmSettings } from '../../lib/storage/settings';
import { ContextSection } from './components/ContextSection';
import { JobHeader } from './components/JobHeader';
import { NotesSection } from './components/NotesSection';
import { useJobEntry } from './hooks/useJobEntry';

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
  const [tabId, setTabId] = useState<number | null>(null);
  const [url, setUrl] = useState<string | null>(null);
  const { entry, extracting, updateContext, updateNotes, reextract } = useJobEntry(
    tabId,
    url,
  );

  useEffect(() => {
    void (async () => {
      const [settings, profile] = await Promise.all([loadLlmSettings(), loadProfile()]);
      if (!settings) {
        setPhase({ state: 'unconfigured', missing: 'settings' });
        return;
      }
      if (!profile) {
        setPhase({ state: 'unconfigured', missing: 'profile' });
        return;
      }
      const [tab] = await browser.tabs.query({ active: true, currentWindow: true });
      if (tab?.id && tab.url?.startsWith('http')) {
        setTabId(tab.id);
        setUrl(tab.url);
      }
      setPhase({ state: 'ready' });
    })();
  }, []);

  async function fill() {
    if (tabId === null) return;
    try {
      const outcome = await runFill(
        tabId,
        {
          title: entry.context.title,
          company: entry.context.company,
          description: entry.context.description,
          notes: entry.notes || undefined,
        },
        (step) => setPhase({ state: 'busy', step }),
      );
      if (outcome.ok) setPhase({ state: 'done', result: outcome.result });
      else setPhase({ state: 'error', message: outcome.error.message });
    } catch (error) {
      setPhase({ state: 'error', message: String(error) });
    }
  }

  const openOptions = () => void browser.runtime.openOptionsPage();

  if (phase.state === 'checking') return null;

  if (phase.state === 'unconfigured') {
    return (
      <main className="panel">
        <PanelHeader />
        <section className="section">
          <div className="section-body">
            <p>
              {phase.missing === 'settings'
                ? 'Configure your LLM provider first.'
                : 'Upload your CV to build a profile first.'}
            </p>
            <button className="primary" onClick={openOptions}>
              Open settings
            </button>
          </div>
        </section>
      </main>
    );
  }

  return (
    <main className="panel">
      <PanelHeader />

      {url ? (
        <>
          <JobHeader context={entry.context} url={url} />
          <ContextSection
            context={entry.context}
            extracting={extracting}
            onChange={updateContext}
            onReextract={reextract}
          />
          <NotesSection notes={entry.notes} onChange={updateNotes} />

          <section className="section">
            <div className="section-body">
              <button
                className="primary"
                disabled={phase.state === 'busy'}
                onClick={() => void fill()}
              >
                {phase.state === 'done' ? 'Fill again' : 'Fill this page'}
              </button>
              {phase.state === 'busy' && (
                <p className="muted">{STEP_LABELS[phase.step]}</p>
              )}
              {phase.state === 'error' && <p className="error">{phase.message}</p>}
              {phase.state === 'done' && <Summary result={phase.result} />}
              <p className="muted small">
                Fields are filled and highlighted — nothing is ever submitted for you.
              </p>
            </div>
          </section>
        </>
      ) : (
        <section className="section">
          <div className="section-body">
            <p className="muted">Open a job posting in this tab to get started.</p>
          </div>
        </section>
      )}
    </main>
  );
}

function PanelHeader() {
  return (
    <header className="panel-header">
      <h1>AutoApply</h1>
    </header>
  );
}

function Summary({ result }: { result: FillResult }) {
  const count = (outcome: string) =>
    result.outcomes.filter((entry) => entry.outcome === outcome).length;
  const manual = result.outcomes.filter(
    (entry) => entry.outcome === 'needs-manual' || entry.outcome === 'failed',
  );

  return (
    <div className="summary">
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
    </div>
  );
}
