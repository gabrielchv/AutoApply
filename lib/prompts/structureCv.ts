import type { LlmMessage } from '../llm/types';
import { PROFILE_JSON_SCHEMA } from '../profile/schema';

const SYSTEM = `You convert resume/CV text into structured JSON.

Output ONLY a single JSON object conforming to this JSON Schema:
${PROFILE_JSON_SCHEMA}

Rules:
- Never invent facts that are not in the text. Omit optional fields you cannot source.
- Dates as "YYYY-MM" when the text allows; otherwise copy the text's wording.
- Keep experience bullet points as entries in "highlights", lightly cleaned.
- Anything relevant that fits nowhere else becomes a {"question","answer"} pair in "extraAnswers".
- No markdown, no commentary — the JSON object only.`;

export function buildStructureCvPrompt(rawText: string): LlmMessage[] {
  return [
    { role: 'system', content: SYSTEM },
    { role: 'user', content: `Resume text:\n\n${rawText}` },
  ];
}
