import { storage } from 'wxt/utils/storage';
import { normalizeUrl } from '../jobContext/normalizeUrl';

export interface HistoryEntry {
  /** Normalized posting URL — the upsert key. */
  url: string;
  title: string;
  company?: string;
  /** ISO timestamp of the most recent fill of this posting. */
  filledAt: string;
  counts: { filled: number; skipped: number; manual: number };
}

const MAX_ENTRIES = 200;

const historyItem = storage.defineItem<HistoryEntry[]>('local:fillHistory', {
  fallback: [],
});

export function loadHistory(): Promise<HistoryEntry[]> {
  return historyItem.getValue();
}

/**
 * Records a fill: newest first, re-filling the same posting updates the
 * existing entry and moves it to the front. Capped so history stays light.
 */
export async function recordFill(entry: HistoryEntry): Promise<void> {
  const url = normalizeUrl(entry.url);
  const history = await historyItem.getValue();
  const rest = history.filter((item) => item.url !== url);
  rest.unshift({ ...entry, url });
  await historyItem.setValue(rest.slice(0, MAX_ENTRIES));
}

export function clearHistory(): Promise<void> {
  return historyItem.removeValue();
}
