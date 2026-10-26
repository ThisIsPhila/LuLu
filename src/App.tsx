import React, { useState, useEffect, useRef, useMemo, useLayoutEffect } from 'react';
import { CircleAlert, X } from 'lucide-react';
import type { Entry } from './domain/journal';
import { filterOrdinaryEntries } from './domain/ordinaryBrowse';
import { AuthBoundary } from './components/auth/AuthBoundary';
import { watchEntries, saveEntry, readOriginal, updateEntry, deleteEntry } from './services/backend/journal';
import { ensureStarterEntries } from './services/backend/demoCatalogue';
import { unlockPrivate, lockPrivate, logout, type AppSession } from './services/backend/passkeys';
import type { Entity } from './domain/transform';
import { initialEntities } from './domain/transform';
import { JournalHome } from './components/JournalHome';
import { TransformProtectView } from './components/TransformProtectView';
import { ProtectedWritingView } from './components/ProtectedWritingView';
import { EntityInspectorView } from './components/EntityInspectorView';
import { ReaderView } from './components/ReaderView';
import { StoryLeavesView } from './components/StoryLeavesView';
import { PrivateSanctuaryView } from './components/PrivateSanctuaryView';
import { BottomNav } from './components/BottomNav';
import { ProtectedGateModal } from './components/ProtectedGateModal';
import { LocalPrivateJournal } from './components/LocalPrivateJournal';
import { LocalVault } from './services/vault/localVault';
import { LocalMediaVault } from './services/vault/localMediaVault';
import { onAndroidBack, onAppActiveChange, exitNativeApp } from './platform/appLifecycle';

