import { useEffect, useState } from 'react';
import { browser } from 'wxt/browser';
import type { FillResult } from '../../lib/fill/types';
import type { ScrapeResult } from '../../lib/messaging/protocol';
import { sendToBackground, sendToTab } from '../../lib/messaging/protocol';
import { loadProfile } from '../../lib/storage/profile';
import { loadLlmSettings } from '../../lib/storage/settings';

type Phase =
  | { state: 'checking' }
  | { state: 'unconfigured'; missing: 'settings' | 'profile' }
  | { state: 'ready' }
  | { state: 'busy'; message: string }
  | { state: 'done'; result: FillResult }
  | { state: 'error'; message: string };

interface FrameScrape {
  frameId: number;
  scrape: ScrapeResult;
}

async function scrapeAllFrames(tabId: number): Promise<FrameScrape[]> {
  const frames = (await browser.webNavigation.getAllFrames({ tabId })) ?? [];
  const results = await Promise.all(
    frames.map(async ({ frameId }) => {
      try {
        const scrape = await sendToTab(tabId, { type: 'SCRAPE_REQUEST' }, frameId);
        return scrape ? { frameId, scrape } : null;
      } catch {
        // Frame without our content script (e.g. chrome://, PDF viewer).
        return null;
      }
    }),
  );
  return results.filter((entry): entry is FrameScrape => entry !== null);
}

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
      setPhase({ state: 'busy', message: 'Scanning the page…' });
      const [tab] = await browser.tabs.query({ active: true, currentWindow: true });
      if (!tab?.id) throw new Error('No active tab.');

      const scrapes = await scrapeAllFrames(tab.id);
      // Job boards are often embedded in an iframe; fill the frame with the
      // most fields (v1: one frame per run).
      const best = scrapes.sort(
        (a, b) => b.scrape.fields.length - a.scrape.fields.length,
      )[0];
      if (!best || best.scrape.fields.length === 0) {
        setPhase({ state: 'error', message: 'No fillable form found on this page.' });
        return;
      }

      setPhase({ state: 'busy', message: 'Asking your LLM to map the form…' });
      const mapped = await sendToBackground({
        type: 'MAP_FORM',
        fields: best.scrape.fields,
        pageContext: best.scrape.pageContext,
      });
      if (!mapped.ok) {
        setPhase({ state: 'error', message: mapped.error.message });
        return;
      }

      setPhase({ state: 'busy', message: 'Filling…' });
      const result = await sendToTab(
        tab.id,
        { type: 'APPLY_PLAN', plan: mapped.value },
        best.frameId,
      );
      setPhase({ state: 'done', result });
    } catch (error) {
      setPhase({ state: 'error', message: String(error) });
    }
  }

  const openOptions = () => void browser.runtime.openOptionsPage();

  return (
    <main className="popup">
      <h1>AutoApply</h1>

      {phase.state === 'unconfigured' && (
        <>
          <p>
            {phase.missing === 'settings'
              ? 'Configure your LLM provider first.'
              : 'Upload your CV to build a profile first.'}
          </p>
          <button className="primary" onClick={openOptions}>
            Open settings
          </button>
        </>
      )}

      {(phase.state === 'ready' || phase.state === 'busy') && (
        <>
          <button
            className="primary"
            disabled={phase.state === 'busy'}
            onClick={() => void fill()}
          >
            Fill this page
          </button>
          {phase.state === 'busy' && <p className="muted">{phase.message}</p>}
          <p className="muted small">
            Fields are filled and highlighted — nothing is ever submitted for you.
          </p>
        </>
      )}

      {phase.state === 'done' && <Summary result={phase.result} onAgain={fill} />}

      {phase.state === 'error' && (
        <>
          <p className="error">{phase.message}</p>
          <button className="primary" onClick={() => void fill()}>
            Try again
          </button>
        </>
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
