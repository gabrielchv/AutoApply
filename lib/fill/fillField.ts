import type { ScrapedField } from '../scrape/types';
import { markFilled, markNeedsManual } from './highlight';
import type { FieldOutcome, FillPlan, FillResult } from './types';

type ValueElement = HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement;

/**
 * Sets a control's value through the prototype's native setter. Frameworks
 * (React in particular) patch the instance property; writing via the native
 * setter plus dispatching input/change is the only way the page's own state
 * management notices the change.
 */
function setNativeValue(el: ValueElement, value: string): void {
  const prototype =
    el instanceof HTMLTextAreaElement
      ? HTMLTextAreaElement.prototype
      : el instanceof HTMLSelectElement
        ? HTMLSelectElement.prototype
        : HTMLInputElement.prototype;
  const setter = Object.getOwnPropertyDescriptor(prototype, 'value')?.set;
  if (setter) {
    setter.call(el, value);
  } else {
    el.value = value;
  }
}

function dispatchEdit(el: HTMLElement): void {
  el.dispatchEvent(new Event('input', { bubbles: true }));
  el.dispatchEvent(new Event('change', { bubbles: true }));
}

function fillTextLike(
  el: HTMLInputElement | HTMLTextAreaElement,
  value: string,
): boolean {
  el.focus();
  setNativeValue(el, value);
  dispatchEdit(el);
  // Some validators (Workday-style) only run on blur.
  el.blur();
  return el.value === value;
}

function fillSelect(select: HTMLSelectElement, value: string): boolean {
  const options = Array.from(select.options);
  const match =
    options.find((option) => option.value === value) ??
    options.find(
      (option) =>
        (option.textContent ?? '').trim().toLowerCase() === value.trim().toLowerCase(),
    );
  if (!match) return false;
  select.focus();
  setNativeValue(select, match.value);
  dispatchEdit(select);
  select.blur();
  return select.value === match.value;
}

function selectRadio(radios: HTMLElement[], value: string): boolean {
  const inputs = radios.filter(
    (el): el is HTMLInputElement => el instanceof HTMLInputElement,
  );
  const match =
    inputs.find((radio) => radio.value === value) ??
    inputs.find(
      (radio) =>
        (radio.closest('label')?.textContent ?? '').trim().toLowerCase() ===
        value.trim().toLowerCase(),
    );
  if (!match) return false;
  // click() fires the full event chain frameworks listen for.
  match.click();
  return match.checked;
}

function checkBox(el: HTMLInputElement): boolean {
  if (!el.checked) el.click();
  return el.checked;
}

/**
 * Applies a fill plan to the live page. File fields are never filled here —
 * attachment has its own flow — and nothing in this module ever submits.
 */
export function applyPlan(
  plan: FillPlan,
  fields: ScrapedField[],
  registry: Map<string, HTMLElement[]>,
): FillResult {
  const fieldById = new Map(fields.map((field) => [field.id, field]));
  const outcomes: FillResult['outcomes'] = [];

  for (const planned of plan.fields) {
    const field = fieldById.get(planned.id);
    const elements = registry.get(planned.id);
    const el = elements?.[0];
    if (!field || !el) continue;

    const record = (outcome: FieldOutcome) =>
      outcomes.push({ id: field.id, label: field.label, outcome });

    if (planned.action === 'skip' || field.kind === 'file') {
      record('skipped');
      continue;
    }

    let success = false;
    if (field.kind === 'radio-group' && planned.value !== undefined) {
      success = selectRadio(elements ?? [], planned.value);
      if (success) markFilled(el.closest('fieldset') ?? el);
    } else if (field.kind === 'select' && planned.value !== undefined) {
      success = fillSelect(el as HTMLSelectElement, planned.value);
      if (success) markFilled(el);
    } else if (field.kind === 'checkbox') {
      success = planned.action === 'check' && checkBox(el as HTMLInputElement);
      if (success) markFilled(el);
    } else if (planned.value !== undefined) {
      success = fillTextLike(el as HTMLInputElement | HTMLTextAreaElement, planned.value);
      if (success) markFilled(el);
    }

    if (success) {
      record('filled');
    } else {
      markNeedsManual(
        el,
        'AutoApply could not fill this field — please handle it manually.',
      );
      record('failed');
    }
  }

  return { outcomes };
}
