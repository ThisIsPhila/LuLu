import { useEffect, useRef, useState, type ReactNode } from 'react';
import { OnboardingAuth, type AuthActionResult } from '../OnboardingAuth';
import { OnboardingJourney, type OnboardingJourneyScreen, type OnboardingJourneyState, type JourneyActionResult } from '../OnboardingJourney';
import { authenticate, authenticateWithEmail, authenticateWithGoogle, authError, BackendRequestError, logout, requestEmailPasswordReset, restoreNativeAppSession, restorePendingNativeAuth, restoreWebAppSession, type AppSession } from '../../services/backend/passkeys';
import { bindOnboardingDraft, discardUnreadableOnboardingDraft, loadOnboardingDraft, saveFirstOnboardingEntry, saveOnboardingProgress } from '../../services/onboardingDraft';
import { isNativePlatform } from '../../platform/runtime';
import { localDevelopmentAvailable, localDevelopmentSession } from '../../services/localDevelopment';
import './auth.css';
const localPreviewSessionKey = 'lulu.local-preview.active';
export function AuthBoundary({children}: {children:(session:AppSession,onSignedOut:()=>void)=>ReactNode}) {
  const [session,setSession]=useState<AppSession|null>(null);
  const [restoring,setRestoring]=useState(true);
  const [sessionRestoreError,setSessionRestoreError]=useState('');
  const [journeyReady,setJourneyReady]=useState(false);
  const [journeyError,setJourneyError]=useState('');
  const [draftReadFailed,setDraftReadFailed]=useState(false);
  const [journeyScreen,setJourneyScreen]=useState<OnboardingJourneyScreen>(1);
  const [journeyInitialState,setJourneyInitialState]=useState<Partial<OnboardingJourneyState>>({});
  const [route,setRoute]=useState<'journey'|'signin'>('signin');
  const journeyScreenRef=useRef<OnboardingJourneyScreen>(1);
  const journeyStateRef=useRef<OnboardingJourneyState>({name:'',intentions:[],prompt:null,firstEntryText:'',supportChoice:null});
  const verified=useRef<AppSession|null>(null);
  useEffect(()=>{
    if(route!=='journey')return;
    let active=true;
    void loadOnboardingDraft().then(draft=>{
      if(!active)return;
      if(draft && !draft.ownerUid){
        const restoredScreen = draft.version===3 ? draft.screen : draft.version===2
          ? ({1:1,2:2,3:6,4:8,5:9,6:11,7:13,8:14} as Record<number,number>)[draft.screen]
          : draft.screen;
        journeyScreenRef.current=restoredScreen as OnboardingJourneyScreen;
        journeyStateRef.current={...journeyStateRef.current,...draft.state} as OnboardingJourneyState;
        setJourneyScreen(journeyScreenRef.current);
        setJourneyInitialState(journeyStateRef.current);
      }
    }).catch(error=>{if(active){setDraftReadFailed(true);setJourneyError(error instanceof Error?error.message:'The local onboarding draft could not be opened.');}})
      .finally(()=>{if(active)setJourneyReady(true);});
    return()=>{active=false;};
  },[route]);
  useEffect(()=>{
    let active=true;
    void (async()=>{
      if (localDevelopmentAvailable() && sessionStorage.getItem(localPreviewSessionKey) === 'yes') {
        if (active) { setSession(localDevelopmentSession()); setRestoring(false); }
        return;
      }
      let restored:AppSession|null=null;
      if(isNativePlatform()){
        try {
          const resumed=await restorePendingNativeAuth();
          restored=resumed?.session ?? null;
        } catch { /* A stale pending exchange must not prevent ordinary session recovery. */ }
        if(!restored){try{restored=await restoreNativeAppSession();}catch{if(active)setSessionRestoreError('LuLu could not confirm your saved account session. Your sign-in is still saved on this device. Reconnect and retry before continuing.');}}
      } else {
        try { restored=await restoreWebAppSession(); }
        catch { if(active)setSessionRestoreError('LuLu could not confirm your account session or verify that private access is locked. Your sign-in is still saved on this device. Reconnect and retry before continuing.'); }
      }
      if(active && restored){verified.current=restored;setSession(restored);}
      if(active)setRestoring(false);
    })();
    return()=>{active=false;};
  },[]);
  async function retrySessionRestore() {
    setRestoring(true);setSessionRestoreError('');
    try {
      let restored:AppSession|null=null;
      if(isNativePlatform()){
        try { restored=(await restorePendingNativeAuth())?.session ?? null; }
        catch { /* Try the ordinary native session path after a stale handoff. */ }
        if(!restored)restored=await restoreNativeAppSession();
      } else restored=await restoreWebAppSession();
      if(restored){verified.current=restored;setSession(restored);}
    } catch {
      setSessionRestoreError('LuLu still cannot confirm this session. Private content remains unavailable until the connection is restored.');
    } finally {setRestoring(false);}
  }
  async function signOutDuringRestore() {
    try { await logout(); }
    catch { /* logout clears the Firebase credential even when the backend is unreachable. */ }
    verified.current=null;setSession(null);setSessionRestoreError('');
  }
  async function runAuthentication(action:()=>Promise<AppSession>):Promise<AuthActionResult> {
    try {verified.current=await action();return {status:'authenticated'};}
    catch(error){
      verified.current=null;
      if(error instanceof Error && error.name==='NotAllowedError')return {status:'cancelled'};
      if(error instanceof BackendRequestError && error.recoveryAction==='sign-in')return {status:'error',reason:'unknown',message:'Your passkey may already be ready. Sign in with it to continue.',recoveryAction:'sign-in'};
      return {status:'error',reason:error instanceof TypeError?'network':'unknown',message:authError(error)};
    }
  }
  function beginPasskey(create:boolean):Promise<AuthActionResult> {
    if(window.location.hostname==='127.0.0.1')return Promise.resolve({status:'error',reason:'local-origin'});
    return runAuthentication(()=>authenticate(create));
  }
  function persistJourney(screen:OnboardingJourneyScreen,state:OnboardingJourneyState){
    if(typeof screen!=='number')return;
    void saveOnboardingProgress(screen,state).then(()=>setJourneyError('')).catch(error=>{
      setJourneyError(error instanceof Error?error.message:'Your onboarding progress could not be saved on this device.');
    });
  }
  async function saveFirstEntry(entry:{text:string;prompt:string|null}):Promise<JourneyActionResult>{
    try {
      journeyStateRef.current={...journeyStateRef.current,firstEntryText:entry.text,prompt:entry.prompt};
      await saveFirstOnboardingEntry(entry.text,entry.prompt,journeyStateRef.current);
      setJourneyError('');
      return {status:'success'};
    }catch(error){return {status:'error',message:error instanceof Error?error.message:'The entry could not be saved on this device.'};}
  }
  async function enroll(state:OnboardingJourneyState):Promise<JourneyActionResult>{
    journeyStateRef.current=state;
    if(window.location.hostname==='127.0.0.1')return {
      status:'error',
      message:'This local address cannot create a passkey. Open LuLu on localhost to test enrollment. Any draft on this address remains here because browsers keep the two local addresses separate.',
      actionUrl:`http://localhost:${window.location.port || '5173'}${window.location.pathname}`,
      actionLabel:'Open LuLu on localhost',
    };
    if(!verified.current){
      const result=await beginPasskey(true);
      if(result.status==='cancelled')return {status:'cancelled'};
      if(result.status==='error')return {status:'error',message:result.message??authError(new Error(result.reason))};
    }
    try {
      await bindOnboardingDraft(verified.current!.uid);
      setSession(verified.current);
      return {status:'success'};
    }catch(error){
      return {status:'error',message:`Your account is ready, but LuLu couldn't retain the local onboarding draft yet. Try again here. ${error instanceof Error?error.message:''}`};
    }
  }
  if(session) return children(session,()=>{if(localDevelopmentAvailable())sessionStorage.removeItem(localPreviewSessionKey);verified.current=null;setSession(null);});
  if(restoring || (route==='journey' && !journeyReady))return <div className="auth-restore" role="status">Opening your LuLu journal…</div>;
  if(sessionRestoreError)return <main className="auth-session-recovery" role="alert"><h1>We couldn’t confirm your session.</h1><p>{sessionRestoreError}</p><button type="button" onClick={()=>void retrySessionRestore()}>Retry connection</button><button type="button" onClick={()=>void signOutDuringRestore()}>Sign out on this device</button></main>;
  if(draftReadFailed && route==='journey')return <div className="auth-draft-recovery" role="alert">
    <h1>Your local draft could not be opened.</h1><p>{journeyError} The text stays on this device until you choose what to do.</p>
    <button type="button" onClick={()=>setRoute('signin')}>Sign in to an existing account</button>
    <button type="button" onClick={()=>void discardUnreadableOnboardingDraft().then(()=>{setDraftReadFailed(false);setJourneyError('');setJourneyScreen(1);journeyScreenRef.current=1;setJourneyInitialState({});}).catch(error=>setJourneyError(error instanceof Error?error.message:'The local draft could not be discarded.'))}>Discard unreadable draft and start again</button>
  </div>;
  if(route==='journey')return <>
    {journeyError && <div className="auth-journey-error" role="alert">{journeyError}</div>}
    <OnboardingJourney initialScreen={journeyScreen} initialState={journeyInitialState}
      onboardingStateChange={state=>{journeyStateRef.current=state;persistJourney(journeyScreenRef.current,state);}}
      onNavigate={screen=>{
        if(screen==='sign-in'){setRoute('signin');return;}
        journeyScreenRef.current=screen;
        setJourneyScreen(screen);
        persistJourney(screen,journeyStateRef.current);
      }}
      onSaveFirstEntry={saveFirstEntry} onCreatePrivateSpace={enroll} onSignIn={()=>setRoute('signin')} />
  </>;
  return <OnboardingAuth
    initialScreen="signin"
    onRegister={()=>beginPasskey(true)}
    onSignIn={()=>beginPasskey(false)}
    onEmailAuth={(email,password,create)=>runAuthentication(()=>authenticateWithEmail(email,password,create))}
    onForgotPassword={async email=>{
      try {
        await requestEmailPasswordReset(email);
        return {status:'notice',message:'If an account can be reset with this address, Firebase has accepted a password-reset request. Check the inbox and spam folder.'};
      } catch(error) {
        return {status:'error',reason:error instanceof TypeError?'network':'unknown',message:authError(error)};
      }
    }}
    onGoogleSignIn={()=>runAuthentication(authenticateWithGoogle)}
    onStartOnboarding={()=>setRoute('journey')}
    onDevelopmentEnter={localDevelopmentAvailable() ? ()=>{sessionStorage.setItem(localPreviewSessionKey,'yes');setSession(localDevelopmentSession());} : undefined}
    onAuthenticated={()=>{if(verified.current)setSession(verified.current);}}
  />;
}
