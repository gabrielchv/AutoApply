import { useCallback, useEffect, useRef, useState } from 'react';
import type { ExtractedJobContext } from '../../../lib/jobContext/types';
import { sendToTab } from '../../../lib/messaging/protocol';
import { loadJobEntry, saveJobEntry } from '../../../lib/storage/jobContext';

export interface JobEntryState {
  context: ExtractedJobContext;
  notes: string;
}

const EMPTY: JobEntryState = { context: { source: 'none' }, notes: '' };
const RETRY_DELAY_MS = 1500;
const PERSIST_DEBOUNCE_MS = 400;

/**
 * The per-posting context: restored from storage when the user returns to a
 * posting, freshly extracted from the page otherwise (with one delayed retry
 * for JS-rendered pages). Edits and notes persist debounced, keyed by
 * normalized URL.
 */
export function useJobEntry(tabId: number | null, url: string | null) {
  const [entry, setEntry] = useState<JobEntryState>(EMPTY);
  const [extracting, setExtracting] = useState(false);
  const persistTimer = useRef<ReturnType<typeof setTimeout>>(undefined);
  // Guards against a slow extraction landing after the user switched tabs.
  const sessionUrl = useRef<string | null>(null);

  const persist = useCallback((next: JobEntryState, targetUrl: string) => {
    clearTimeout(persistTimer.current);
    persistTimer.current = setTimeout(() => {
      void saveJobEntry(targetUrl, next);
    }, PERSIST_DEBOUNCE_MS);
  }, []);

  const extract = useCallback(async (targetTabId: number, targetUrl: string) => {
    setExtracting(true);
    try {
      let context: ExtractedJobContext = { source: 'none' };
      try {
        context = await sendToTab(targetTabId, { type: 'EXTRACT_JOB_CONTEXT' }, 0);
      } catch {
        // Content script not there (restricted page) — keep 'none'.
      }
      if (context.source === 'none') {
        await new Promise((resolve) => setTimeout(resolve, RETRY_DELAY_MS));
        if (sessionUrl.current !== targetUrl) return;
        try {
          context = await sendToTab(targetTabId, { type: 'EXTRACT_JOB_CONTEXT' }, 0);
        } catch {
          /* keep 'none' */
        }
      }
      if (sessionUrl.current !== targetUrl) return;
      setEntry((previous) => {
        const next = { ...previous, context };
        if (context.source !== 'none') void saveJobEntry(targetUrl, next);
        return next;
      });
    } finally {
      if (sessionUrl.current === targetUrl) setExtracting(false);
    }
  }, []);

  // Reset synchronously when the posting changes — the official "adjusting
  // state when a prop changes" pattern, so stale context never flashes.
  const [lastUrl, setLastUrl] = useState<string | null>(url);
  if (lastUrl !== url) {
    setLastUrl(url);
    setEntry(EMPTY);
  }

  useEffect(() => {
    sessionUrl.current = url;
    if (tabId === null || !url) return;
    void (async () => {
      const stored = await loadJobEntry(url);
      if (sessionUrl.current !== url) return;
      if (stored) {
        setEntry({ context: stored.context, notes: stored.notes });
      } else {
        void extract(tabId, url);
      }
    })();
    return () => clearTimeout(persistTimer.current);
  }, [tabId, url, extract]);

  const updateContext = useCallback(
    (patch: Partial<ExtractedJobContext>) => {
      if (!url) return;
      setEntry((previous) => {
        const next = { ...previous, context: { ...previous.context, ...patch } };
        persist(next, url);
        return next;
      });
    },
    [url, persist],
  );

  const updateNotes = useCallback(
    (notes: string) => {
      if (!url) return;
      setEntry((previous) => {
        const next = { ...previous, notes };
        persist(next, url);
        return next;
      });
    },
    [url, persist],
  );

  const reextract = useCallback(() => {
    if (tabId === null || !url) return;
    void extract(tabId, url);
  }, [tabId, url, extract]);

  return { entry, extracting, updateContext, updateNotes, reextract };
}
