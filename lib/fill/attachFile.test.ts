import { beforeEach, describe, expect, it } from 'vitest';
import { scrapePage } from '../scrape/scrapeForm';
import { attachCvFile } from './attachFile';
import type { CvFileData } from './attachFile';

const cv: CvFileData = {
  bytes: new TextEncoder().encode('%PDF-1.4').buffer as ArrayBuffer,
  fileName: 'cv.pdf',
  mimeType: 'application/pdf',
};

beforeEach(() => {
  document.body.innerHTML = '';
});

describe('attachCvFile', () => {
  it('attaches the CV to a file input and dispatches change', () => {
    document.body.innerHTML =
      '<label for="resume">Resume</label><input type="file" id="resume" />';
    const input = document.querySelector<HTMLInputElement>('input')!;
    let changed = false;
    input.addEventListener('change', () => (changed = true));

    const { fields, registry } = scrapePage();
    const outcomes = attachCvFile(fields, registry, cv);

    expect(input.files?.length).toBe(1);
    expect(input.files?.[0]?.name).toBe('cv.pdf');
    expect(changed).toBe(true);
    expect(outcomes).toEqual([{ id: fields[0]!.id, label: 'Resume', outcome: 'filled' }]);
  });

  it('falls back to needs-manual when no CV is stored', () => {
    document.body.innerHTML =
      '<label for="resume">Resume</label><input type="file" id="resume" />';
    const { fields, registry } = scrapePage();

    const outcomes = attachCvFile(fields, registry, null);

    expect(outcomes[0]?.outcome).toBe('needs-manual');
    const input = document.querySelector('input')!;
    expect(
      input.classList.contains('autoapply-manual') ||
        input.parentElement?.classList.contains('autoapply-manual'),
    ).toBe(true);
  });

  it('skips file inputs that already hold a file', () => {
    document.body.innerHTML =
      '<label for="resume">Resume</label><input type="file" id="resume" />';
    const input = document.querySelector<HTMLInputElement>('input')!;
    const transfer = new DataTransfer();
    transfer.items.add(new File(['x'], 'existing.pdf'));
    input.files = transfer.files;

    const { fields, registry } = scrapePage();
    const outcomes = attachCvFile(fields, registry, cv);

    expect(outcomes).toEqual([]);
    expect(input.files?.[0]?.name).toBe('existing.pdf');
  });

  it('ignores non-file fields entirely', () => {
    document.body.innerHTML = '<input type="text" aria-label="Name" />';
    const { fields, registry } = scrapePage();
    expect(attachCvFile(fields, registry, cv)).toEqual([]);
  });
});
