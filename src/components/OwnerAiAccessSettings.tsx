import { useCallback, useEffect, useState } from 'react';
import { CircleAlert, LoaderCircle, RefreshCw, Save, ShieldCheck } from 'lucide-react';
import { request } from '../services/backend/request';
import './OwnerAiAccessSettings.css';

type AiAccount = {
  uid: string; email: string | null; createdAt: string; signInMethods: string[]; enabled: boolean; accessSource?: string;
  decisionsPerDay: number | null; luMessagesPerDay: number | null; voiceSecondsPerDay: number;
  decisionsUsed: number; luMessagesUsed: number;
};
type AccountList = { owner: boolean; accounts: AiAccount[]; truncated?: boolean };
type InvitationStatus = { enabled: boolean; createdAt: string | null };
type Draft = { enabled: boolean; decisionsPerDay: string; luMessagesPerDay: string; voiceSecondsPerDay: string };

const draftFor = (account: AiAccount): Draft => ({
  enabled: account.enabled,
  decisionsPerDay: account.decisionsPerDay === null ? '' : String(account.decisionsPerDay),
  luMessagesPerDay: account.luMessagesPerDay === null ? '' : String(account.luMessagesPerDay),
  voiceSecondsPerDay: String(account.voiceSecondsPerDay),
});
const parseLimit = (value: string, label: string): number | null => {
  const trimmed = value.trim();
  if (!trimmed || trimmed.toLowerCase() === 'unlimited') return null;
  const number = Number(trimmed);
  if (!Number.isSafeInteger(number) || number < 0 || number > 100_000) throw new Error(`${label} must be “Unlimited” or a whole number from 0 to 100,000.`);
  return number;
};

