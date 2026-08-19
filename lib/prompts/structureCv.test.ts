import { describe, expect, it } from 'vitest';
import { buildStructureCvPrompt } from './structureCv';

describe('buildStructureCvPrompt', () => {
  const messages = buildStructureCvPrompt('John Doe\nSoftware Engineer');

  it('embeds the profile JSON schema and the core rules in the system message', () => {
    const system = messages[0];
    expect(system?.role).toBe('system');
    expect(system?.content).toContain('"personal"');
    expect(system?.content).toContain('extraAnswers');
    expect(system?.content).toContain('Never invent facts');
  });

  it('carries the raw CV text as the user message', () => {
    const user = messages[1];
    expect(user?.role).toBe('user');
    expect(user?.content).toContain('John Doe');
  });
});
