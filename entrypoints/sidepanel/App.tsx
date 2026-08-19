import { useEffect, useState } from 'react';
import { browser } from 'wxt/browser';
import type { FillPhase } from '../../lib/fill/orchestrate';
import { runFill } from '../../lib/fill/orchestrate';
import type { FillResult } from '../../lib/fill/types';
import type { ErrorPayload } from '../../lib/messaging/protocol';
import { recordFill } from '../../lib/storage/history';
import { loadProfile } from '../../lib/storage/profile';
import { loadLlmSettings } from '../../lib/storage/settings';
import { ContextSection } from './components/ContextSection';
import { ErrorNotice } from './components/ErrorNotice';
import { JobHeader } from './components/JobHeader';
import { NotesSection } from './components/NotesSection';
import { OutcomeList } from './components/OutcomeList';
import { useActiveTab } from './hooks/useActiveTab';
import { useJobEntry } from './hooks/useJobEntry';

type Phase =
  | { state: 'checking' }
  | { state: 'unconfigured'; missing: 'settings' | 'profile' }
  | { state: 'ready' }
  | { state: 'busy'; step: FillPhase }
  | { state: 'done'; result: FillResult }
  | { state: 'error'; error: ErrorPayload };

const STEPS: { key: FillPhase; label: string }[] = [
  { key: 'scanning', label: 'Scan' },
  { key: 'mapping', label: 'Map' },
  { key: 'filling', label: 'Fill' },
];

export function App() {
  const [phase, setPhase] = useState<Phase>({ state: 'checking' });
  const { tabId, url } = useActiveTab();
  const { entry, extracting, updateContext, updateNotes, reextract } = useJobEntry(
    tabId,
    url,
  );

  // A navigation or tab switch invalidates any fill result on screen.
  const [lastUrl, setLastUrl] = useState<string | null>(url);
  if (lastUrl !== url) {
    setLastUrl(url);
    if (phase.state === 'done' || phase.state === 'error' || phase.state === 'busy') {
      setPhase({ state: 'ready' });
    }
  }

  useEffect(() => {
    void (async () => {
      const [settings, profile] = await Promise.all([loadLlmSettings(), loadProfile()]);
      if (!settings) setPhase({ state: 'unconfigured', missing: 'settings' });
      else if (!profile) setPhase({ state: 'unconfigured', missing: 'profile' });
      else setPhase({ state: 'ready' });
    })();
  }, []);

  async function fill() {
    if (tabId === null || !url) return;
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
      if (outcome.ok) {
        setPhase({ state: 'done', result: outcome.result });
        const count = (kind: string) =>
          outcome.result.outcomes.filter((item) => item.outcome === kind).length;
        void recordFill({
          url,
          title: entry.context.title || outcome.pageContext.title || url,
          company: entry.context.company,
          filledAt: new Date().toISOString(),
          counts: {
            filled: count('filled'),
            skipped: count('skipped'),
            manual: count('needs-manual') + count('failed'),
          },
        });
      } else {
        setPhase({ state: 'error', error: outcome.error });
      }
    } catch (error) {
      setPhase({ state: 'error', error: { message: String(error), kind: 'provider' } });
    }
  }

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
            <button
              className="primary"
              onClick={() => void browser.runtime.openOptionsPage()}
            >
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

              {phase.state === 'busy' && <StepIndicator current={phase.step} />}
              {phase.state === 'done' && <OutcomeList result={phase.result} />}
              {phase.state === 'error' && (
                <ErrorNotice error={phase.error} onRetry={() => void fill()} />
              )}

              {phase.state !== 'done' && (
                <p className="muted small">
                  Fields are filled and highlighted — nothing is ever submitted for you.
                </p>
              )}
            </div>
          </section>
        </>
      ) : (
        <section className="section">
          <div className="section-body">
            <p className="muted">
              Switch to a tab with a job posting to get started — the panel follows your
              active tab.
            </p>
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
      <button
        className="settings-link"
        title="Settings"
        onClick={() => void browser.runtime.openOptionsPage()}
      >
        Settings
      </button>
    </header>
  );
}

function StepIndicator({ current }: { current: FillPhase }) {
  const currentIndex = STEPS.findIndex((step) => step.key === current);
  return (
    <ol className="steps" aria-label="Fill progress">
      {STEPS.map((step, index) => (
        <li
          key={step.key}
          className={
            index < currentIndex ? 'done' : index === currentIndex ? 'active' : ''
          }
        >
          {step.label}
        </li>
      ))}
    </ol>
  );
}
