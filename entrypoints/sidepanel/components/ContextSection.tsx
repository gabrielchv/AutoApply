import { useState } from 'react';
import type { ExtractedJobContext } from '../../../lib/jobContext/types';

const SOURCE_BADGES = {
  'json-ld': 'from structured data',
  heuristic: 'from page text',
  none: 'nothing found',
} as const;

export function ContextSection({
  context,
  extracting,
  onChange,
  onReextract,
}: {
  context: ExtractedJobContext;
  extracting: boolean;
  onChange: (patch: Partial<ExtractedJobContext>) => void;
  onReextract: () => void;
}) {
  const populated = context.source !== 'none';
  const [open, setOpen] = useState(!populated);

  return (
    <section className="section">
      <button
        className="section-toggle"
        aria-expanded={open || !populated}
        onClick={() => setOpen((value) => !value)}
      >
        <span>Job context</span>
        <span className={`badge badge-${context.source}`}>
          {extracting ? 'reading page…' : SOURCE_BADGES[context.source]}
        </span>
      </button>

      {(open || !populated) && (
        <div className="section-body">
          <p className="muted small">
            What the LLM knows about this posting — used to tailor open answers like “why
            do you want to work here?”. Edit freely.
          </p>
          <div className="field">
            <label htmlFor="ctx-title">Role</label>
            <input
              id="ctx-title"
              type="text"
              value={context.title ?? ''}
              onChange={(event) => onChange({ title: event.target.value })}
              placeholder="e.g. Senior Frontend Engineer"
            />
          </div>
          <div className="field">
            <label htmlFor="ctx-company">Company</label>
            <input
              id="ctx-company"
              type="text"
              value={context.company ?? ''}
              onChange={(event) => onChange({ company: event.target.value })}
              placeholder="e.g. Acme Corp"
            />
          </div>
          <div className="field">
            <label htmlFor="ctx-description">Job description</label>
            <textarea
              id="ctx-description"
              rows={6}
              value={context.description ?? ''}
              onChange={(event) => onChange({ description: event.target.value })}
              placeholder="Paste or edit the job description…"
            />
          </div>
          <button className="secondary" disabled={extracting} onClick={onReextract}>
            Re-extract from page
          </button>
        </div>
      )}
    </section>
  );
}
