# AutoApply

> Fill job application forms with **your own LLM API key**. Local-first, open source, no backend.

<!-- demo GIF placeholder: assets/demo.gif -->

AutoApply is a browser extension (Chrome + Firefox) that turns your résumé into a
structured profile — once — and then fills job application forms on any site with a
single click. Your data and your API key never leave your machine except to reach
the LLM provider _you_ configured.

## Highlights

- **Bring your own key** — OpenAI, Anthropic, Gemini, OpenRouter, Groq, or a local
  Ollama. Any OpenAI-compatible endpoint works.
- **Local-first** — no backend, no accounts, no telemetry. Profile and API key live
  in your browser's extension storage.
- **One-time ingestion** — upload your CV (or LinkedIn profile PDF export); the LLM
  structures it into an editable profile that you review and own.
- **Universal filling** — no per-site adapters. The extension reads the form's
  fields and asks the LLM to map them to your profile, including open questions
  like "Why do you want to work here?".
- **Job-aware answers** — a side panel sits next to the posting, auto-extracts the
  job description (schema.org data or page text), and lets you add private notes
  ("emphasize my platform work"). Open answers name the company and role and are
  tailored to that specific job — never fabricated.
- **CV attachment** — the original PDF is stored locally and attached to the form's
  file input automatically; when a custom uploader defeats that, the field is
  highlighted for you to attach manually.
- **Application history** — every fill is logged locally (role, company, when,
  outcome) so you always know where you applied.
- **You stay in control** — filling is always manually triggered and the extension
  **never submits a form**. You review, you click send.

## Getting started

Until store listings exist, load AutoApply from a local build:

```sh
pnpm install
pnpm build            # Chrome MV3 → .output/chrome-mv3
pnpm build:firefox    # Firefox MV2 → .output/firefox-mv2
```

- **Chrome**: `chrome://extensions` → enable Developer mode → _Load unpacked_ →
  pick `.output/chrome-mv3`.
- **Firefox**: `about:debugging#/runtime/this-firefox` → _Load Temporary Add-on_ →
  pick any file inside `.output/firefox-mv2`.

Then:

1. Open the extension's **Settings** tab, pick a provider preset, paste your API
   key, and hit _Test connection_.
2. In the **Profile** tab, upload your CV as PDF. The LLM structures it once;
   review and correct the result — it is the source of truth for every fill.
3. Open a job posting and click the AutoApply icon — the **side panel** opens next
   to the page with the extracted job context. Adjust it, add notes if you like,
   and hit **Fill this page**. Review the highlighted fields and submit yourself.
   The panel follows your active tab, and context/notes are remembered per
   posting.

### Provider notes

| Provider                   | Notes                                                                                                                                                 |
| -------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------- |
| OpenAI / OpenRouter / Groq | Work out of the box with the preset.                                                                                                                  |
| Anthropic                  | Direct browser calls are enabled via Anthropic's dedicated header; just paste your key.                                                               |
| Google Gemini              | Uses Gemini's OpenAI-compatible endpoint.                                                                                                             |
| Ollama (local)             | Start it with `OLLAMA_ORIGINS='chrome-extension://*,moz-extension://*'` so it accepts extension requests. Total privacy: nothing leaves your machine. |
| Anything else              | Choose _Custom_ and point the base URL at any OpenAI-compatible endpoint.                                                                             |

## How it works

```
options page ── PDF ──▶ pdf.js (local) ── text ──▶ background ──▶ your LLM
     ▲                                                 │
     └───────────── editable profile JSON ◀────────────┘

side panel ─▶ content script scrapes fields + job description
     │                     │
     │    background + profile + job context + your notes ─▶ your LLM
     │                     │
     └── validated fill plan ─▶ fills, highlights, attaches CV — never submits
```

- The **profile** is a zod-validated JSON document you can edit at any time; the
  original CV PDF is kept (IndexedDB) purely for re-attachment.
- **Scraping** collects labels (label/aria/placeholder/nearby-text heuristics),
  select and radio options, and required flags — the page is never mutated for
  tracking.
- The **job context** comes from the posting itself: schema.org `JobPosting`
  structured data when the site publishes it, a content heuristic otherwise. You
  can edit it, and your per-job notes ride along as private instructions to the
  model — followed, never quoted into answers.
- The **fill plan** returned by the LLM is schema-validated (with one corrective
  retry) and sanitized before a single field is touched. Values are written
  through native setters with proper `input`/`change` events so React-style forms
  register them.

## Security model — honest edition

- Your API key and profile live in `chrome.storage.local` — **not** synced to your
  browser account, but also **not encrypted at rest**. Anyone with access to your
  browser profile can read them; that is true of every extension storing local
  data.
- Only the background worker touches the key; content scripts (which run inside
  arbitrary web pages) never see it.
- Network traffic goes to exactly one place: the base URL you configured.
- The extension asks for broad host permissions because job forms can live on any
  domain and your LLM base URL is user-defined. There is no telemetry of any kind.
- Nothing is ever submitted on your behalf — there is no code path that submits.

## Current limitations

- Forms inside **closed** shadow DOM are invisible to the scraper.
- When a page splits one application across several iframes, only the richest
  frame is filled per run.
- Some custom upload widgets (parts of Workday, Ashby) reject programmatic file
  attachment — you'll get an amber highlight to attach manually.
- Multi-step wizards need one _Fill this page_ per step.

## Contributing

PRs welcome — see [CONTRIBUTING.md](./CONTRIBUTING.md) for the dev setup, module
boundaries, and the manual QA checklist. The roadmap lives in the issue tracker.

## License

[MIT](./LICENSE)
