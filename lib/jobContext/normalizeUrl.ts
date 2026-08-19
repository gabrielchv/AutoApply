const TRACKING_PARAMS = /^(utm_|gclid$|fbclid$|ref$|src$)/;

/**
 * Canonical key for "the same job posting": lowercase host, no hash, no
 * tracking params, no trailing slash. The remaining query string is KEPT —
 * ATS job ids live there (e.g. Greenhouse's ?gh_jid=123).
 */
export function normalizeUrl(rawUrl: string): string {
  let url: URL;
  try {
    url = new URL(rawUrl);
  } catch {
    return rawUrl;
  }
  url.hash = '';
  url.hostname = url.hostname.toLowerCase();
  const params = [...url.searchParams.keys()];
  for (const param of params) {
    if (TRACKING_PARAMS.test(param.toLowerCase())) {
      url.searchParams.delete(param);
    }
  }
  let result = url.toString();
  if (result.endsWith('/')) result = result.slice(0, -1);
  return result;
}
