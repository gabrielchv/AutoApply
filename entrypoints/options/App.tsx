import { useState } from 'react';
import { HistoryTab } from './HistoryTab';
import { ProfileTab } from './ProfileTab';
import { SettingsTab } from './SettingsTab';
import { useSetupStatus } from './useSetupStatus';

type Tab = 'provider' | 'cv' | 'history';

export function App() {
  const { status, refresh } = useSetupStatus();
  const [tab, setTab] = useState<Tab | null>(null);

  if (!status) return null;

  // Land on the first unfinished step: the provider key comes before the CV,
  // because structuring a CV needs a working LLM.
  const activeTab: Tab = tab ?? (!status.hasProvider ? 'provider' : 'cv');

  return (
    <div className="page">
      <header>
        <h1>AutoApply</h1>
        <p>Local-first job form filling with your own LLM key.</p>
      </header>

      <nav className="tabs">
        <button
          className={activeTab === 'provider' ? 'active' : ''}
          onClick={() => setTab('provider')}
        >
          <span className="step-number">1</span> LLM provider
          {status.hasProvider && <span className="step-check">✓</span>}
        </button>
        <button
          className={activeTab === 'cv' ? 'active' : ''}
          onClick={() => setTab('cv')}
        >
          <span className="step-number">2</span> Your CV
          {status.hasProfile && <span className="step-check">✓</span>}
        </button>
        <button
          className={activeTab === 'history' ? 'active' : ''}
          onClick={() => setTab('history')}
        >
          History
        </button>
      </nav>

      {activeTab === 'provider' && (
        <SettingsTab
          onSaved={() => void refresh()}
          nextStep={status.hasProfile ? null : () => setTab('cv')}
        />
      )}
      {activeTab === 'cv' && (
        <ProfileTab
          hasProvider={status.hasProvider}
          onSaved={() => void refresh()}
          onConfigureProvider={() => setTab('provider')}
        />
      )}
      {activeTab === 'history' && <HistoryTab />}
    </div>
  );
}
