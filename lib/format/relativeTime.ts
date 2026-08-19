const UNITS: [Intl.RelativeTimeFormatUnit, number][] = [
  ['year', 365 * 24 * 60 * 60 * 1000],
  ['month', 30 * 24 * 60 * 60 * 1000],
  ['week', 7 * 24 * 60 * 60 * 1000],
  ['day', 24 * 60 * 60 * 1000],
  ['hour', 60 * 60 * 1000],
  ['minute', 60 * 1000],
];

/** "3 days ago" / "just now" for history rows. */
export function relativeTime(iso: string, now: Date = new Date()): string {
  const elapsed = now.getTime() - new Date(iso).getTime();
  if (Number.isNaN(elapsed)) return '';
  if (elapsed < 60 * 1000) return 'just now';

  const formatter = new Intl.RelativeTimeFormat('en', { numeric: 'always' });
  for (const [unit, ms] of UNITS) {
    if (elapsed >= ms) {
      return formatter.format(-Math.floor(elapsed / ms), unit);
    }
  }
  return 'just now';
}
