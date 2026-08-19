import type { Profile } from '../../lib/profile/schema';

interface EditorProps {
  profile: Profile;
  onChange: (profile: Profile) => void;
}

function TextField({
  label,
  value,
  onChange,
  type = 'text',
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  type?: string;
}) {
  const id = `pf-${label.replace(/\W+/g, '-').toLowerCase()}`;
  return (
    <div className="field">
      <label htmlFor={id}>{label}</label>
      <input
        id={id}
        type={type}
        value={value}
        onChange={(event) => onChange(event.target.value)}
      />
    </div>
  );
}

function ListField({
  label,
  hint,
  values,
  onChange,
}: {
  label: string;
  hint?: string;
  values: string[];
  onChange: (values: string[]) => void;
}) {
  const id = `pf-${label.replace(/\W+/g, '-').toLowerCase()}`;
  return (
    <div className="field">
      <label htmlFor={id}>{label}</label>
      <textarea
        id={id}
        rows={2}
        value={values.join(', ')}
        onChange={(event) =>
          onChange(
            event.target.value
              .split(',')
              .map((item) => item.trim())
              .filter(Boolean),
          )
        }
      />
      {hint && <span className="hint">{hint}</span>}
    </div>
  );
}

export function ProfileEditor({ profile, onChange }: EditorProps) {
  const set = (patch: Partial<Profile>) => onChange({ ...profile, ...patch });
  const { personal, links, workAuthorization, preferences } = profile;

  return (
    <>
      <section className="card">
        <h2>Personal</h2>
        <div className="row">
          <TextField
            label="First name"
            value={personal.firstName}
            onChange={(firstName) => set({ personal: { ...personal, firstName } })}
          />
          <TextField
            label="Last name"
            value={personal.lastName}
            onChange={(lastName) => set({ personal: { ...personal, lastName } })}
          />
        </div>
        <div className="row">
          <TextField
            label="Email"
            type="email"
            value={personal.email}
            onChange={(email) => set({ personal: { ...personal, email } })}
          />
          <TextField
            label="Phone"
            value={personal.phone ?? ''}
            onChange={(phone) => set({ personal: { ...personal, phone } })}
          />
        </div>
        <div className="row">
          <TextField
            label="City"
            value={personal.location.city ?? ''}
            onChange={(city) =>
              set({ personal: { ...personal, location: { ...personal.location, city } } })
            }
          />
          <TextField
            label="Country"
            value={personal.location.country ?? ''}
            onChange={(country) =>
              set({
                personal: { ...personal, location: { ...personal.location, country } },
              })
            }
          />
        </div>
      </section>

      <section className="card">
        <h2>Links</h2>
        <div className="row">
          <TextField
            label="LinkedIn"
            type="url"
            value={links.linkedin ?? ''}
            onChange={(linkedin) => set({ links: { ...links, linkedin } })}
          />
          <TextField
            label="GitHub"
            type="url"
            value={links.github ?? ''}
            onChange={(github) => set({ links: { ...links, github } })}
          />
        </div>
        <TextField
          label="Portfolio"
          type="url"
          value={links.portfolio ?? ''}
          onChange={(portfolio) => set({ links: { ...links, portfolio } })}
        />
      </section>

      <section className="card">
        <h2>Summary &amp; skills</h2>
        <div className="field">
          <label htmlFor="pf-summary">Professional summary</label>
          <textarea
            id="pf-summary"
            rows={4}
            value={profile.summary ?? ''}
            onChange={(event) => set({ summary: event.target.value })}
          />
        </div>
        <ListField
          label="Skills"
          hint="Comma-separated."
          values={profile.skills}
          onChange={(skills) => set({ skills })}
        />
        <ListField
          label="Languages"
          hint='Comma-separated, e.g. "English (fluent), German (B2)".'
          values={profile.languages.map((entry) =>
            entry.proficiency
              ? `${entry.language} (${entry.proficiency})`
              : entry.language,
          )}
          onChange={(entries) =>
            set({
              languages: entries.map((entry) => {
                const match = /^(.*?)\s*\((.*)\)$/.exec(entry);
                return match
                  ? { language: match[1]!.trim(), proficiency: match[2]!.trim() }
                  : { language: entry };
              }),
            })
          }
        />
      </section>

      <section className="card">
        <h2>Work authorization</h2>
        <ListField
          label="Authorized to work in"
          hint="Comma-separated country names."
          values={workAuthorization.authorizedToWorkIn}
          onChange={(authorizedToWorkIn) =>
            set({ workAuthorization: { ...workAuthorization, authorizedToWorkIn } })
          }
        />
        <div className="field">
          <label>
            <input
              type="checkbox"
              checked={workAuthorization.needsSponsorship ?? false}
              onChange={(event) =>
                set({
                  workAuthorization: {
                    ...workAuthorization,
                    needsSponsorship: event.target.checked,
                  },
                })
              }
            />{' '}
            Needs visa sponsorship
          </label>
        </div>
      </section>

      <section className="card">
        <h2>Experience</h2>
        {profile.experiences.map((experience, index) => (
          <div className="subcard" key={index}>
            <div className="row">
              <TextField
                label={`Title #${index + 1}`}
                value={experience.title}
                onChange={(title) =>
                  set({
                    experiences: profile.experiences.map((e, i) =>
                      i === index ? { ...e, title } : e,
                    ),
                  })
                }
              />
              <TextField
                label="Company"
                value={experience.company}
                onChange={(company) =>
                  set({
                    experiences: profile.experiences.map((e, i) =>
                      i === index ? { ...e, company } : e,
                    ),
                  })
                }
              />
            </div>
            <div className="row">
              <TextField
                label="Start (YYYY-MM)"
                value={experience.startDate ?? ''}
                onChange={(startDate) =>
                  set({
                    experiences: profile.experiences.map((e, i) =>
                      i === index ? { ...e, startDate } : e,
                    ),
                  })
                }
              />
              <TextField
                label="End (YYYY-MM)"
                value={experience.endDate ?? ''}
                onChange={(endDate) =>
                  set({
                    experiences: profile.experiences.map((e, i) =>
                      i === index ? { ...e, endDate } : e,
                    ),
                  })
                }
              />
            </div>
            <div className="field">
              <label htmlFor={`pf-exp-highlights-${index}`}>
                Highlights (one per line)
              </label>
              <textarea
                id={`pf-exp-highlights-${index}`}
                rows={3}
                value={experience.highlights.join('\n')}
                onChange={(event) =>
                  set({
                    experiences: profile.experiences.map((e, i) =>
                      i === index
                        ? {
                            ...e,
                            highlights: event.target.value
                              .split('\n')
                              .map((line) => line.trim())
                              .filter(Boolean),
                          }
                        : e,
                    ),
                  })
                }
              />
            </div>
            <button
              className="secondary danger"
              onClick={() =>
                set({
                  experiences: profile.experiences.filter((_, i) => i !== index),
                })
              }
            >
              Remove
            </button>
          </div>
        ))}
        <button
          className="secondary"
          onClick={() =>
            set({
              experiences: [
                ...profile.experiences,
                { title: '', company: '', current: false, highlights: [] },
              ],
            })
          }
        >
          Add experience
        </button>
      </section>

      <section className="card">
        <h2>Education</h2>
        {profile.education.map((entry, index) => (
          <div className="subcard" key={index}>
            <div className="row">
              <TextField
                label={`Institution #${index + 1}`}
                value={entry.institution}
                onChange={(institution) =>
                  set({
                    education: profile.education.map((e, i) =>
                      i === index ? { ...e, institution } : e,
                    ),
                  })
                }
              />
              <TextField
                label="Degree"
                value={entry.degree ?? ''}
                onChange={(degree) =>
                  set({
                    education: profile.education.map((e, i) =>
                      i === index ? { ...e, degree } : e,
                    ),
                  })
                }
              />
            </div>
            <button
              className="secondary danger"
              onClick={() =>
                set({ education: profile.education.filter((_, i) => i !== index) })
              }
            >
              Remove
            </button>
          </div>
        ))}
        <button
          className="secondary"
          onClick={() => set({ education: [...profile.education, { institution: '' }] })}
        >
          Add education
        </button>
      </section>

      <section className="card">
        <h2>Answer bank</h2>
        <p className="hint">
          Question/answer pairs the filler may draw on for anything the profile does not
          model — “why us?” seeds, referral source, self-identification stances.
        </p>
        {profile.extraAnswers.map((pair, index) => (
          <div className="subcard" key={index}>
            <TextField
              label={`Question #${index + 1}`}
              value={pair.question}
              onChange={(question) =>
                set({
                  extraAnswers: profile.extraAnswers.map((p, i) =>
                    i === index ? { ...p, question } : p,
                  ),
                })
              }
            />
            <div className="field">
              <label htmlFor={`pf-answer-${index}`}>Answer</label>
              <textarea
                id={`pf-answer-${index}`}
                rows={2}
                value={pair.answer}
                onChange={(event) =>
                  set({
                    extraAnswers: profile.extraAnswers.map((p, i) =>
                      i === index ? { ...p, answer: event.target.value } : p,
                    ),
                  })
                }
              />
            </div>
            <button
              className="secondary danger"
              onClick={() =>
                set({ extraAnswers: profile.extraAnswers.filter((_, i) => i !== index) })
              }
            >
              Remove
            </button>
          </div>
        ))}
        <button
          className="secondary"
          onClick={() =>
            set({ extraAnswers: [...profile.extraAnswers, { question: '', answer: '' }] })
          }
        >
          Add answer
        </button>
      </section>

      <section className="card">
        <h2>Preferences</h2>
        <div className="row">
          <TextField
            label="Desired salary"
            value={preferences.desiredSalary ?? ''}
            onChange={(desiredSalary) =>
              set({ preferences: { ...preferences, desiredSalary } })
            }
          />
          <TextField
            label="Notice period"
            value={preferences.noticePeriod ?? ''}
            onChange={(noticePeriod) =>
              set({ preferences: { ...preferences, noticePeriod } })
            }
          />
        </div>
        <TextField
          label="Remote preference"
          value={preferences.remotePreference ?? ''}
          onChange={(remotePreference) =>
            set({ preferences: { ...preferences, remotePreference } })
          }
        />
      </section>
    </>
  );
}
