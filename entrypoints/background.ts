import { browser } from 'wxt/browser';
import { handleBackgroundMessage } from '../lib/background/handlers';
import type { BackgroundRequest } from '../lib/messaging/protocol';

/** Chrome-only side panel API, not yet in the cross-browser typings. */
interface SidePanelApi {
  setPanelBehavior(behavior: { openPanelOnActionClick: boolean }): Promise<void>;
}

interface SidebarActionApi {
  toggle(): Promise<void>;
}

export default defineBackground(() => {
  const chromeSidePanel = (browser as { sidePanel?: SidePanelApi }).sidePanel;
  if (chromeSidePanel) {
    // Idempotent; must run on every service worker start.
    void chromeSidePanel.setPanelBehavior({ openPanelOnActionClick: true });
  } else {
    const sidebar = (browser as { sidebarAction?: SidebarActionApi }).sidebarAction;
    const action = browser.browserAction ?? browser.action;
    if (sidebar && action) {
      action.onClicked.addListener(() => {
        // Must be called synchronously inside the user-gesture handler.
        void sidebar.toggle();
      });
    }
  }

  browser.runtime.onMessage.addListener(
    (message: unknown, _sender, sendResponse: (response: unknown) => void) => {
      handleBackgroundMessage(message as BackgroundRequest).then(sendResponse);
      // Keep the channel open for the async response (required in Chrome).
      return true;
    },
  );
});
