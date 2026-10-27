import { ArrowLeft, ChevronRight, LogOut, ShieldCheck, Type } from 'lucide-react';
import type { AppPreferences } from '../services/appPreferences';
import { AccountLinkingPanel } from './AccountLinkingPanel';
import './ProfileSettingsView.css';

type Props = {
  preferences: AppPreferences;
  displayName: string;
  onDisplayNameChange: (name: string) => void;
  uid: string;
  authMethod?: 'passkey' | 'email' | 'google';
  emailVerificationStatus?: 'sent' | 'failed';
  isPrivateSessionActive: () => boolean;
  onPreferencesChange: (preferences: AppPreferences) => void;
  onBack: () => void;
  onOpenModelSettings: () => void;
  onSignOut: () => void;
};

export function ProfileSettingsView({ preferences, displayName, onDisplayNameChange, uid, authMethod, emailVerificationStatus, isPrivateSessionActive, onPreferencesChange, onBack, onOpenModelSettings, onSignOut }: Props) {
  return (
    <main className="profile-settings-page">
      <header className="profile-settings-header">
        <button className="profile-settings-back" type="button" onClick={onBack} aria-label="Back to journal">
          <ArrowLeft size={17} aria-hidden="true" />
          <span>Journal</span>
        </button>
        <span className="profile-settings-kicker">YOUR ACCOUNT</span>
        <h1>Profile & settings</h1>
        <p>Choose how LuLu feels to use and review where your writing is kept.</p>
      </header>

      <div className="profile-settings-sections">
        <section className="profile-settings-section" aria-labelledby="accessibility-heading">
          <h2 id="accessibility-heading">Accessibility</h2>
          <div className="profile-settings-card">
            <div className="profile-settings-row static-row">
              <span className="profile-settings-icon"><Type size={18} aria-hidden="true" /></span>
              <span className="profile-settings-copy"><strong>Text size</strong><small>Use your device or browser text-size controls to enlarge LuLu.</small></span>
            </div>
            <div className="profile-settings-row">
              <span className="profile-settings-icon"><ShieldCheck size={18} aria-hidden="true" /></span>
              <span className="profile-settings-copy"><strong>Reduce motion</strong><small>Limit animation and movement in LuLu on this device.</small></span>
              <input
                className="profile-settings-toggle"
                type="checkbox"
                role="switch"
                aria-label="Reduce motion"
                checked={preferences.reduceMotion}
                onChange={event => onPreferencesChange({ ...preferences, reduceMotion: event.target.checked })}
              />
            </div>
          </div>
        </section>

        <section className="profile-settings-section" aria-labelledby="appearance-heading">
          <h2 id="appearance-heading">Appearance</h2>
          <div className="profile-settings-card">
            <div className="profile-settings-row static-row">
              <span className="profile-settings-copy"><strong>Warm paper</strong><small>LuLu’s current reading and writing theme.</small></span>
              <span className="profile-settings-value">Current</span>
            </div>
            <div className="profile-settings-row static-row">
              <span className="profile-settings-copy"><strong>Language</strong><small>English is currently available.</small></span>
              <span className="profile-settings-value">English</span>
            </div>
          </div>
        </section>

        <section className="profile-settings-section" aria-labelledby="privacy-heading">
          <h2 id="privacy-heading">Privacy & storage</h2>
          <div className="profile-settings-card">
            <div className="profile-settings-row static-row">
              <span className="profile-settings-copy"><strong>Everyday journal</strong><small>Your ordinary entries are stored with your LuLu account.</small></span>
              <span className="profile-settings-status">Account</span>
            </div>
            <div className="profile-settings-row static-row">
              <span className="profile-settings-copy"><strong>Private writing</strong><small>Private records stay in encrypted device storage and are not shown in ordinary lists.</small></span>
              <span className="profile-settings-status">On device</span>
            </div>
            <button className="profile-settings-link" type="button" onClick={onOpenModelSettings}>
              <span className="profile-settings-copy"><strong>Privacy processing</strong><small>Manage the local model and check whether reviewed-text cloud interpretation is available.</small></span>
              <ChevronRight size={18} aria-hidden="true" />
            </button>
            <p className="profile-settings-note">Readable exports and encrypted backups are prepared from a saved record. They are not automatic account backups.</p>
          </div>
        </section>

        <section className="profile-settings-section" aria-labelledby="account-heading">
          <h2 id="account-heading">Account</h2>
          <div className="profile-settings-card">
            <label className="profile-settings-name">
              <span className="profile-settings-copy"><strong>Your name</strong><small>Used in your greeting and saved encrypted on this device.</small></span>
              <input aria-label="Your name" value={displayName} maxLength={80} autoComplete="given-name" onChange={event => onDisplayNameChange(event.target.value)} placeholder="Add your name" />
            </label>
            <div className="profile-settings-row static-row">
              <span className="profile-settings-copy"><strong>Signed in to LuLu</strong><small>Your account is needed to open your journal.</small></span>
            </div>
            <button className="profile-settings-signout" type="button" onClick={onSignOut}>
              <LogOut size={17} aria-hidden="true" />
              Sign out
            </button>
          </div>
        </section>
        <AccountLinkingPanel uid={uid} authMethod={authMethod} emailVerificationStatus={emailVerificationStatus} isPrivateSessionActive={isPrivateSessionActive} />
      </div>
    </main>
  );
}
