export interface ExtractedJobContext {
  title?: string;
  company?: string;
  /** Job description text, capped by the extractor. */
  description?: string;
  /** Where the data came from — shown in the UI as a confidence hint. */
  source: 'json-ld' | 'heuristic' | 'none';
}

/** The slice of job context that travels into the mapping prompt. */
export interface JobContextForPrompt {
  title?: string;
  company?: string;
  description?: string;
  notes?: string;
}
