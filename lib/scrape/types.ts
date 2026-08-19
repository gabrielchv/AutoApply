export type ScrapedFieldKind =
  | 'text'
  | 'email'
  | 'tel'
  | 'url'
  | 'number'
  | 'date'
  | 'textarea'
  | 'select'
  | 'radio-group'
  | 'checkbox'
  | 'file';

export interface FieldOption {
  value: string;
  label: string;
}

/**
 * One fillable field as reported to the LLM. `id` is a synthetic session-local
 * handle ("f0", "f1", ...); the content script keeps the id → element registry
 * in memory and never mutates the page to track fields.
 */
export interface ScrapedField {
  id: string;
  kind: ScrapedFieldKind;
  label: string;
  name?: string;
  htmlId?: string;
  placeholder?: string;
  autocomplete?: string;
  required: boolean;
  maxLength?: number;
  options?: FieldOption[];
  alreadyFilled: boolean;
}

/** Lightweight page context so answers can reference the company/role. */
export interface PageContext {
  url: string;
  title: string;
  heading?: string;
}
