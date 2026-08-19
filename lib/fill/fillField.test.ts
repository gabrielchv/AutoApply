import { beforeEach, describe, expect, it, vi } from 'vitest';
import { scrapePage } from '../scrape/scrapeForm';
import { applyPlan } from './fillField';

beforeEach(() => {
  document.body.innerHTML = '';
  document.head.querySelector('#autoapply-styles')?.remove();
});

describe('applyPlan', () => {
  it('fills text inputs and dispatches input/change events', () => {
    document.body.innerHTML = '<input type="text" aria-label="First name" />';
    const input = document.querySelector('input')!;
    const seen: string[] = [];
    input.addEventListener('input', () => seen.push('input'));
    input.addEventListener('change', () => seen.push('change'));

    const { fields, registry } = scrapePage();
    const result = applyPlan(
      { fields: [{ id: fields[0]!.id, action: 'fill', value: 'Ada' }] },
      fields,
      registry,
    );

    expect(input.value).toBe('Ada');
    expect(seen).toEqual(['input', 'change']);
    expect(result.outcomes).toEqual([
      { id: fields[0]!.id, label: 'First name', outcome: 'filled' },
    ]);
    expect(input.classList.contains('autoapply-filled')).toBe(true);
  });

  it('selects options by value, falling back to visible label', () => {
    document.body.innerHTML = `
      <select aria-label="Country">
        <option value="">Pick</option>
        <option value="br">Brazil</option>
      </select>`;
    const select = document.querySelector('select')!;
    const { fields, registry } = scrapePage();

    applyPlan(
      { fields: [{ id: fields[0]!.id, action: 'select', value: 'Brazil' }] },
      fields,
      registry,
    );
    expect(select.value).toBe('br');
  });

  it('clicks the matching radio in a group', () => {
    document.body.innerHTML = `
      <fieldset>
        <legend>Authorized?</legend>
        <label><input type="radio" name="auth" value="yes" /> Yes</label>
        <label><input type="radio" name="auth" value="no" /> No</label>
      </fieldset>`;
    const { fields, registry } = scrapePage();
    const group = fields.find((field) => field.kind === 'radio-group')!;

    const result = applyPlan(
      { fields: [{ id: group.id, action: 'select', value: 'yes' }] },
      fields,
      registry,
    );

    const yes = document.querySelector<HTMLInputElement>('input[value="yes"]')!;
    expect(yes.checked).toBe(true);
    expect(result.outcomes[0]?.outcome).toBe('filled');
  });

  it('checks checkboxes only on the check action', () => {
    document.body.innerHTML = '<label><input type="checkbox" /> Agree</label>';
    const { fields, registry } = scrapePage();
    const box = document.querySelector<HTMLInputElement>('input')!;

    applyPlan({ fields: [{ id: fields[0]!.id, action: 'check' }] }, fields, registry);
    expect(box.checked).toBe(true);
  });

  it('records skips without touching the element', () => {
    document.body.innerHTML = '<input type="text" aria-label="Salary" />';
    const { fields, registry } = scrapePage();

    const result = applyPlan(
      { fields: [{ id: fields[0]!.id, action: 'skip', reason: 'unknown' }] },
      fields,
      registry,
    );

    expect(document.querySelector('input')!.value).toBe('');
    expect(result.outcomes[0]?.outcome).toBe('skipped');
  });

  it('marks unmatchable selects as failed with an amber highlight', () => {
    document.body.innerHTML = `
      <select aria-label="Source"><option value="a">A</option></select>`;
    const { fields, registry } = scrapePage();

    const result = applyPlan(
      { fields: [{ id: fields[0]!.id, action: 'select', value: 'nonexistent' }] },
      fields,
      registry,
    );

    expect(result.outcomes[0]?.outcome).toBe('failed');
    expect(document.querySelector('select')!.classList.contains('autoapply-manual')).toBe(
      true,
    );
  });

  it('never submits the surrounding form', () => {
    document.body.innerHTML = `
      <form><input type="text" aria-label="Name" /></form>`;
    const form = document.querySelector('form')!;
    const submitSpy = vi.fn();
    form.addEventListener('submit', submitSpy);
    const { fields, registry } = scrapePage();

    applyPlan(
      { fields: [{ id: fields[0]!.id, action: 'fill', value: 'Ada' }] },
      fields,
      registry,
    );
    expect(submitSpy).not.toHaveBeenCalled();
  });
});
