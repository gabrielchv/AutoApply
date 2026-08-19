import { browser } from 'wxt/browser';
import type { JobContextForPrompt } from '../jobContext/types';
import type { ErrorPayload, ScrapeResult } from '../messaging/protocol';
import { sendToBackground, sendToTab } from '../messaging/protocol';
import type { PageContext } from '../scrape/types';
import type { FillResult } from './types';

export interface FrameScrape {
  frameId: number;
  scrape: ScrapeResult;
}

export type FillPhase = 'scanning' | 'mapping' | 'filling';

export type RunFillOutcome =
  | { ok: true; result: FillResult; pageContext: PageContext }
  | { ok: false; error: ErrorPayload };

/** Scrapes every frame of the tab; frames without our script are skipped. */
export async function scrapeAllFrames(tabId: number): Promise<FrameScrape[]> {
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

/**
 * The whole fill pipeline for one tab: scrape all frames, target the one
 * with the most fields (job boards commonly embed the form in an iframe),
 * map via the background LLM call, apply the plan. UI-free — callers render
 * progress via onPhase.
 */
export async function runFill(
  tabId: number,
  jobContext: JobContextForPrompt | undefined,
  onPhase: (phase: FillPhase) => void,
): Promise<RunFillOutcome> {
  onPhase('scanning');
  const scrapes = await scrapeAllFrames(tabId);
  const best = scrapes.sort((a, b) => b.scrape.fields.length - a.scrape.fields.length)[0];
  if (!best || best.scrape.fields.length === 0) {
    return {
      ok: false,
      error: { message: 'No fillable form found on this page.', kind: 'empty' },
    };
  }

  onPhase('mapping');
  const mapped = await sendToBackground({
    type: 'MAP_FORM',
    fields: best.scrape.fields,
    pageContext: best.scrape.pageContext,
    jobContext,
  });
  if (!mapped.ok) return { ok: false, error: mapped.error };

  onPhase('filling');
  const result = await sendToTab(
    tabId,
    { type: 'APPLY_PLAN', plan: mapped.value },
    best.frameId,
  );
  return { ok: true, result, pageContext: best.scrape.pageContext };
}
