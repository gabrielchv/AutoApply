import type { Profile } from './schema';

/**
 * A blank profile for users who prefer manual entry over CV upload.
 *
 * Built literally rather than via schema.parse: the schema requires non-empty
 * names/email (a guarantee we demand from LLM ingestion), while a manual
 * profile legitimately starts blank.
 */
export function emptyProfile(now: string): Profile {
  return {
    meta: { version: 1, createdAt: now, updatedAt: now },
    personal: { firstName: '', lastName: '', email: '', location: {} },
    workAuthorization: { authorizedToWorkIn: [] },
    links: { other: [] },
    experiences: [],
    education: [],
    skills: [],
    languages: [],
    certifications: [],
    preferences: {},
    extraAnswers: [],
  };
}
