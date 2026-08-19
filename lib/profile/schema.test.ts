import { describe, expect, it } from 'vitest';
import { emptyProfile } from './empty';
import { PROFILE_JSON_SCHEMA, profileContentSchema, profileSchema } from './schema';

const minimalContent = {
  personal: { firstName: 'Ada', lastName: 'Lovelace', email: 'ada@example.com' },
};

describe('profileContentSchema', () => {
  it('accepts a minimal profile and fills defaults', () => {
    const parsed = profileContentSchema.parse(minimalContent);
    expect(parsed.experiences).toEqual([]);
    expect(parsed.skills).toEqual([]);
    expect(parsed.extraAnswers).toEqual([]);
    expect(parsed.links.other).toEqual([]);
    expect(parsed.personal.location).toEqual({});
  });

  it('accepts a rich profile', () => {
    const parsed = profileContentSchema.parse({
      ...minimalContent,
      summary: 'Engineer.',
      experiences: [
        {
          title: 'Analyst',
          company: 'Babbage & Co',
          startDate: '1842-01',
          current: false,
          highlights: ['Wrote the first program'],
        },
      ],
      education: [{ institution: 'Home schooling' }],
      languages: [{ language: 'English', proficiency: 'native' }],
      extraAnswers: [{ question: 'Why us?', answer: 'Because engines.' }],
    });
    expect(parsed.experiences[0]?.highlights).toHaveLength(1);
    expect(parsed.experiences[0]?.current).toBe(false);
  });

  it('rejects a profile without email', () => {
    const result = profileContentSchema.safeParse({
      personal: { firstName: 'Ada', lastName: 'Lovelace' },
    });
    expect(result.success).toBe(false);
  });

  it('rejects wrong types', () => {
    const result = profileContentSchema.safeParse({
      ...minimalContent,
      skills: 'python',
    });
    expect(result.success).toBe(false);
  });
});

describe('profileSchema', () => {
  it('requires meta with version 1', () => {
    const content = profileContentSchema.parse(minimalContent);
    const withMeta = {
      ...content,
      meta: { version: 1, createdAt: '2026-01-01', updatedAt: '2026-01-01' },
    };
    expect(profileSchema.safeParse(withMeta).success).toBe(true);
    expect(
      profileSchema.safeParse({ ...withMeta, meta: { ...withMeta.meta, version: 2 } })
        .success,
    ).toBe(false);
  });
});

describe('emptyProfile', () => {
  it('produces a valid profile shape apart from blank required strings', () => {
    const profile = emptyProfile('2026-01-01T00:00:00Z');
    expect(profile.meta.version).toBe(1);
    expect(profile.personal.firstName).toBe('');
    expect(profile.extraAnswers).toEqual([]);
  });
});

describe('PROFILE_JSON_SCHEMA', () => {
  it('is valid JSON describing an object with required personal info', () => {
    const schema = JSON.parse(PROFILE_JSON_SCHEMA) as {
      type: string;
      required: string[];
      properties: Record<string, unknown>;
    };
    expect(schema.type).toBe('object');
    expect(schema.required).toContain('personal');
    expect(Object.keys(schema.properties)).toContain('extraAnswers');
  });
});
