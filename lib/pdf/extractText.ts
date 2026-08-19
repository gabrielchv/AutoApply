import * as pdfjs from 'pdfjs-dist';
import workerUrl from 'pdfjs-dist/build/pdf.worker.min.mjs?url';
import { normalizePdfText } from './normalize';

// The worker must be bundled as an extension asset: MV3's CSP forbids
// fetching it from a CDN at runtime.
pdfjs.GlobalWorkerOptions.workerSrc = workerUrl;

/**
 * Extracts the full text of a PDF. Runs only in extension UI pages (the
 * options page) — never in the background service worker, which lacks the
 * APIs pdf.js needs.
 */
export async function extractPdfText(data: ArrayBuffer): Promise<string> {
  const loadingTask = pdfjs.getDocument({ data });
  const document = await loadingTask.promise;
  try {
    const pages: string[] = [];
    for (let pageNumber = 1; pageNumber <= document.numPages; pageNumber++) {
      const page = await document.getPage(pageNumber);
      const content = await page.getTextContent();
      const text = content.items.map((item) => ('str' in item ? item.str : '')).join(' ');
      pages.push(text);
    }
    return normalizePdfText(pages);
  } finally {
    await loadingTask.destroy();
  }
}
