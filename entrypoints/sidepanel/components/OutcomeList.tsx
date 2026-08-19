import type { FillResult } from '../../../lib/fill/types';

export function OutcomeList({ result }: { result: FillResult }) {
  const count = (outcome: string) =>
    result.outcomes.filter((entry) => entry.outcome === outcome).length;
  const attention = result.outcomes.filter(
    (entry) => entry.outcome === 'needs-manual' || entry.outcome === 'failed',
  );

  return (
    <div className="summary">
      <div className="summary-counts">
        <span className="chip chip-success">{count('filled')} filled</span>
        {count('skipped') > 0 && <span className="chip">{count('skipped')} skipped</span>}
        {attention.length > 0 && (
          <span className="chip chip-warning">{attention.length} need you</span>
        )}
      </div>
      {attention.length > 0 && (
        <ul className="attention-list">
          {attention.map((entry) => (
            <li key={entry.id}>
              {entry.label || 'Unlabeled field'}
              <span className="muted small">
                {entry.outcome === 'needs-manual' ? 'attach manually' : 'fill manually'}
              </span>
            </li>
          ))}
        </ul>
      )}
      <p className="muted small">
        Highlighted on the page: green filled, amber needs you. Review, then submit
        yourself.
      </p>
    </div>
  );
}
