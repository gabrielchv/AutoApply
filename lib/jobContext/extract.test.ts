import { beforeEach, describe, expect, it } from 'vitest';
import { extractJobContext } from './extract';

function setPage(html: string): void {
  document.head.innerHTML = '';
  document.body.innerHTML = html;
}

function addJsonLd(json: unknown): void {
  const script = document.createElement('script');
  script.type = 'application/ld+json';
  script.textContent = typeof json === 'string' ? json : JSON.stringify(json);
  document.head.appendChild(script);
}

beforeEach(() => {
  document.head.innerHTML = '';
  document.body.innerHTML = '';
  document.title = '';
});

describe('extractJobContext — JSON-LD', () => {
  it('reads a JobPosting node', () => {
    setPage('<h1>Ignored</h1>');
    addJsonLd({
      '@context': 'https://schema.org',
      '@type': 'JobPosting',
      title: 'Frontend Engineer',
      hiringOrganization: { '@type': 'Organization', name: 'Acme Corp' },
      description: '<p>Build <strong>great</strong> UIs.</p>',
    });

    expect(extractJobContext(document)).toEqual({
      title: 'Frontend Engineer',
      company: 'Acme Corp',
      description: 'Build great UIs.',
      source: 'json-ld',
    });
  });

  it('unwraps @graph and array-typed @type', () => {
    addJsonLd({
      '@graph': [
        { '@type': 'WebSite', name: 'jobs' },
        {
          '@type': ['JobPosting', 'Thing'],
          title: 'Data Scientist',
          hiringOrganization: 'DataCo',
        },
      ],
    });
    const context = extractJobContext(document);
    expect(context.title).toBe('Data Scientist');
    expect(context.company).toBe('DataCo');
    expect(context.source).toBe('json-ld');
  });

  it('ignores malformed JSON and falls back to heuristics', () => {
    setPage('<h1>Backend Engineer</h1>');
    addJsonLd('{not json');
    const context = extractJobContext(document);
    expect(context.source).toBe('heuristic');
    expect(context.title).toBe('Backend Engineer');
  });

  it('caps the description at 8000 characters', () => {
    addJsonLd({
      '@type': 'JobPosting',
      title: 'X',
      description: 'a'.repeat(10000),
    });
    expect(extractJobContext(document).description).toHaveLength(8000);
  });
});

describe('extractJobContext — heuristics', () => {
  it('uses h1, og:site_name and main content with noise stripped', () => {
    document.head.innerHTML = '<meta property="og:site_name" content="Acme Careers" />';
    setPage(`
      <header>Site nav here</header>
      <main>
        <h1>Platform Engineer</h1>
        <nav>breadcrumbs</nav>
        <p>You will build the platform.</p>
        <footer>legal</footer>
      </main>
    `);
    // setPage clears head; re-add the meta
    document.head.innerHTML = '<meta property="og:site_name" content="Acme Careers" />';

    const context = extractJobContext(document);
    expect(context.source).toBe('heuristic');
    expect(context.title).toBe('Platform Engineer');
    expect(context.company).toBe('Acme Careers');
    expect(context.description).toContain('build the platform');
    expect(context.description).not.toContain('breadcrumbs');
    expect(context.description).not.toContain('legal');
  });

  it('falls back to document.title when there is no h1', () => {
    setPage('<main><p>Some role text.</p></main>');
    document.title = 'Careers at Beta';
    expect(extractJobContext(document).title).toBe('Careers at Beta');
  });

  it('returns source none on an empty page', () => {
    setPage('');
    expect(extractJobContext(document)).toEqual({ source: 'none' });
  });
});
