export type FillAction = 'fill' | 'select' | 'check' | 'skip';

/** One instruction from the mapping LLM, keyed by the scraped field id. */
export interface PlannedField {
  id: string;
  action: FillAction;
  value?: string;
  reason?: string;
}

export interface FillPlan {
  fields: PlannedField[];
}

export type FieldOutcome = 'filled' | 'skipped' | 'needs-manual' | 'failed';

export interface FillResult {
  outcomes: { id: string; label: string; outcome: FieldOutcome }[];
}
