import { describe, expect, it } from 'vitest';
import { profileContentSchema } from '../profile/schema';
import type { ScrapedField } from '../scrape/types';
import { buildMappingPrompt } from './mapForm';

const fields: ScrapedField[] = [
  { id: 'f0', kind: 'text', label: 'First name', required: true, alreadyFilled: false },
  {
    id: 'f1',
    kind: 'select',
    label: 'Country',
    required: false,
    alreadyFilled: false,
    options: [{ value: 'br', label: 'Brazil' }],
  },
];

const profile = profileContentSchema.parse({
  personal: { firstName: 'Ada', lastName: 'Lovelace', email: 'ada@example.com' },
});

describe('buildMappingPrompt', () => {
  const messages = buildMappingPrompt(fields, profile, {
    url: 'https://jobs.example.com/apply',
    title: 'Apply — Example Corp',
    heading: 'Software Engineer',
  });

  it('states the output contract and the safety rules in the system message', () => {
    const system = messages[0]?.content ?? '';
    expect(messages[0]?.role).toBe('system');
    expect(system).toContain('"fill" | "select" | "check" | "skip"');
    expect(system).toContain('copied verbatim');
    expect(system).toContain('Never fabricate');
    expect(system).toContain('passwords');
    expect(system).toContain('150 words');
  });

  it('serializes page context, fields and profile into the user message', () => {
    const user = messages[1]?.content ?? '';
    expect(user).toContain('Example Corp');
    expect(user).toContain('"id":"f0"');
    expect(user).toContain('"label":"Country"');
    expect(user).toContain('"firstName":"Ada"');
  });
});
