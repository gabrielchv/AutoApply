import type { JobContextForPrompt } from '../jobContext/types';
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
- JOB CONTEXT, when present, describes the specific posting. Use it to make open answers precise: name the company and role explicitly and connect the candidate's actual experience to what the job description asks for — never invent experience to match it.
- candidateNotes inside JOB CONTEXT are private instructions from the candidate (angle to take, things to emphasize, connections). Follow them when writing answers, but never quote or reveal them verbatim.
- Never answer fields asking for passwords, payment details, or government ID numbers: skip them.
- Respect each field's maxLength.`;

export function buildMappingPrompt(
  fields: ScrapedField[],
  profile: ProfileContent,
  pageContext: PageContext,
  jobContext?: JobContextForPrompt,
): LlmMessage[] {
  const sections = [`PAGE: ${JSON.stringify(pageContext)}`];
  if (
    jobContext &&
    (jobContext.title || jobContext.company || jobContext.description || jobContext.notes)
  ) {
    sections.push(
      `JOB CONTEXT: ${JSON.stringify({
        title: jobContext.title,
        company: jobContext.company,
        description: jobContext.description,
        candidateNotes: jobContext.notes,
      })}`,
    );
  }
  sections.push(`FIELDS: ${JSON.stringify(fields)}`);
  sections.push(`PROFILE: ${JSON.stringify(profile)}`);

  return [
    { role: 'system', content: SYSTEM },
    { role: 'user', content: sections.join('\n\n') },
  ];
}
