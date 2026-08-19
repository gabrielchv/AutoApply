import type { ExtractedJobContext } from './types';

const DESCRIPTION_CAP = 8000;

function collapse(text: string | null | undefined): string {
  return (text ?? '').replace(/\s+/g, ' ').trim();
}

/** Strips HTML by parsing into a detached element and reading textContent. */
function htmlToText(doc: Document, html: string): string {
  const el = doc.createElement('div');
  el.innerHTML = html;
  return collapse(el.textContent);
}

interface JsonLdNode {
  '@type'?: string | string[];
  title?: unknown;
  description?: unknown;
  hiringOrganization?: unknown;
  '@graph'?: unknown;
}

function isJobPosting(node: JsonLdNode): boolean {
  const type = node['@type'];
  if (typeof type === 'string') return type === 'JobPosting';
  if (Array.isArray(type)) return type.includes('JobPosting');
  return false;
}

function* jsonLdNodes(value: unknown): Generator<JsonLdNode> {
  if (Array.isArray(value)) {
    for (const item of value) yield* jsonLdNodes(item);
  } else if (value && typeof value === 'object') {
    const node = value as JsonLdNode;
    yield node;
    if (node['@graph']) yield* jsonLdNodes(node['@graph']);
  }
}

function organizationName(org: unknown): string {
  if (typeof org === 'string') return collapse(org);
  if (org && typeof org === 'object' && 'name' in org) {
    return collapse(String((org as { name: unknown }).name ?? ''));
  }
  return '';
}

function fromJsonLd(doc: Document): ExtractedJobContext | null {
  for (const script of doc.querySelectorAll('script[type="application/ld+json"]')) {
    let parsed: unknown;
    try {
      parsed = JSON.parse(script.textContent ?? '');
    } catch {
      continue;
    }
    for (const node of jsonLdNodes(parsed)) {
      if (!isJobPosting(node)) continue;
      const title = collapse(typeof node.title === 'string' ? node.title : '');
      const company = organizationName(node.hiringOrganization);
      const description =
        typeof node.description === 'string'
          ? htmlToText(doc, node.description).slice(0, DESCRIPTION_CAP)
          : '';
      if (title || company || description) {
        return {
          title: title || undefined,
          company: company || undefined,
          description: description || undefined,
          source: 'json-ld',
        };
      }
    }
  }
  return null;
}

function fromHeuristics(doc: Document): ExtractedJobContext {
  const title =
    collapse(doc.querySelector('h1')?.textContent) || collapse(doc.title) || undefined;

  const company =
    collapse(
      doc.querySelector('meta[property="og:site_name"]')?.getAttribute('content'),
    ) || undefined;

  const container =
    doc.querySelector('main') ??
    doc.querySelector('[role="main"]') ??
    doc.querySelector('article') ??
    doc.body;

  let description: string | undefined;
  if (container) {
    const clone = container.cloneNode(true) as HTMLElement;
    for (const noise of clone.querySelectorAll(
      'nav, footer, header, script, style, aside, form',
    )) {
      noise.remove();
    }
    description = collapse(clone.textContent).slice(0, DESCRIPTION_CAP) || undefined;
  }

  if (!title && !company && !description) return { source: 'none' };
  return { title, company, description, source: 'heuristic' };
}

/**
 * Extracts the job posting's context from the page: structured JSON-LD
 * JobPosting data when available, a text heuristic otherwise. Pure function
 * of the Document — no messaging, no storage.
 */
export function extractJobContext(doc: Document): ExtractedJobContext {
  return fromJsonLd(doc) ?? fromHeuristics(doc);
}
