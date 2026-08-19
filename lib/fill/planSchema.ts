import { z } from 'zod';
import type { FillPlan } from './types';

export const plannedFieldSchema = z.object({
  id: z.string(),
  action: z.enum(['fill', 'select', 'check', 'skip']),
  value: z.string().optional(),
  reason: z.string().optional(),
});

export const fillPlanSchema = z.object({
  fields: z.array(plannedFieldSchema),
});

/**
 * Post-validation hygiene: drop instructions for ids we never scraped
 * (models occasionally hallucinate one) and keep only the first instruction
 * per id. Dropping beats failing — the rest of the plan is still useful.
 */
export function sanitizePlan(plan: FillPlan, validIds: Iterable<string>): FillPlan {
  const valid = new Set(validIds);
  const seen = new Set<string>();
  return {
    fields: plan.fields.filter((field) => {
      if (!valid.has(field.id) || seen.has(field.id)) return false;
      seen.add(field.id);
      return true;
    }),
  };
}
