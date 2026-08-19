import type { ExtractedJobContext } from '../../../lib/jobContext/types';

export function JobHeader({
  context,
  url,
}: {
  context: ExtractedJobContext;
  url: string;
}) {
  let host = '';
  try {
    host = new URL(url).hostname.replace(/^www\./, '');
  } catch {
    /* non-URL — leave empty */
  }

  const title = context.title || 'This page';

  return (
    <div className="job-header">
      <div className="job-title">
        {title}
        {context.company && <span className="job-company"> @ {context.company}</span>}
      </div>
      {host && (
        <a className="job-host" href={url} target="_blank" rel="noreferrer">
          {host}
        </a>
      )}
    </div>
  );
}
