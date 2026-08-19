import { z } from 'zod';

/**
 * Canonical profile — the single source of truth for form filling.
 *
 * Produced once by LLM ingestion of the user's CV, then reviewed and edited by
 * the user. Everything except names and email is optional so a sparse CV never
 * fails validation; dates are strings ("YYYY-MM" preferred, free-form
 * tolerated) because CVs are messy and the value is only ever shown to an LLM.
 */

const trimmed = z.string().trim();

export const experienceSchema = z.object({
  title: trimmed.min(1),
  company: trimmed.min(1),
  location: trimmed.optional(),
  startDate: trimmed.optional(),
  endDate: trimmed.optional(),
  current: z.boolean().default(false),
  description: trimmed.optional(),
  highlights: z.array(trimmed).default([]),
});

export const educationSchema = z.object({
  institution: trimmed.min(1),
  degree: trimmed.optional(),
  field: trimmed.optional(),
  startDate: trimmed.optional(),
  endDate: trimmed.optional(),
  gpa: trimmed.optional(),
  location: trimmed.optional(),
});

export const extraAnswerSchema = z.object({
  question: trimmed.min(1),
  answer: trimmed.min(1),
});

/**
 * The shape the ingestion LLM must return (no `meta`: the app stamps that).
 */
export const profileContentSchema = z.object({
  personal: z.object({
    firstName: trimmed.min(1),
    lastName: trimmed.min(1),
    email: trimmed.min(1),
    phone: trimmed.optional(),
    location: z
      .object({
        city: trimmed.optional(),
        region: trimmed.optional(),
        country: trimmed.optional(),
        postalCode: trimmed.optional(),
      })
      .prefault({}),
    streetAddress: trimmed.optional(),
    dateOfBirth: trimmed.optional(),
    nationality: trimmed.optional(),
    pronouns: trimmed.optional(),
  }),
  workAuthorization: z
    .object({
      authorizedToWorkIn: z.array(trimmed).default([]),
      needsSponsorship: z.boolean().optional(),
      notes: trimmed.optional(),
    })
    .prefault({}),
  links: z
    .object({
      linkedin: trimmed.optional(),
      github: trimmed.optional(),
      portfolio: trimmed.optional(),
      other: z
        .array(z.object({ label: trimmed.min(1), url: trimmed.min(1) }))
        .default([]),
    })
    .prefault({}),
  summary: trimmed.optional(),
  experiences: z.array(experienceSchema).default([]),
  education: z.array(educationSchema).default([]),
  skills: z.array(trimmed).default([]),
  languages: z
    .array(z.object({ language: trimmed.min(1), proficiency: trimmed.optional() }))
    .default([]),
  certifications: z
    .array(
      z.object({
        name: trimmed.min(1),
        issuer: trimmed.optional(),
        date: trimmed.optional(),
      }),
    )
    .default([]),
  preferences: z
    .object({
      desiredSalary: trimmed.optional(),
      noticePeriod: trimmed.optional(),
      willingToRelocate: z.boolean().optional(),
      remotePreference: trimmed.optional(),
    })
    .prefault({}),
  /**
   * Free question/answer bank: anything forms ask that the schema does not
   * model ("why us?" seeds, self-identification stances, referral source...).
   * The mapping prompt draws on these; the user curates them.
   */
  extraAnswers: z.array(extraAnswerSchema).default([]),
});

export const profileMetaSchema = z.object({
  version: z.literal(1),
  createdAt: z.string(),
  updatedAt: z.string(),
  sourceFileName: z.string().optional(),
});

export const profileSchema = profileContentSchema.extend({
  meta: profileMetaSchema,
});

export type ProfileContent = z.infer<typeof profileContentSchema>;
export type Profile = z.infer<typeof profileSchema>;

/**
 * JSON Schema rendering of the content shape, embedded in the ingestion
 * prompt so the LLM knows exactly what to produce.
 */
export const PROFILE_JSON_SCHEMA = JSON.stringify(
  z.toJSONSchema(profileContentSchema, { io: 'input' }),
);
