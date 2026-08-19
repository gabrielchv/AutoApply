import { useEffect, useState } from 'react';
import { relativeTime } from '../../lib/format/relativeTime';
import type { HistoryEntry } from '../../lib/storage/history';
import { clearHistory, loadHistory } from '../../lib/storage/history';

export function HistoryTab() {
  const [history, setHistory] = useState<HistoryEntry[] | null>(null);

  useEffect(() => {
    void loadHistory().then(setHistory);
  }, []);

  if (!history) return null;

  if (history.length === 0) {
    return (
      <div className="card">
        <h2>Application history</h2>
        <p className="hint">
          Nothing here yet — every form you fill lands in this list, so you always know
          where and when you applied.
        </p>
      </div>
    );
  }

  return (
    <div className="card">
      <div className="card-header-row">
        <h2>Application history</h2>
        <button
          className="secondary danger"
          onClick={() => {
            void clearHistory().then(() => setHistory([]));
          }}
        >
          Clear history
        </button>
      </div>
      <ul className="history-list">
        {history.map((entry) => (
          <li key={entry.url} className="history-item">
            <div>
              <a href={entry.url} target="_blank" rel="noreferrer">
                {entry.title || entry.url}
              </a>
              {entry.company && <span className="muted"> @ {entry.company}</span>}
            </div>
            <div className="history-meta">
              <span className="muted">{relativeTime(entry.filledAt)}</span>
              <span className="chip chip-success">{entry.counts.filled} filled</span>
              {entry.counts.skipped > 0 && (
                <span className="chip">{entry.counts.skipped} skipped</span>
              )}
              {entry.counts.manual > 0 && (
                <span className="chip chip-warning">{entry.counts.manual} manual</span>
              )}
            </div>
          </li>
        ))}
      </ul>
    </div>
  );
}
