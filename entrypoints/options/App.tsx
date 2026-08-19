import { useState } from 'react';
import { HistoryTab } from './HistoryTab';
import { ProfileTab } from './ProfileTab';
import { SettingsTab } from './SettingsTab';

type Tab = 'profile' | 'history' | 'settings';

export function App() {
  const [tab, setTab] = useState<Tab>('profile');

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
          className={tab === 'history' ? 'active' : ''}
          onClick={() => setTab('history')}
        >
          History
        </button>
        <button
          className={tab === 'settings' ? 'active' : ''}
          onClick={() => setTab('settings')}
        >
          Settings
        </button>
      </nav>
      {tab === 'profile' && <ProfileTab />}
      {tab === 'history' && <HistoryTab />}
      {tab === 'settings' && <SettingsTab />}
    </div>
  );
}
