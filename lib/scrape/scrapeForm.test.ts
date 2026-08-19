import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { beforeEach, describe, expect, it } from 'vitest';
import { scrapePage } from './scrapeForm';
import type { ScrapedField } from './types';

function loadFixture(name: string): void {
  document.body.innerHTML = readFileSync(
    join(__dirname, '../../tests/fixtures', name),
    'utf-8',
  );
}

function byLabel(fields: ScrapedField[], label: string): ScrapedField | undefined {
  return fields.find((field) => field.label.includes(label));
}

beforeEach(() => {
  document.body.innerHTML = '';
});

describe('scrapePage on a greenhouse-like form', () => {
  it('extracts text-like fields with labels, kinds and attributes', () => {
    loadFixture('greenhouse-like.html');
    const { fields } = scrapePage();

    const firstName = byLabel(fields, 'First Name');
    expect(firstName).toMatchObject({
      kind: 'text',
      required: true,
      autocomplete: 'given-name',
      alreadyFilled: false,
    });
    expect(byLabel(fields, 'Email')?.kind).toBe('email');
    expect(byLabel(fields, 'Phone')?.kind).toBe('tel');
  });

  it('keeps hidden file inputs (custom uploaders hide the real input)', () => {
    loadFixture('greenhouse-like.html');
    const { fields } = scrapePage();
    expect(byLabel(fields, 'Resume')?.kind).toBe('file');
  });

  it('collapses radios into one group labeled by the fieldset legend', () => {
    loadFixture('greenhouse-like.html');
    const { fields, registry } = scrapePage();
    const group = fields.find((field) => field.kind === 'radio-group');
    expect(group?.label).toContain('authorized to work');
    expect(group?.options?.map((o) => o.value)).toEqual(['yes', 'no']);
    expect(group?.options?.map((o) => o.label)).toEqual(['Yes', 'No']);
    expect(registry.get(group!.id)).toHaveLength(2);
  });

  it('extracts select options with visible labels', () => {
    loadFixture('greenhouse-like.html');
    const { fields } = scrapePage();
    const select = fields.find((field) => field.kind === 'select');
    expect(select?.options).toEqual([
      { value: '', label: 'Select...' },
      { value: 'linkedin', label: 'LinkedIn' },
      { value: 'referral', label: 'Referral' },
    ]);
  });

  it('skips hidden and submit inputs', () => {
    loadFixture('greenhouse-like.html');
    const { fields } = scrapePage();
    expect(fields.some((field) => field.name === 'token')).toBe(false);
    expect(fields.every((field) => field.kind !== ('submit' as never))).toBe(true);
  });

  it('registers every field id exactly once', () => {
    loadFixture('greenhouse-like.html');
    const { fields, registry } = scrapePage();
    for (const field of fields) {
      expect(registry.has(field.id), field.label).toBe(true);
    }
  });
});

describe('scrapePage label heuristics', () => {
  it('resolves aria-labelledby, aria-label, placeholder and nearby text', () => {
    loadFixture('aria-only.html');
    const { fields } = scrapePage();
    expect(byLabel(fields, 'Full name')).toBeDefined();
    expect(byLabel(fields, 'Preferred pronouns')).toBeDefined();
    expect(byLabel(fields, 'City of residence')).toBeDefined();
    expect(byLabel(fields, 'Expected salary')).toBeDefined();
  });

  it('labels checkboxes from their wrapping label', () => {
    loadFixture('aria-only.html');
    const { fields } = scrapePage();
    const checkbox = fields.find((field) => field.kind === 'checkbox');
    expect(checkbox?.label).toContain('Subscribe to job alerts');
  });
});

describe('scrapePage with shadow DOM', () => {
  it('descends into open shadow roots', () => {
    const host = document.createElement('div');
    document.body.appendChild(host);
    const shadow = host.attachShadow({ mode: 'open' });
    shadow.innerHTML = '<input type="text" aria-label="Shadow field" name="shadow" />';

    const { fields } = scrapePage();
    expect(fields.some((field) => field.label === 'Shadow field')).toBe(true);
  });
});

describe('scrapePage alreadyFilled detection', () => {
  it('marks pre-filled text inputs and checked checkboxes', () => {
    document.body.innerHTML = `
      <input type="text" aria-label="Name" value="Ada" />
      <input type="checkbox" aria-label="Agreed" checked />
      <input type="text" aria-label="Empty" />
    `;
    const { fields } = scrapePage();
    expect(byLabel(fields, 'Name')?.alreadyFilled).toBe(true);
    expect(byLabel(fields, 'Agreed')?.alreadyFilled).toBe(true);
    expect(byLabel(fields, 'Empty')?.alreadyFilled).toBe(false);
  });
});
