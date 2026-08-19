import { describe, expect, it } from 'vitest';
import { fillPlanSchema, sanitizePlan } from './planSchema';

describe('fillPlanSchema', () => {
  it('accepts a well-formed plan', () => {
    const result = fillPlanSchema.safeParse({
      fields: [
        { id: 'f0', action: 'fill', value: 'Ada' },
        { id: 'f1', action: 'skip', reason: 'not in profile' },
      ],
    });
    expect(result.success).toBe(true);
  });

  it('rejects unknown actions', () => {
    const result = fillPlanSchema.safeParse({
      fields: [{ id: 'f0', action: 'submit' }],
    });
    expect(result.success).toBe(false);
  });
});

describe('sanitizePlan', () => {
  it('drops hallucinated ids and duplicate instructions', () => {
    const plan = sanitizePlan(
      {
        fields: [
          { id: 'f0', action: 'fill', value: 'a' },
          { id: 'f0', action: 'fill', value: 'b' },
          { id: 'f9', action: 'fill', value: 'ghost' },
          { id: 'f1', action: 'skip' },
        ],
      },
      ['f0', 'f1'],
    );
    expect(plan.fields).toEqual([
      { id: 'f0', action: 'fill', value: 'a' },
      { id: 'f1', action: 'skip' },
    ]);
  });
});
