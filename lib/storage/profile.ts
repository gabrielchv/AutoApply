import { storage } from 'wxt/utils/storage';
import type { Profile } from '../profile/schema';
import { profileSchema } from '../profile/schema';

const profileItem = storage.defineItem<unknown>('local:profile', { fallback: null });

/**
 * Returns the stored profile, or null when absent or no longer valid against
 * the current schema (e.g. after a breaking upgrade).
 */
export async function loadProfile(): Promise<Profile | null> {
  const raw = await profileItem.getValue();
  if (raw === null) return null;
  const parsed = profileSchema.safeParse(raw);
  return parsed.success ? parsed.data : null;
}

export function saveProfile(profile: Profile): Promise<void> {
  return profileItem.setValue(profile);
}

export function clearProfile(): Promise<void> {
  return profileItem.removeValue();
}
