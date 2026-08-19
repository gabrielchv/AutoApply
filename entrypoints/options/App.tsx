import { useState } from 'react';
import { SettingsTab } from './SettingsTab';

type Tab = 'profile' | 'settings';

export function App() {
  const [tab, setTab] = useState<Tab>('settings');

  return (
    <div className="page">
      <header>
        <h1>AutoApply</h1>
        <p>Local-first job form filling with your own LLM key.</p>
      </header>
      <nav className="tabs">
        <button
          className={tab === 'profile' ? 'active' : ''}
          onClick={() => setTab('profile')}
        >
          Profile
        </button>
        <button
          className={tab === 'settings' ? 'active' : ''}
          onClick={() => setTab('settings')}
        >
          Settings
        </button>
      </nav>
      {tab === 'profile' ? (
        <div className="card">
          <p className="status muted">
            Profile upload and editing arrives with the ingestion feature.
          </p>
        </div>
      ) : (
        <SettingsTab />
      )}
    </div>
  );
}
