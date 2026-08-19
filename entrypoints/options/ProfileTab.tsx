import { useEffect, useRef, useState } from 'react';
import { sendToBackground } from '../../lib/messaging/protocol';
import { extractPdfText } from '../../lib/pdf/extractText';
import { emptyProfile } from '../../lib/profile/empty';
import type { Profile } from '../../lib/profile/schema';
import { saveCvFile } from '../../lib/storage/cvFile';
import { loadProfile, saveProfile } from '../../lib/storage/profile';
import { ProfileEditor } from './ProfileEditor';

type Status =
  | { state: 'idle' }
  | { state: 'busy'; message: string }
  | { state: 'success'; message: string }
  | { state: 'error'; message: string };

interface ProfileTabProps {
  hasProvider: boolean;
  onSaved: () => void;
  onConfigureProvider: () => void;
}

export function ProfileTab({
  hasProvider,
  onSaved,
  onConfigureProvider,
}: ProfileTabProps) {
  const [profile, setProfile] = useState<Profile | null>(null);
  const [loaded, setLoaded] = useState(false);
  const [status, setStatus] = useState<Status>({ state: 'idle' });
  const fileInput = useRef<HTMLInputElement>(null);

  useEffect(() => {
    void loadProfile().then((stored) => {
      setProfile(stored);
      setLoaded(true);
    });
  }, []);

  async function ingest(file: File) {
    try {
      setStatus({ state: 'busy', message: 'Reading PDF…' });
      const bytes = await file.arrayBuffer();
      // Keep the original for later re-attachment to job forms' file inputs.
      await saveCvFile({
        // pdf.js transfers the buffer it receives to its worker, so give it
        // its own copy and store the pristine one.
        bytes,
        fileName: file.name,
        mimeType: file.type || 'application/pdf',
      });
      const text = await extractPdfText(bytes.slice(0));

      setStatus({ state: 'busy', message: 'Asking the LLM to structure your CV…' });
      const result = await sendToBackground({ type: 'STRUCTURE_CV', rawText: text });
      if (!result.ok) {
        setStatus({ state: 'error', message: result.error.message });
        return;
      }

      const now = new Date().toISOString();
      const next: Profile = {
        ...result.value,
        meta: {
          version: 1,
          createdAt: profile?.meta.createdAt ?? now,
          updatedAt: now,
          sourceFileName: file.name,
        },
      };
      await saveProfile(next);
      setProfile(next);
      onSaved();
      setStatus({
        state: 'success',
        message:
          'Profile created. Review and correct it below — it is the source of truth for filling.',
      });
    } catch (error) {
      setStatus({ state: 'error', message: String(error) });
    }
  }

  async function handleSave() {
    if (!profile) return;
    const next = {
      ...profile,
      meta: { ...profile.meta, updatedAt: new Date().toISOString() },
    };
    await saveProfile(next);
    setProfile(next);
    onSaved();
    setStatus({ state: 'success', message: 'Profile saved.' });
  }

  if (!loaded) return null;

  if (!hasProvider) {
    return (
      <div className="card">
        <h2>Step 2 — your CV</h2>
        <div className="note">
          <strong>Connect your LLM provider first.</strong>
          <p className="hint">
            Reading your CV is itself an LLM call, so step 1 has to come first.
          </p>
          <button className="primary" onClick={onConfigureProvider}>
            Go to step 1
          </button>
        </div>
      </div>
    );
  }

  return (
    <>
      <div className="card">
        <h2>Step 2 — your CV</h2>
        <p className="hint">
          Upload your CV as PDF (or your LinkedIn profile exported as PDF). It is parsed
          locally; only the extracted text is sent to your configured LLM — once — to
          build the structured profile below. The original file is kept so it can be
          attached to application forms.
        </p>
        <div className="actions">
          <input
            ref={fileInput}
            type="file"
            accept="application/pdf,.pdf"
            style={{ display: 'none' }}
            onChange={(event) => {
              const file = event.target.files?.[0];
              if (file) void ingest(file);
              event.target.value = '';
            }}
          />
          <button
            className="primary"
            disabled={status.state === 'busy'}
            onClick={() => fileInput.current?.click()}
          >
            {profile ? 'Re-upload CV' : 'Upload CV (PDF)'}
          </button>
          {!profile && (
            <button
              className="secondary"
              onClick={() => {
                const now = new Date().toISOString();
                setProfile(emptyProfile(now));
              }}
            >
              Start from scratch
            </button>
          )}
          {status.state !== 'idle' && (
            <span
              className={`status ${
                status.state === 'busy'
                  ? 'muted'
                  : status.state === 'success'
                    ? 'success'
                    : 'error'
              }`}
            >
              {status.message}
            </span>
          )}
        </div>
      </div>

      {profile && (
        <>
          <ProfileEditor profile={profile} onChange={setProfile} />
          <div className="actions">
            <button className="primary" onClick={() => void handleSave()}>
              Save profile
            </button>
          </div>
        </>
      )}
    </>
  );
}
