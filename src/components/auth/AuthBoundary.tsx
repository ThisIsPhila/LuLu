import { useEffect, useRef, useState, type ReactNode } from 'react';
import { OnboardingAuth, type AuthActionResult } from '../OnboardingAuth';
import { authenticate, authenticateWithEmail, authenticateWithGoogle, authError, BackendRequestError, restoreNativeAppSession, restorePendingNativeAuth, type AppSession } from '../../services/backend/passkeys';
import { isNativePlatform } from '../../platform/runtime';
import './auth.css';
export function AuthBoundary({children}: {children:(session:AppSession,onSignedOut:()=>void)=>ReactNode}) {
  const [session,setSession]=useState<AppSession|null>(null);
  const [restoring,setRestoring]=useState(isNativePlatform());
  const verified=useRef<AppSession|null>(null);
  useEffect(()=>{
    if(!isNativePlatform())return;
    let active=true;
    void (async()=>{
      let restored:AppSession|null=null;
      try {
        const resumed=await restorePendingNativeAuth();
        restored=resumed?.session ?? null;
      } catch { /* A stale pending exchange must not prevent ordinary session recovery. */ }
      if(!restored){try{restored=await restoreNativeAppSession();}catch{/* Reauthentication remains available. */}}
      if(active && restored){verified.current=restored;setSession(restored);}
      if(active)setRestoring(false);
    })();
    return()=>{active=false;};
  },[]);
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
  if(session) return children(session,()=>{verified.current=null;setSession(null);});
  if(restoring)return <div className="auth-restore" role="status">Opening your LuLu journal…</div>;
  return <OnboardingAuth
    initialScreen={new URLSearchParams(window.location.search).get('screen') === 'signin' ? 'signin' : new URLSearchParams(window.location.search).get('screen') === 'create' ? 'create' : 'welcome'}
    onRegister={()=>beginPasskey(true)}
    onSignIn={()=>beginPasskey(false)}
    onEmailAuth={(email,password,create)=>runAuthentication(()=>authenticateWithEmail(email,password,create))}
    onGoogleSignIn={()=>runAuthentication(authenticateWithGoogle)}
    onAuthenticated={()=>{if(verified.current)setSession(verified.current);}}
  />;
}
