# Contributing to AutoApply

Thanks for helping! This document covers the dev setup, the architecture rules
that keep the codebase safe to change, and the release QA checklist.

## Setup

```sh
pnpm install
pnpm dev            # Chrome with HMR
pnpm dev:firefox    # Firefox
```

Quality gates (CI runs all of them on every push/PR):

```sh
pnpm lint           # eslint
pnpm format:check   # prettier
pnpm typecheck      # tsc --noEmit
pnpm test           # vitest
pnpm build && pnpm build:firefox
```

## Architecture

```
entrypoints/
  background.ts   message router — the ONLY code allowed to read the API key
                  and call LLM providers; wires side-panel opening
  content.ts      scrape + fill + attach + job-context extraction; runs in every
                  frame; never sees the key
  sidepanel/      the fill cockpit: job context, notes, fill trigger, outcomes
  options/        profile, history & settings UI
lib/
  profile/        zod schema — the contract between ingestion, UI and mapping
  jobContext/     pure posting extractor (JSON-LD + heuristics) + URL normalizer
  llm/            provider-agnostic client (OpenAI + Anthropic wire formats)
  prompts/        pure prompt builders + JSON parse/validate/retry pipeline
  pdf/            pdf.js text extraction (options page only)
  scrape/         DOM → ScrapedField[] (labels, options, registry)
  fill/           plan application (native setters, events, highlights, attach)
                  and the runFill orchestration used by the side panel
  format/         pure formatting helpers (relative time)
  storage/        typed storage.local + IndexedDB access
  messaging/      typed runtime message protocol
```

Boundary rules — enforced by review, please keep them:

- `lib/**` never imports React.
- Only `entrypoints/background.ts` imports `lib/llm/*` or reads the API key.
- The content script imports only `scrape`, `fill`, `jobContext` and `messaging`.
- `lib/prompts` stays pure (strings in, strings/objects out) — it is the most
  heavily tested code in the repo.
- No code path may ever submit a form. Do not add one.

## Tests

`vitest` + happy-dom + WXT's fake browser. Scraper and filler tests run against
HTML fixtures in `tests/fixtures/` modeled on real ATS markup — add a fixture
when you meet a form shape we mishandle.

Thin, deliberately untested shells: real provider calls, pdf.js internals,
cross-origin frames, MV3 worker lifecycle. Keep logic out of them.

## Manual QA before a release

1. Load a fresh unpacked build in Chrome **and** Firefox.
2. Configure a real provider; _Test connection_ succeeds; a wrong key surfaces a
   readable auth error.
3. Upload a real CV PDF → profile appears, edits persist after reopening.
4. On a live Greenhouse posting and a live Lever posting:
   - _Fill this page_ fills text/selects/radios and highlights them,
   - the CV lands in the file input (or the field turns amber),
   - open questions get grounded, first-person answers,
   - **nothing is submitted**.
5. Re-run _Fill this page_ — already-filled fields are skipped.

## Commits

Conventional commits (`feat(scope): …`, `fix: …`, `chore: …`, `docs: …`,
`test: …`, `ci: …`). Keep them small and green — every commit should pass the
full gate list above.
