import { useCallback, useEffect, useState } from 'react';
import { loadProfile } from '../../lib/storage/profile';
import { loadLlmSettings } from '../../lib/storage/settings';

export interface SetupStatus {
  hasProvider: boolean;
  hasProfile: boolean;
}

/**
 * Which setup steps are done. Drives the guided order — the LLM provider must
 * be configured before a CV can be structured — so both tabs and the first
 * screen the user lands on stay in sync.
 */
export function useSetupStatus() {
  const [status, setStatus] = useState<SetupStatus | null>(null);

  const refresh = useCallback(async () => {
    const [settings, profile] = await Promise.all([loadLlmSettings(), loadProfile()]);
    setStatus({ hasProvider: settings !== null, hasProfile: profile !== null });
  }, []);

  useEffect(() => {
    Promise.all([loadLlmSettings(), loadProfile()])
      .then(([settings, profile]) => {
        setStatus({ hasProvider: settings !== null, hasProfile: profile !== null });
      })
      .catch(() => setStatus({ hasProvider: false, hasProfile: false }));
  }, []);

  return { status, refresh };
}
