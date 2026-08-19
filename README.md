# AutoApply

> Fill job application forms with **your own LLM API key**. Local-first, open source, no backend.

<!-- demo GIF placeholder: assets/demo.gif -->

AutoApply is a browser extension (Chrome + Firefox) that turns your résumé into a
structured profile — once — and then fills job application forms on any site with a
single click. Your data and your API key never leave your machine except to reach
the LLM provider *you* configured.

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
- **You stay in control** — filling is always manually triggered and the extension
  **never submits a form**. You review, you click send.

## Status

Early development — v1 core in progress. See the roadmap issues.

## License

[MIT](./LICENSE)
