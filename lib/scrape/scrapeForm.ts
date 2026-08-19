import { resolveLabel } from './labels';
import type { FieldOption, ScrapedField, ScrapedFieldKind } from './types';

export interface ScrapeOutcome {
  fields: ScrapedField[];
  /** Synthetic field id → the concrete element(s); radio groups hold all radios. */
  registry: Map<string, HTMLElement[]>;
}

type Control = HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement;

const SKIPPED_INPUT_TYPES = new Set([
  'hidden',
  'submit',
  'button',
  'reset',
  'image',
  'password',
]);

const TEXTLIKE_KINDS: Record<string, ScrapedFieldKind> = {
  text: 'text',
  email: 'email',
  tel: 'tel',
  url: 'url',
  number: 'number',
  date: 'date',
  search: 'text',
};

/**
 * True when the control (or a close ancestor) is display:none / hidden.
 * File inputs are exempt: custom uploader widgets routinely hide the real
 * input, and it is exactly the element we must attach to.
 */
function isHidden(el: HTMLElement): boolean {
  let node: HTMLElement | null = el;
  for (let depth = 0; node && depth < 5; depth++) {
    if (node.hidden) return true;
    const style = node.ownerDocument.defaultView?.getComputedStyle(node);
    if (style && (style.display === 'none' || style.visibility === 'hidden')) {
      return true;
    }
    node = node.parentElement;
  }
  return false;
}

function collectControls(root: ParentNode, out: Control[]): void {
  for (const el of root.querySelectorAll('input, textarea, select')) {
    out.push(el as Control);
  }
  // Descend into open shadow roots (closed ones are a documented limitation).
  for (const el of root.querySelectorAll('*')) {
    if (el.shadowRoot) collectControls(el.shadowRoot, out);
  }
}

function eligible(control: Control): boolean {
  if (control.disabled) return false;
  if (control instanceof HTMLInputElement) {
    if (SKIPPED_INPUT_TYPES.has(control.type)) return false;
    if (control.readOnly) return false;
    if (control.type === 'file') return true;
  }
  if (control instanceof HTMLTextAreaElement && control.readOnly) return false;
  return !isHidden(control);
}

function selectOptions(select: HTMLSelectElement): FieldOption[] {
  return Array.from(select.options).map((option) => ({
    value: option.value,
    label: (option.textContent ?? '').trim() || option.value,
  }));
}

function radioGroupLabel(radios: HTMLInputElement[]): string {
  const fieldset = radios[0]?.closest('fieldset');
  const legend = fieldset?.querySelector('legend');
  const legendText = (legend?.textContent ?? '').replace(/\s+/g, ' ').trim();
  if (legendText) return legendText.slice(0, 120);
  return radios[0]?.name ?? '';
}

/**
 * Scrapes every fillable control under `root` into LLM-ready field
 * descriptions. Radios sharing a name collapse into one radio-group field
 * whose options carry each radio's own label. The page is never mutated —
 * field ids live only in the returned registry.
 */
export function scrapePage(root: ParentNode = document): ScrapeOutcome {
  const controls: Control[] = [];
  collectControls(root, controls);

  const fields: ScrapedField[] = [];
  const registry = new Map<string, HTMLElement[]>();
  const radioGroups = new Map<string, HTMLInputElement[]>();
  let counter = 0;
  const nextId = () => `f${counter++}`;

  for (const control of controls) {
    if (!eligible(control)) continue;

    if (control instanceof HTMLInputElement && control.type === 'radio') {
      const key = control.name || nextId();
      const group = radioGroups.get(key) ?? [];
      group.push(control);
      radioGroups.set(key, group);
      continue;
    }

    const id = nextId();
    const base = {
      id,
      label: resolveLabel(control),
      name: control.name || undefined,
      htmlId: control.id || undefined,
      required: control.required,
      alreadyFilled: false,
    };

    if (control instanceof HTMLSelectElement) {
      fields.push({
        ...base,
        kind: 'select',
        options: selectOptions(control),
        alreadyFilled: control.value !== '' && control.selectedIndex > 0,
      });
    } else if (control instanceof HTMLTextAreaElement) {
      fields.push({
        ...base,
        kind: 'textarea',
        placeholder: control.getAttribute('placeholder') ?? undefined,
        maxLength: control.maxLength > 0 ? control.maxLength : undefined,
        alreadyFilled: control.value.trim() !== '',
      });
    } else if (control.type === 'checkbox') {
      fields.push({ ...base, kind: 'checkbox', alreadyFilled: control.checked });
    } else if (control.type === 'file') {
      fields.push({ ...base, kind: 'file', alreadyFilled: control.files!.length > 0 });
    } else {
      const kind = TEXTLIKE_KINDS[control.type] ?? 'text';
      fields.push({
        ...base,
        kind,
        placeholder: control.getAttribute('placeholder') ?? undefined,
        autocomplete: control.getAttribute('autocomplete') ?? undefined,
        maxLength: control.maxLength > 0 ? control.maxLength : undefined,
        alreadyFilled: control.value.trim() !== '',
      });
    }
    registry.set(id, [control]);
  }

  for (const radios of radioGroups.values()) {
    const id = nextId();
    fields.push({
      id,
      kind: 'radio-group',
      label: radioGroupLabel(radios),
      name: radios[0]?.name,
      required: radios.some((radio) => radio.required),
      options: radios.map((radio) => ({
        value: radio.value,
        label: resolveLabel(radio) || radio.value,
      })),
      alreadyFilled: radios.some((radio) => radio.checked),
    });
    registry.set(id, radios);
  }

  return { fields, registry };
}
