import { browser } from 'wxt/browser';
import { attachCvFile } from '../lib/fill/attachFile';
import { applyPlan } from '../lib/fill/fillField';
import type { FillResult } from '../lib/fill/types';
import { extractJobContext } from '../lib/jobContext/extract';
import type { ContentRequest, ScrapeResult } from '../lib/messaging/protocol';
import { sendToBackground } from '../lib/messaging/protocol';
import type { ScrapeOutcome } from '../lib/scrape/scrapeForm';
import { scrapePage } from '../lib/scrape/scrapeForm';

export default defineContentScript({
  matches: ['<all_urls>'],
  allFrames: true,
  main() {
    // The scrape that produced the ids the popup is acting on. Held in
    // memory only — a reload invalidates the plan, which is correct.
    let session: ScrapeOutcome | null = null;

    function handleScrape(): ScrapeResult {
      session = scrapePage();
      return {
        fields: session.fields,
        pageContext: {
          url: location.href,
          title: document.title,
          heading: document.querySelector('h1')?.textContent?.trim() || undefined,
        },
      };
    }

    async function handleApply(
      plan: Parameters<typeof applyPlan>[0],
    ): Promise<FillResult> {
      if (!session) return { outcomes: [] };
      const result = applyPlan(plan, session.fields, session.registry);

      // File fields: fetch the stored CV from the background (IndexedDB is
      // per-origin, so the bytes must come from the extension side).
      const cvResponse = await sendToBackground({ type: 'GET_CV_FILE' });
      const cv = cvResponse.ok ? cvResponse.value : null;
      result.outcomes.push(...attachCvFile(session.fields, session.registry, cv));

      return result;
    }

    browser.runtime.onMessage.addListener(
      (message: unknown, _sender, sendResponse: (response: unknown) => void) => {
        const request = message as ContentRequest;
        switch (request.type) {
          case 'SCRAPE_REQUEST':
            sendResponse(handleScrape());
            return undefined;
          case 'APPLY_PLAN':
            void handleApply(request.plan).then(sendResponse);
            return true;
          case 'EXTRACT_JOB_CONTEXT':
            // Job descriptions live in the top frame; embedded form frames
            // stay silent so the panel gets exactly one answer.
            if (window.top !== window) return undefined;
            sendResponse(extractJobContext(document));
            return undefined;
          default:
            return undefined;
        }
      },
    );
  },
});
