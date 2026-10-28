import { useEffect, useState } from 'react';
import { ArrowLeft, ChevronRight, LogOut, ShieldCheck, Type } from 'lucide-react';
import type { AppPreferences } from '../services/appPreferences';
import { ProfileAvatar } from './ProfileAvatar';
import { prepareProfilePhoto } from '../services/profilePhoto';
import { AccountLinkingPanel } from './AccountLinkingPanel';
import './ProfileSettingsView.css';

type Props = {
  preferences: AppPreferences;
  displayName: string;
  onDisplayNameChange: (name: string) => Promise<void>;
  photoUrl: string;
  onPhotoSave: (photo: string) => Promise<void>;
  uid: string;
  authMethod?: 'passkey' | 'email' | 'google';
  emailVerificationStatus?: 'sent' | 'failed';
  isPrivateSessionActive: () => boolean;
  judgeAccess: boolean;
  judgeInvitePending: boolean;
  onRetryJudgeInvite: () => void;
  onPreferencesChange: (preferences: AppPreferences) => void;
  onBack: () => void;
  onOpenModelSettings: () => void;
  onSignOut: () => void;
};

export function ProfileSettingsView({ preferences, displayName, onDisplayNameChange, photoUrl, onPhotoSave, uid, authMethod, emailVerificationStatus, isPrivateSessionActive, judgeAccess, judgeInvitePending, onRetryJudgeInvite, onPreferencesChange, onBack, onOpenModelSettings, onSignOut }: Props) {
  const [nameDraft, setNameDraft] = useState(displayName);
  const [nameStatus, setNameStatus] = useState('');
  useEffect(() => setNameDraft(displayName), [displayName]);
  const [photoDraft, setPhotoDraft] = useState('');
  const [photoStatus, setPhotoStatus] = useState('');
  const [savingName, setSavingName] = useState(false);
  const [savingPhoto, setSavingPhoto] = useState(false);
  async function saveName() {
    setSavingName(true); setNameStatus('Saving…');
    try { await onDisplayNameChange(nameDraft.trim()); setNameStatus('Name saved on this device.'); }
    catch { setNameStatus('Could not save your name. Please try again.'); }
    finally { setSavingName(false); }
  }
  async function choosePhoto(file?: File) {
    if (!file) return;
    setPhotoStatus('Preparing photo…');
    try { setPhotoDraft(await prepareProfilePhoto(file)); setPhotoStatus('Photo ready to save.'); }
    catch (error) { setPhotoStatus(error instanceof Error ? error.message : 'Could not read this photo.'); }
  }
  async function savePhoto() {
    if (!photoDraft) return;
    setSavingPhoto(true); setPhotoStatus('Saving…');
    try { await onPhotoSave(photoDraft); setPhotoDraft(''); setPhotoStatus('Photo saved on this device.'); }
    catch { setPhotoStatus('Could not save your photo. Please try again.'); }
    finally { setSavingPhoto(false); }
  }
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
            <div className="profile-settings-name">
              <label htmlFor="profile-name" className="profile-settings-copy"><strong>Your name</strong><small>Used in your greeting and saved encrypted on this device.</small></label>
              <input id="profile-name" value={nameDraft} maxLength={80} autoComplete="given-name" onChange={event => {setNameDraft(event.target.value);setNameStatus('');}} placeholder="Add your name" />
              <button type="button" className="profile-save-button" disabled={savingName || nameDraft.trim() === displayName.trim()} onClick={() => void saveName()}>Save name</button>
              <small className="profile-save-status" role="status">{nameStatus}</small>
            </div>
            <div className="profile-settings-name">
              <span className="profile-settings-copy"><strong>Profile photo</strong><small>Your Google photo is used when available. A photo you choose is saved encrypted on this device.</small></span>
              <span className="profile-photo-preview"><ProfileAvatar photoUrl={photoDraft || photoUrl} /></span>
              <label className="profile-photo-picker">Choose photo<input type="file" accept="image/*" onChange={event => {void choosePhoto(event.target.files?.[0]);event.currentTarget.value='';}} /></label>
              <button type="button" className="profile-save-button" disabled={savingPhoto || !photoDraft} onClick={() => void savePhoto()}>Save photo</button>
              <small className="profile-save-status" role="status">{photoStatus}</small>
            </div>
            <div className="profile-settings-row static-row">
              <span className="profile-settings-copy"><strong>Signed in to LuLu</strong><small>Your account is needed to open your journal.</small></span>
            </div>
            {judgeAccess && <div className="profile-settings-row static-row"><span className="profile-settings-copy"><strong>Judge access</strong><small>Decisions: unlimited. Voice: planned five active minutes, refill after 24 hours. Voice AI and usage tracking are not available yet.</small></span><span className="profile-settings-status">Active</span></div>}
            {judgeInvitePending && <button className="profile-settings-link" type="button" onClick={onRetryJudgeInvite}><span className="profile-settings-copy"><strong>Apply judge invitation</strong><small>Try linking the invitation to this signed-in account again.</small></span></button>}
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
