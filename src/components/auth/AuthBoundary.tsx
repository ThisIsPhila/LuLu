import { useRef, useState, type ReactNode } from 'react';
import { OnboardingAuth, type AuthActionResult } from '../OnboardingAuth';
import { authenticate, authError, BackendRequestError, type AppSession } from '../../services/backend/passkeys';
import './auth.css';
export function AuthBoundary({children}: {children:(session:AppSession,onSignedOut:()=>void)=>ReactNode}) {
  const [session,setSession]=useState<AppSession|null>(null);
  const verified=useRef<AppSession|null>(null);
  async function begin(create:boolean):Promise<AuthActionResult> {
    if(window.location.hostname==='127.0.0.1')return {status:'error',reason:'local-origin'};
    try {verified.current=await authenticate(create);return {status:'authenticated'};}
    catch(error){
      verified.current=null;
      if(error instanceof Error && error.name==='NotAllowedError')return {status:'cancelled'};
      if(error instanceof BackendRequestError && create && error.recoveryAction==='sign-in')return {status:'error',reason:'unknown',message:'Your passkey may already be ready. Sign in with it to continue.',recoveryAction:'sign-in'};
      return {status:'error',reason:error instanceof TypeError?'network':'unknown',message:authError(error)};
    }
  }
  if(session) return children(session,()=>{verified.current=null;setSession(null);});
  return <OnboardingAuth
    initialScreen={new URLSearchParams(window.location.search).get('screen') === 'signin' ? 'signin' : new URLSearchParams(window.location.search).get('screen') === 'create' ? 'create' : 'welcome'}
    onRegister={()=>begin(true)}
    onSignIn={()=>begin(false)}
    onAuthenticated={()=>{if(verified.current)setSession(verified.current);}}
  />;
}
