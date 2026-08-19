import { browser } from 'wxt/browser';
import { handleBackgroundMessage } from '../lib/background/handlers';
import type { BackgroundRequest } from '../lib/messaging/protocol';

export default defineBackground(() => {
  browser.runtime.onMessage.addListener(
    (message: unknown, _sender, sendResponse: (response: unknown) => void) => {
      handleBackgroundMessage(message as BackgroundRequest).then(sendResponse);
      // Keep the channel open for the async response (required in Chrome).
      return true;
    },
  );
});
