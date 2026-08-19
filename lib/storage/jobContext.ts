import { storage } from 'wxt/utils/storage';
import type { ExtractedJobContext } from '../jobContext/types';
import { normalizeUrl } from '../jobContext/normalizeUrl';

export interface JobEntry {
  context: ExtractedJobContext;
  notes: string;
  updatedAt: string;
}

const MAX_ENTRIES = 100;

const jobContextsItem = storage.defineItem<Record<string, JobEntry>>(
  'local:jobContexts',
  { fallback: {} },
);

export async function loadJobEntry(url: string): Promise<JobEntry | null> {
  const all = await jobContextsItem.getValue();
  return all[normalizeUrl(url)] ?? null;
}

/**
 * Upserts the entry for a posting; evicts the least-recently-updated entries
 * past the cap so revisiting old postings stays cheap without unbounded
 * storage growth.
 */
export async function saveJobEntry(
  url: string,
  entry: Omit<JobEntry, 'updatedAt'> & { updatedAt?: string },
): Promise<void> {
  const all = await jobContextsItem.getValue();
  all[normalizeUrl(url)] = {
    ...entry,
    updatedAt: entry.updatedAt ?? new Date().toISOString(),
  };

  const keys = Object.keys(all);
  if (keys.length > MAX_ENTRIES) {
    keys
      .sort((a, b) => (all[a]!.updatedAt < all[b]!.updatedAt ? -1 : 1))
      .slice(0, keys.length - MAX_ENTRIES)
      .forEach((key) => delete all[key]);
  }

  await jobContextsItem.setValue(all);
}
