export function NotesSection({
  notes,
  onChange,
}: {
  notes: string;
  onChange: (notes: string) => void;
}) {
  return (
    <section className="section">
      <div className="section-body">
        <div className="field">
          <label htmlFor="job-notes">Your notes for this job</label>
          <textarea
            id="job-notes"
            rows={3}
            value={notes}
            onChange={(event) => onChange(event.target.value)}
            placeholder="e.g. “I know their CTO from a meetup — emphasize my platform work.”"
          />
          <span className="hint">
            Private guidance for the answers — followed, never quoted.
          </span>
        </div>
      </div>
    </section>
  );
}