export default function App() {
  return <AuthBoundary>{(session,onSignedOut)=><JournalApp key={session.uid} session={session} onSignedOut={onSignedOut}/>}</AuthBoundary>;
}
function JournalApp({session,onSignedOut}:{session:AppSession;onSignedOut:()=>void}) {
  const [entries, setEntries] = useState<Entry[]>([]);
  const [personalState, setPersonalState] = useState<{ status: 'loading' | 'ready' | 'error'; message?: string }>({ status: 'loading' });
  const [starterState, setStarterState] = useState<{ status: 'loading' | 'ready' | 'error'; message?: string }>({ status: 'loading' });
  const [starterAttempt, setStarterAttempt] = useState(0);
  const [watchAttempt, setWatchAttempt] = useState(0);
  const [editingEntry, setEditingEntry] = useState<Entry | null>(null);
  const [composingKind, setComposingKind] = useState<Entry['kind']>('Journal');
  const signingOut = useRef(false);
  const [entities, setEntities] = useState<Entity[]>(initialEntities);
  const ordinaryEntries = filterOrdinaryEntries(entries);

  // Active view: 'home' | 'leaves' | 'compose' | 'enclave-writing' | 'vault' | 'inspector' | 'reader'
  const [currentView, setCurrentView] = useState<
    'home' | 'leaves' | 'compose' | 'enclave-writing' | 'vault' | 'inspector' | 'reader' | 'local-private'
  >('home');
  const currentViewRef = useRef(currentView);
  currentViewRef.current = currentView;

  const [activeCategoryTab, setActiveCategoryTab] = useState<string>('All');
  const [selectedEntry, setSelectedEntry] = useState<Entry | null>(null);

  // Protected Mode & Modals
  const [protectedMode, setProtectedMode] = useState<boolean>(false);
  const composeRouteSignature = useMemo(
    () => JSON.stringify([currentView, editingEntry?.id ?? null, composingKind, protectedMode]),
    [currentView, editingEntry?.id, composingKind, protectedMode],
  );
  const composeRouteRef = useRef({ signature: composeRouteSignature, generation: 0 });
  useLayoutEffect(() => {
    if (composeRouteRef.current.signature !== composeRouteSignature) {
      composeRouteRef.current = { signature: composeRouteSignature, generation: composeRouteRef.current.generation + 1 };
    }
  }, [composeRouteSignature]);
  const currentComposeRouteToken = () => `${composeRouteRef.current.generation}:${composeRouteRef.current.signature}`;
  const accountSessionActive = () => !signingOut.current && Date.now() < session.expiresAt;
  const [isProtectedGateOpen, setIsProtectedGateOpen] = useState<boolean>(false);
  const [notice, setNotice] = useState<string>('');

  const [backendError,setBackendError]=useState('');
  const [privateUntil,setPrivateUntil]=useState(0);
  const privateAuthority=useRef({until:0,generation:0});
  const localVault=useRef<LocalVault | null>(null);
  const localMediaVault=useRef<LocalMediaVault | null>(null);
  const privateUnlockAttempt=useRef(0);
  const originalReadRequest=useRef(0);
  const [pendingView,setPendingView]=useState<'vault'|'inspector'|null>(null);
  useEffect(()=>{
    if(!session.resumePrivate || session.privateUntil<=Date.now())return;
    privateAuthority.current={until:session.privateUntil,generation:privateAuthority.current.generation+1};
    const privateSession={ownerId:session.uid,generation:()=>privateAuthority.current.generation,isUnlocked:()=>!signingOut.current && Date.now()<privateAuthority.current.until};
    localVault.current=new LocalVault(privateSession);localMediaVault.current=new LocalMediaVault(privateSession);
    setPrivateUntil(session.privateUntil);setProtectedMode(true);
  },[]);
  useEffect(()=>watchEntries(session.uid,loaded=>{if(signingOut.current)return;setEntries(loaded);setPersonalState({status:'ready'});},e=>{if(signingOut.current)return;setPersonalState({status:'error',message:e.message});}),[session.uid,watchAttempt]);
  useEffect(()=>{
    let current=true;
    setStarterState({status:'loading'});
    ensureStarterEntries(session.uid).then(()=>{if(current)setStarterState({status:'ready'});}).catch(e=>{
      if(current)setStarterState({status:'error',message:e instanceof Error?e.message:'Could not prepare your starter entries.'});
    });
    return()=>{current=false;};
  },[session.uid,starterAttempt]);
  useEffect(()=>{
    const expire=setTimeout(()=>{signingOut.current=true;handleExitProtected();setEntries([]);void logout().catch(()=>{}).finally(onSignedOut);},Math.max(0,session.expiresAt-Date.now()));
    return ()=>clearTimeout(expire);
  },[session.expiresAt]);
  useEffect(()=>{
    if(!privateUntil)return;
    const timer=setTimeout(()=>handleExitProtected(),Math.max(0,privateUntil-Date.now()));
    return ()=>clearTimeout(timer);
  },[privateUntil]);
  useEffect(()=>{
    const stopLifecycle=onAppActiveChange(isActive=>{if(!isActive)handleExitProtected();});
    const stopBack=onAndroidBack(()=>{
      if(privateAuthority.current.until>0)handleExitProtected();
      else if(currentViewRef.current!=='home')setCurrentView('home');
      else exitNativeApp();
    });
    const shortcut=(event:KeyboardEvent)=>{
      if(event.key==='Escape' && privateAuthority.current.until>0){event.preventDefault();handleExitProtected();}
    };
    document.addEventListener('keydown',shortcut,true);
    return()=>{stopLifecycle();stopBack();document.removeEventListener('keydown',shortcut,true);};
  },[]);
  function navigatePrivate(view:'vault'|'inspector') {
    if(protectedMode && Date.now()<privateUntil)setCurrentView(view);
    else {setPendingView(view);setIsProtectedGateOpen(true);}
  }


  // Notice auto-clear
  useEffect(() => {
    if (notice) {
      const timer = setTimeout(() => setNotice(''), 3500);
      return () => clearTimeout(timer);
    }
  }, [notice]);

  const handleSelectEntry = async (entry:Entry) => {
    const request=++originalReadRequest.current;
    const generation=privateAuthority.current.generation;
    setSelectedEntry(entry);setCurrentView('reader');
    if(entry.protected && privateAuthority.current.until>Date.now()) {
      try {const original=await readOriginal(session.uid,entry.id);
        if(request===originalReadRequest.current && generation===privateAuthority.current.generation && Date.now()<privateAuthority.current.until)
          setSelectedEntry({...entry,originalBody:original.originalBody});
      }catch(e){if(request===originalReadRequest.current && generation===privateAuthority.current.generation)
        setBackendError(e instanceof Error?e.message:'Could not open the original.');}
    }
  };
  const handleSaveProtectedEntry = async (data:{title:string;body:string;originalBody:string;kind:'Journal'|'Story'}) => {
    const routeToken = currentComposeRouteToken();
    if (!accountSessionActive()) throw new Error('Account session expired. Sign in again before saving.');
    if(protectedMode && Date.now()>=privateUntil)throw new Error('Private session expired. Unlock again before saving.');
    if(editingEntry) {
      if(editingEntry.protected)throw new Error('Protected entries cannot be edited in this view. Open protected access to work with protected content.');
      await updateEntry(session.uid,editingEntry.id,{title:data.title,body:data.body,kind:data.kind});
    } else if(protectedMode) {
      throw new Error('Save through the encrypted private draft editor.');
    } else {
      await saveEntry(session.uid,{...data,protected:protectedMode,entities});
    }
    if (currentComposeRouteToken() !== routeToken || !accountSessionActive()) return;
    if(editingEntry) {setSelectedEntry(null);setEditingEntry(null);}
    setNotice('Entry saved.');setCurrentView('home');
  };

  const handleDeleteOrdinaryEntry = async (id: string) => {
    const routeToken = currentComposeRouteToken();
    if (!accountSessionActive()) throw new Error('Account session expired. Sign in again before deleting an entry.');
    await deleteEntry(session.uid, id);
    if (currentComposeRouteToken() !== routeToken || !accountSessionActive()) return;
    setSelectedEntry(null);setEditingEntry(null);setCurrentView('home');setNotice('Entry permanently deleted.');
  };

  const handleUpdateAlias = (id: string, newAlias: string) => {
    if(Date.now()>=privateAuthority.current.until)return;
    setEntities((prev) =>
      prev.map((e) => (e.id === id ? { ...e, alias: newAlias } : e))
    );
    setNotice(`Updated representation to "${newAlias}".`);
  };

  const handleProtectedSuccess = async () => {
    const attempt=++privateUnlockAttempt.current;
    const generation=privateAuthority.current.generation;
    const until=await unlockPrivate();
    if(attempt!==privateUnlockAttempt.current || generation!==privateAuthority.current.generation){await lockPrivate();return;}
    privateAuthority.current.until=until;
    const privateSession={
      ownerId:session.uid,
      generation:()=>privateAuthority.current.generation,
      isUnlocked:()=>!signingOut.current && Date.now()<privateAuthority.current.until,
    };
    localVault.current=new LocalVault(privateSession);
    localMediaVault.current=new LocalMediaVault(privateSession);
    setPrivateUntil(until);setProtectedMode(true);setIsProtectedGateOpen(false);
    if(pendingView){setCurrentView(pendingView);setPendingView(null);}
    if(selectedEntry?.protected){
      const request=originalReadRequest.current;
      const generation=privateAuthority.current.generation;
      try {const original=await readOriginal(session.uid,selectedEntry.id);
        if(request===originalReadRequest.current && generation===privateAuthority.current.generation && Date.now()<privateAuthority.current.until)
          setSelectedEntry(current=>current?.id===selectedEntry.id?{...current,originalBody:original.originalBody}:current);
      }catch(e){if(request===originalReadRequest.current && generation===privateAuthority.current.generation)
        setBackendError(e instanceof Error?e.message:'Could not open the original.');}
    }
  };
  function handleExitProtected() {
    privateUnlockAttempt.current++;
    originalReadRequest.current++;
    privateAuthority.current={until:0,generation:privateAuthority.current.generation+1};
    localVault.current=null;
    localMediaVault.current=null;
    setPrivateUntil(0);setProtectedMode(false);setEntities(initialEntities);
    setSelectedEntry(null);setEditingEntry(null);setNotice('');setBackendError('');
    setCurrentView('home');setIsProtectedGateOpen(false);setPendingView(null);
    void lockPrivate().catch(()=>{});
  }
  async function signOutAccount(){
    signingOut.current=true;
    handleExitProtected();
    setEntries([]);
    setPersonalState({status:'ready'});setStarterState({status:'ready'});
    try{await logout();}finally{onSignedOut();}
  }

  return (
    <div className={`lulu-app-root ${currentView === 'vault' ? 'vault-dark-mode' : ''}`}>
      {protectedMode&&<div className="account-actions"><button onClick={handleExitProtected}>Quick exit</button><button onClick={()=>setCurrentView('local-private')}>Private writing</button></div>}
      {backendError&&<div className="backend-error" role="alert"><CircleAlert size={18} aria-hidden="true" /><span><strong>Something needs attention</strong>{backendError}</span><button type="button" onClick={()=>setBackendError('')} aria-label="Dismiss message"><X size={17} aria-hidden="true" /></button></div>}
      {/* Global Status Toast */}
      {notice && (
        <aside className="global-toast-stitch" role="status">
          <span>{notice}</span>
          <button onClick={() => setNotice('')} aria-label="Dismiss">
            ✕
          </button>
        </aside>
      )}

      {/* Main Responsive Application Shell (Edge-to-Edge with clean Max-Width) */}
      <div className="lulu-viewport-shell">
        {(currentView === 'home' || currentView === 'leaves' || currentView === 'reader') && (
          <section className="journal-source-panel" aria-label="Journal status">
            {(personalState.status === 'loading' || starterState.status === 'loading') && <p className="journal-source-status" role="status">Preparing your journal…</p>}
            {personalState.status === 'error' && <p className="journal-source-status is-error" role="alert">Could not load your journal. {personalState.message || 'Check your connection and try again.'} <button type="button" onClick={()=>{setPersonalState({status:'loading'});setWatchAttempt(value=>value+1);}}>Try again</button></p>}
            {starterState.status === 'error' && <p className="journal-source-status is-error" role="alert">Could not prepare your starter entries. {starterState.message || 'Check your connection and try again.'} <button type="button" onClick={()=>setStarterAttempt(value=>value+1)}>Try again</button></p>}
            {personalState.status === 'ready' && starterState.status === 'ready' && ordinaryEntries.length === 0 && <p className="journal-source-status" role="status">Your journal is ready for your first entry.</p>}
          </section>
        )}
        {currentView === 'home' && (
          <JournalHome
            entries={ordinaryEntries}
            activeTab={activeCategoryTab}
            onTabChange={setActiveCategoryTab}
            onNewEntry={() => { setComposingKind(activeCategoryTab === 'Stories' ? 'Story' : 'Journal');setEditingEntry(null);setSelectedEntry(null);setCurrentView('compose'); }}
            onSelectEntry={handleSelectEntry}
            onOpenProtectedGate={() => setIsProtectedGateOpen(true)}
            protectedMode={protectedMode}
            onOpenVault={() => navigatePrivate('vault')}
            onSignOut={() => void signOutAccount()}
          />
        )}

        {currentView === 'leaves' && (
            <StoryLeavesView
              entries={ordinaryEntries}
              onSelectEntry={handleSelectEntry}
              onOpenProtectedGate={() => setIsProtectedGateOpen(true)}
            />
        )}

        {currentView === 'compose' && (
          <TransformProtectView
            key={`compose-${privateAuthority.current.generation}-${editingEntry?.id ?? `new-${composingKind}`}`}
            entities={entities}
            protectedMode={protectedMode && !editingEntry}
            editingEntry={editingEntry ?? undefined}
            initialKind={composingKind}
            onBack={() => setCurrentView('home')}
            onSaveProtected={handleSaveProtectedEntry}
            onDeleteOrdinary={handleDeleteOrdinaryEntry}
            isOrdinarySessionActive={()=>!signingOut.current && Date.now()<session.expiresAt}
            onOpenEntityInspector={() => navigatePrivate('inspector')}
            onEnterPrivate={() => setIsProtectedGateOpen(true)}
            privateVault={localVault.current ?? undefined}
            privateMediaVault={localMediaVault.current ?? undefined}
            onPrivateSaved={() => {
              if(Date.now()>=privateAuthority.current.until)return;
              setNotice('Private record saved in this browser.');setCurrentView('local-private');
            }}
          />
        )}

        {currentView === 'local-private' && protectedMode && localVault.current && (
          <LocalPrivateJournal key={privateAuthority.current.generation} vault={localVault.current} mediaVault={localMediaVault.current ?? undefined}
            onExit={handleExitProtected} onCompose={()=>{setEditingEntry(null);setSelectedEntry(null);setCurrentView('compose');}} />
        )}

        {currentView === 'enclave-writing' && (
          <ProtectedWritingView
            onBack={() => setCurrentView('home')}
            onOpenEntityInspector={() => navigatePrivate('inspector')}
            onDone={() => setCurrentView('home')}
          />
        )}

        {currentView === 'vault' && (
          <PrivateSanctuaryView
            uid={session.uid}
            onQuickExit={handleExitProtected}
            onOpenJournal={() => setCurrentView('home')}
          />
        )}

        {currentView === 'inspector' && (
          <EntityInspectorView
            entities={entities}
            onBack={() => setCurrentView('home')}
            onUpdateAlias={handleUpdateAlias}
            onConfirm={() => {
              setNotice('Representations updated for this session.');
              setCurrentView('home');
            }}
          />
        )}

        {currentView === 'reader' && selectedEntry && (
            <ReaderView
              entry={selectedEntry}
              protectedMode={protectedMode}
              entities={entities}
              onBack={() => {
                originalReadRequest.current++;
                setSelectedEntry(null);
                setCurrentView('home');
              }}
              onEdit={() => {
                if(selectedEntry.protected) {setBackendError('Protected entries cannot be edited in this view. Open protected access to work with protected content.');return;}
                setEditingEntry(selectedEntry);setCurrentView('compose');
              }}
              onEnterProtected={() => setIsProtectedGateOpen(true)}
              onExitProtected={handleExitProtected}
            />
        )}

        {/* Bottom Floating Navigation Dock (Hidden on Reader and Compose) */}
        {currentView !== 'reader' && currentView !== 'compose' && currentView !== 'enclave-writing' && (
          <BottomNav
            currentView={currentView as any}
            onNavigate={(view) => {
              if (view === 'compose') {
                setComposingKind(currentView === 'home' && activeCategoryTab === 'Stories' ? 'Story' : 'Journal');
                setEditingEntry(null);setSelectedEntry(null);
                setCurrentView('compose');
              } else if(view === 'vault' || view === 'inspector') {
                navigatePrivate(view);
              } else {
                setCurrentView(view);
              }
            }}
            protectedMode={protectedMode}
          />
        )}
      </div>

      {/* Biometric Passkey Modal (Screen C) */}
      <ProtectedGateModal
        isOpen={isProtectedGateOpen}
        onClose={() => {
          if(privateAuthority.current.until>0){handleExitProtected();return;}
          privateUnlockAttempt.current++;setIsProtectedGateOpen(false);setPendingView(null);
        }}
        onVerify={handleProtectedSuccess}
      />
    </div>
  );
}