export function OwnerAiAccessSettings() {
  const [accounts, setAccounts] = useState<AiAccount[]>([]);
  const [drafts, setDrafts] = useState<Record<string, Draft>>({});
  const [status, setStatus] = useState<'loading'|'ready'|'error'>('loading');
  const [message, setMessage] = useState('');
  const [busyUid, setBusyUid] = useState('');
  const [truncated, setTruncated] = useState(false);
  const [invitation, setInvitation] = useState<InvitationStatus>({enabled:false,createdAt:null});
  const [inviteToken, setInviteToken] = useState('');
  const [inviteBusy, setInviteBusy] = useState(false);

  const refresh = useCallback(async () => {
    setStatus('loading'); setMessage('');
    try {
      const [result,invite] = await Promise.all([
        request<AccountList>('/owner/ai-access', {action:'list'}),
        request<InvitationStatus>('/owner/judge-invite', {action:'status'}),
      ]);
      if (!result.owner) throw new Error('Only the verified LuLu owner can manage AI access.');
      const next = result.accounts ?? [];
      setAccounts(next); setDrafts(Object.fromEntries(next.map(account => [account.uid, draftFor(account)])));
      setTruncated(result.truncated === true); setStatus('ready');
      setInvitation(invite);
    } catch (error) {
      setStatus('error'); setMessage(error instanceof Error ? error.message : 'Could not load account access.');
    }
  }, []);
  useEffect(() => { void refresh(); }, [refresh]);

  async function createInvitation() {
    if (invitation.enabled && !window.confirm('Create a new shared judge link? The current link will stop working immediately. Judges will need the new link to get or refill access.')) return;
    setInviteBusy(true); setMessage('');
    try {
      const result=await request<{enabled:boolean;token:string;createdAt:string}>('/owner/judge-invite',{action:'create'});
      if(!result.enabled||!result.token)throw new Error('LuLu did not return a new invitation link.');
      setInvitation({enabled:true,createdAt:result.createdAt});setInviteToken(result.token);setMessage('New shared judge link created. Copy it now; the full link is shown only once.');
    } catch(error) { setMessage(error instanceof Error?error.message:'Could not create the shared judge link.'); }
    finally { setInviteBusy(false); }
  }
  async function copyInvitation() {
    if(!inviteToken)return;
    try { await navigator.clipboard.writeText(`${window.location.origin}/#judge=${inviteToken}`);setMessage('Judge link copied. Share this private link with judges.'); }
    catch { setMessage('Clipboard access is unavailable. Select and copy the link shown below.'); }
  }
  async function disableInvitation() {
    if(!window.confirm('Turn off the shared judge link? Existing judge accounts will lose invitation-based AI access.'))return;
    setInviteBusy(true);setMessage('');
    try { await request('/owner/judge-invite',{action:'disable'});setInvitation({enabled:false,createdAt:null});setInviteToken('');setMessage('Shared judge link disabled. Invitation-based AI access is now off.'); }
    catch(error) { setMessage(error instanceof Error?error.message:'Could not disable the shared judge link.'); }
    finally { setInviteBusy(false); }
  }

  async function save(account: AiAccount) {
    const draft = drafts[account.uid];
    if (!draft || !account.email) return;
    setBusyUid(account.uid); setMessage('');
    try {
      const voiceSecondsPerDay = Number(draft.voiceSecondsPerDay.trim());
      if (!Number.isSafeInteger(voiceSecondsPerDay) || voiceSecondsPerDay < 0 || voiceSecondsPerDay > 3600) throw new Error('Voice time must be a whole number from 0 to 3,600 seconds per day.');
      await request('/owner/ai-access', {
        action:'update', email:account.email, enabled:draft.enabled,
        decisionsPerDay:parseLimit(draft.decisionsPerDay,'Decisions'),
        luMessagesPerDay:parseLimit(draft.luMessagesPerDay,'Lu messages'),
        voiceSecondsPerDay,
      });
      setMessage(`AI access saved for ${account.email}.`);
      await refresh();
    } catch (error) { setMessage(error instanceof Error ? error.message : 'Could not save this account’s AI settings.'); }
    finally { setBusyUid(''); }
  }

  return <main className="owner-ai-access-page">
    <header className="owner-ai-access-header">
      <span className="profile-settings-kicker">OWNER · TEST ACCOUNTS</span>
      <h1>AI access by account</h1>
      <p>Access is checked after sign-in. New accounts remain ordinary LuLu accounts unless you enable AI for them or they use the private judge invitation.</p>
      <div className="owner-ai-default"><ShieldCheck size={18}/><span><strong>Default judge rates</strong><small>Decisions: unlimited · Lu text: unlimited · Live voice: 300 seconds, refilled every 24 hours · one minute without speech pauses a live session.</small></span></div>
      <button type="button" className="profile-settings-link owner-ai-refresh" disabled={status==='loading'} onClick={() => void refresh()}><RefreshCw size={16} className={status==='loading'?'privacy-spin':''}/> Refresh accounts</button>
    </header>
    <section className="owner-ai-invitation" aria-labelledby="owner-judge-invite-title">
      <header><div><span className="profile-settings-kicker">JUDGE ACCESS</span><h2 id="owner-judge-invite-title">One shared invitation link</h2><p>Each judge signs in with their own account. The link stays active until you turn it off; each account has its own AI rates.</p></div><span className={`owner-ai-invite-status${invitation.enabled?' is-active':''}`}><i aria-hidden="true"/>{invitation.enabled?'Active':'Off'}</span></header>
      {invitation.enabled&&invitation.createdAt&&<small className="owner-ai-invite-created">Active since {new Date(invitation.createdAt).toLocaleString()}</small>}
      <div className="owner-ai-invite-actions"><button type="button" className="profile-save-button" disabled={inviteBusy||status==='loading'} onClick={()=>void createInvitation()}>{inviteBusy?<LoaderCircle size={15} className="privacy-spin"/>:<ShieldCheck size={15}/>} {invitation.enabled?'Replace shared link':'Create shared link'}</button>{invitation.enabled&&<button type="button" className="owner-ai-disable-invite" disabled={inviteBusy} onClick={()=>void disableInvitation()}>{inviteBusy?<LoaderCircle size={15} className="privacy-spin"/>:'Turn off link'}</button>}</div>
      {inviteToken&&<div className="owner-ai-generated-invite"><label htmlFor="owner-judge-invite-link">Private judge link · shown once</label><div><input id="owner-judge-invite-link" readOnly value={`${window.location.origin}/#judge=${inviteToken}`} onFocus={event=>event.currentTarget.select()}/><button type="button" className="profile-save-button" onClick={()=>void copyInvitation()}>Copy link</button></div><small>Save this link somewhere private. LuLu stores only a one-way digest, so it cannot display the link again later.</small></div>}
    </section>
    {message && <p className="owner-ai-status" role="status">{message}</p>}
    {status==='loading' && <p className="owner-ai-loading" role="status"><LoaderCircle size={17} className="privacy-spin"/> Loading signed-in accounts…</p>}
    {status==='error' && <p className="owner-ai-error" role="alert"><CircleAlert size={17}/>{message}</p>}
    {status==='ready' && <section className="owner-ai-account-list" aria-label="Account AI access controls">
      {accounts.length===0 ? <p>No other signed-in accounts are available yet.</p> : accounts.map(account=>{
        const draft=drafts[account.uid] ?? draftFor(account);
        const saving=busyUid===account.uid;
        return <article className="owner-ai-account-card" key={account.uid}>
          <header><div><h2>{account.email || 'Passkey-only account'}</h2><small>{account.signInMethods.join(' · ') || 'No linked sign-in method'} · joined {new Date(account.createdAt).toLocaleDateString()} · access: {account.accessSource||'none'}</small></div><label className="owner-ai-enabled"><input type="checkbox" checked={draft.enabled} disabled={!account.email || saving} onChange={event=>setDrafts(current=>({...current,[account.uid]:{...draft,enabled:event.target.checked}}))}/>{draft.enabled?'AI enabled':'AI disabled'}</label></header>
          {!account.email && <p className="owner-ai-no-email">Link a verified email to manage AI settings for this account by email.</p>}
          <div className="owner-ai-rates">
            <label>Decisions per day<input inputMode="numeric" placeholder="Unlimited" value={draft.decisionsPerDay} disabled={!account.email || saving} onChange={event=>setDrafts(current=>({...current,[account.uid]:{...draft,decisionsPerDay:event.target.value}}))}/><small>{account.decisionsPerDay===null?`Current: unlimited · used ${account.decisionsUsed} today`:`Used today: ${account.decisionsUsed} / ${account.decisionsPerDay}`}</small></label>
            <label>Lu text messages per day<input inputMode="numeric" placeholder="Unlimited" value={draft.luMessagesPerDay} disabled={!account.email || saving} onChange={event=>setDrafts(current=>({...current,[account.uid]:{...draft,luMessagesPerDay:event.target.value}}))}/><small>{account.luMessagesPerDay===null?`Current: unlimited · used ${account.luMessagesUsed} today`:`Used today: ${account.luMessagesUsed} / ${account.luMessagesPerDay}`}</small></label>
            <label>Live voice seconds per day<input inputMode="numeric" value={draft.voiceSecondsPerDay} disabled={!account.email || saving} onChange={event=>setDrafts(current=>({...current,[account.uid]:{...draft,voiceSecondsPerDay:event.target.value}}))}/><small>{draft.voiceSecondsPerDay==='300'?'Default: 5 minutes, refill every 24 hours':'0 disables voice; maximum 3,600 seconds'}</small></label>
          </div>
          <button className="profile-save-button owner-ai-save" type="button" disabled={!account.email || saving} onClick={()=>void save(account)}>{saving?<LoaderCircle size={15} className="privacy-spin"/>:<Save size={15}/>} Save access and rates</button>
        </article>;
      })}
    </section>}
    {truncated && <p className="owner-ai-status">Showing the first 100 accounts.</p>}
  </main>;
}
