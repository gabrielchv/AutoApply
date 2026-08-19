import type { ScrapedField } from '../scrape/types';
import { markFilled, markNeedsManual } from './highlight';
import type { FillResult } from './types';

export interface CvFileData {
  bytes: ArrayBuffer;
  fileName: string;
  mimeType: string;
}

const MANUAL_HINT =
  'AutoApply could not attach your CV here — please attach it manually.';

function tryAttach(input: HTMLInputElement, cv: CvFileData): boolean {
  try {
    const file = new File([cv.bytes], cv.fileName, { type: cv.mimeType });
    const transfer = new DataTransfer();
    transfer.items.add(file);
    input.files = transfer.files;
    input.dispatchEvent(new Event('input', { bubbles: true }));
    input.dispatchEvent(new Event('change', { bubbles: true }));
    // Verify the page actually took it — custom uploaders (Workday, Ashby)
    // sometimes clear the input and expect their own widget flow.
    return input.files !== null && input.files.length === 1;
  } catch {
    return false;
  }
}

/**
 * Attaches the stored CV to every file field found by the scraper. Any
 * failure — no stored CV, a defeated DataTransfer, a widget that rejects the
 * change — downgrades to a visible amber "attach manually" highlight rather
 * than failing the fill.
 */
export function attachCvFile(
  fields: ScrapedField[],
  registry: Map<string, HTMLElement[]>,
  cv: CvFileData | null,
): FillResult['outcomes'] {
  const outcomes: FillResult['outcomes'] = [];

  for (const field of fields) {
    if (field.kind !== 'file' || field.alreadyFilled) continue;
    const input = registry.get(field.id)?.[0];
    if (!(input instanceof HTMLInputElement)) continue;

    if (cv && tryAttach(input, cv)) {
      markFilled(input);
      outcomes.push({ id: field.id, label: field.label, outcome: 'filled' });
    } else {
      // The real input is often display:none behind a custom button; highlight
      // its visible surroundings so the user can find it.
      const highlightTarget =
        input.offsetParent === null ? (input.parentElement ?? input) : input;
      markNeedsManual(highlightTarget, MANUAL_HINT);
      outcomes.push({ id: field.id, label: field.label, outcome: 'needs-manual' });
    }
  }

  return outcomes;
}
