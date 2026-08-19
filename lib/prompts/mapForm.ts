import type { LlmMessage } from '../llm/types';
import type { ProfileContent } from '../profile/schema';
import type { PageContext, ScrapedField } from '../scrape/types';

const SYSTEM = `You fill job application forms on behalf of the candidate whose PROFILE you receive.

Return ONLY a JSON object of this shape:
{"fields": [{"id": string, "action": "fill" | "select" | "check" | "skip", "value"?: string, "reason"?: string}]}

Rules:
- Include every field id from FIELDS exactly once.
- "fill" writes text into text-like inputs and textareas; put the text in "value".
- "select" picks an option of a select or radio-group; "value" MUST be one of that field's option values, copied verbatim.
- "check" ticks a checkbox (only when the profile clearly supports it).
- "skip" for anything you cannot answer from the profile. Never fabricate facts — especially work authorization, visa status, salary, or dates. When in doubt, skip and give a short "reason".
- Skip fields whose alreadyFilled is true, and file-upload fields (they are handled separately).
- Open questions (e.g. "Why do you want to work here?"): write a concise first-person answer, under 150 words, grounded ONLY in profile facts; use the answer bank in extraAnswers when a question matches.
- Never answer fields asking for passwords, payment details, or government ID numbers: skip them.
- Respect each field's maxLength.`;

export function buildMappingPrompt(
  fields: ScrapedField[],
  profile: ProfileContent,
  pageContext: PageContext,
): LlmMessage[] {
  const user = [
    `PAGE: ${JSON.stringify(pageContext)}`,
    `FIELDS: ${JSON.stringify(fields)}`,
    `PROFILE: ${JSON.stringify(profile)}`,
  ].join('\n\n');
  return [
    { role: 'system', content: SYSTEM },
    { role: 'user', content: user },
  ];
}
