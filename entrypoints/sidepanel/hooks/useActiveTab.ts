import { useEffect, useState } from 'react';
import { browser } from 'wxt/browser';

export interface ActiveTab {
  tabId: number | null;
  /** http(s) URL of the active tab, or null for restricted/internal pages. */
  url: string | null;
}

function usableUrl(url: string | undefined): string | null {
  return url && /^https?:/.test(url) ? url : null;
}

/**
 * Tracks the tab the user is looking at. The side panel is one long-lived
 * document shared across tab switches, so all per-tab state must derive from
 * this — never from a captured tab id.
 */
export function useActiveTab(): ActiveTab {
  const [active, setActive] = useState<ActiveTab>({ tabId: null, url: null });

  useEffect(() => {
    let disposed = false;

    const refresh = async () => {
      const [tab] = await browser.tabs.query({ active: true, currentWindow: true });
      if (disposed) return;
      setActive({ tabId: tab?.id ?? null, url: usableUrl(tab?.url) });
    };

    void refresh();

    const onActivated = () => void refresh();

    const onUpdated = (
      tabId: number,
      changeInfo: { url?: string; status?: string },
      tab: { active?: boolean },
    ) => {
      // Partial events fire constantly; only a URL change or a completed load
      // of the active tab matters.
      if (!tab.active) return;
      if (changeInfo.url || changeInfo.status === 'complete') void refresh();
    };

    // SPA job boards (Lever, Greenhouse embeds) navigate via history.pushState
    // without a tabs.onUpdated URL event.
    const onHistoryState = (details: { frameId: number }) => {
      if (details.frameId === 0) void refresh();
    };

    browser.tabs.onActivated.addListener(onActivated);
    browser.tabs.onUpdated.addListener(onUpdated);
    browser.webNavigation.onHistoryStateUpdated.addListener(onHistoryState);

    return () => {
      disposed = true;
      browser.tabs.onActivated.removeListener(onActivated);
      browser.tabs.onUpdated.removeListener(onUpdated);
      browser.webNavigation.onHistoryStateUpdated.removeListener(onHistoryState);
    };
  }, []);

  return active;
}
