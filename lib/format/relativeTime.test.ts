import { describe, expect, it } from 'vitest';
import { relativeTime } from './relativeTime';

const now = new Date('2026-08-18T12:00:00Z');

describe('relativeTime', () => {
  it('says just now under a minute', () => {
    expect(relativeTime('2026-08-18T11:59:30Z', now)).toBe('just now');
  });

  it('formats minutes, hours, days', () => {
    expect(relativeTime('2026-08-18T11:15:00Z', now)).toBe('45 minutes ago');
    expect(relativeTime('2026-08-18T07:00:00Z', now)).toBe('5 hours ago');
    expect(relativeTime('2026-08-15T12:00:00Z', now)).toBe('3 days ago');
  });

  it('rolls up to weeks and months', () => {
    expect(relativeTime('2026-08-03T12:00:00Z', now)).toBe('2 weeks ago');
    expect(relativeTime('2026-05-18T12:00:00Z', now)).toBe('3 months ago');
  });

  it('returns empty for invalid input', () => {
    expect(relativeTime('nonsense', now)).toBe('');
  });
});
