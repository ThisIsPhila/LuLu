import { Capacitor } from '@capacitor/core';
import { prepareRefreshFeedback, playRefreshFeedback } from './services/refreshFeedback';
import { useNativePullToRefresh } from './hooks/useNativePullToRefresh';
import React, { useState, useEffect, useRef, useMemo, useLayoutEffect, Suspense } from 'react';
import { CircleAlert, X } from 'lucide-react';
import type { Entry } from './domain/journal';
import type { LibraryItem, LibraryItemDraft, LibraryItemKind } from './domain/libraryItems';
import { filterOrdinaryEntries } from './domain/ordinaryBrowse';
import { isPrivateSurface } from './domain/privacy/privateSurface';
import { AuthBoundary } from './components/auth/AuthBoundary';
import { watchEntries, saveEntry, readOriginal, updateEntry, deleteEntry } from './services/backend/journal';
import { watchLibraryItems, createLibraryItem, updateLibraryItem, deleteLibraryItem } from './services/backend/libraryItems';
import { retainFirstOnboardingEntry } from './services/backend/onboardingEntry';
import { ensureStarterEntries } from './services/backend/demoCatalogue';
import { unlockPrivate, lockPrivate, logout, type AppSession } from './services/backend/passkeys';
import type { Entity } from './domain/transform';
import { LocalRepresentationVault } from './services/vault/localRepresentationVault';
import { JournalHome } from './components/JournalHome';
import { TransformProtectView } from './components/TransformProtectView';
import { ProtectedWritingView } from './components/ProtectedWritingView';
import { EntityInspectorView } from './components/EntityInspectorView';
import { ReaderView } from './components/ReaderView';
import { StoryLeavesView } from './components/StoryLeavesView';
import { LibraryView } from './components/LibraryView';
import { PrivateSanctuaryView } from './components/PrivateSanctuaryView';
import { OrdinaryNavigationHeader } from './components/OrdinaryNavigationHeader';
import { ProtectedGateModal } from './components/ProtectedGateModal';
import { LocalPrivateJournal } from './components/LocalPrivateJournal';
import { LocalVault } from './services/vault/localVault';
import type { LocalVaultSession } from './services/vault/localVault';
import { LocalMediaVault } from './services/vault/localMediaVault';
import { onAndroidBack, onAppActiveChange, exitNativeApp } from './platform/appLifecycle';
import { isLocalDevelopment } from './services/localDevelopment';
import { deleteOrdinaryMedia } from './services/ordinaryMedia';
import { readAppPreferences, writeAppPreferences, type AppPreferences } from './services/appPreferences';
import { readDisplayName, writeDisplayName } from './services/displayName';
import { readProfilePhoto, writeProfilePhoto } from './services/profilePhoto';
import { onAuthStateChanged } from 'firebase/auth';
import { auth } from './services/backend/firebase';
import { request } from './services/backend/request';
import { pendingJudgeInvitation, clearJudgeInvitation } from './services/judgeInvite';
import { useEdgeSwipeNavigation } from './hooks/useEdgeSwipeNavigation';
import { usePullToRefresh } from './hooks/usePullToRefresh';
import { ProfileSettingsView } from './components/ProfileSettingsView';
import { PrivacyModelSettings } from './components/PrivacyModelSettings';
import { LooLuGuide, type LooLuDestination } from './components/LooLuGuide';
import { PrivateQuickCapture } from './components/PrivateQuickCapture';
import type { LuQuickAction } from './components/LuOrb';
import './privacy-demo.css';

const PrivacyModelDemo = React.lazy(() => import('./components/PrivacyModelDemo').then(module => ({ default: module.PrivacyModelDemo })));

export default function App() {
  return <AuthBoundary>{(session,onSignedOut)=><JournalApp key={session.uid} session={session} onSignedOut={onSignedOut}/>}</AuthBoundary>;
}
function JournalApp({session,onSignedOut}:{session:AppSession;onSignedOut:()=>void}) {
  const development = isLocalDevelopment(session.uid);
  const [entries, setEntries] = useState<Entry[]>([]);
  const [libraryItems, setLibraryItems] = useState<LibraryItem[]>([]);
  const [libraryLaunch, setLibraryLaunch] = useState<{ section: 'notes' | 'tasks'; kind: LibraryItemKind } | null>(null);
  const [libraryItemsState, setLibraryItemsState] = useState<{ status: 'loading' | 'ready' | 'error'; message?: string }>({ status: 'loading' });
  const [libraryItemsAttempt, setLibraryItemsAttempt] = useState(0);
  const [preferences, setPreferences] = useState<AppPreferences>(readAppPreferences);
  const [displayName, setDisplayName] = useState(() => auth.currentUser?.uid === session.uid ? auth.currentUser.displayName || '' : '');
  const [googlePhoto, setGooglePhoto] = useState('');
  const [customPhoto, setCustomPhoto] = useState('');
  const photoUrl = customPhoto || googlePhoto;
  const displayNameEdited = useRef(false);
  const [personalState, setPersonalState] = useState<{ status: 'loading' | 'ready' | 'error'; message?: string }>({ status: 'loading' });
  const [starterState, setStarterState] = useState<{ status: 'loading' | 'ready' | 'error'; message?: string }>({ status: 'loading' });
  const [starterAttempt, setStarterAttempt] = useState(0);
  const [onboardingImportState, setOnboardingImportState] = useState<{ status: 'loading' | 'ready' | 'error'; message?: string }>({ status: 'loading' });
  const [onboardingImportAttempt, setOnboardingImportAttempt] = useState(0);
  const [watchAttempt, setWatchAttempt] = useState(0);
  const [editingEntry, setEditingEntry] = useState<Entry | null>(null);
  const [composingKind, setComposingKind] = useState<Entry['kind']>('Journal');
  const [looLuDraft, setLooLuDraft] = useState<{ text: string; nonce: string } | null>(null);
  const [quickCapture, setQuickCapture] = useState<Exclude<LuQuickAction, 'private-content'> | null>(null);
  const signingOut = useRef(false);
  const [entities, setEntities] = useState<Entity[]>([]);
  const ordinaryEntries = filterOrdinaryEntries(entries);

  const [currentView, setCurrentView] = useState<
    'home' | 'leaves' | 'stories' | 'library' | 'compose' | 'enclave-writing' | 'vault' | 'inspector' | 'reader' | 'local-private' | 'settings' | 'model-settings' | 'privacy-demo'
  >('home');
  const isOrdinaryNavigationView = currentView === 'home' || currentView === 'leaves' || currentView === 'stories' || currentView === 'library';
  const currentViewRef = useRef(currentView);
  currentViewRef.current = currentView;
  const settingsReturnView = useRef<typeof currentView>('home');
  const openSettings = () => { if (currentViewRef.current !== 'settings') settingsReturnView.current = currentViewRef.current; setCurrentView('settings'); };
  useEdgeSwipeNavigation(currentView, setCurrentView);

  const [activeCategoryTab, setActiveCategoryTab] = useState<string>('All');
  const [selectedEntry, setSelectedEntry] = useState<Entry | null>(null);
  const [readerStorySequence, setReaderStorySequence] = useState<Entry[]>([]);
  const readerReturnView = useRef<'home' | 'leaves' | 'stories' | 'library'>('home');
  const editorReturnView = useRef<'home' | 'leaves' | 'stories' | 'library' | 'reader' | 'local-private'>('home');

  // Protected Mode & Modals
  const [protectedMode, setProtectedMode] = useState<boolean>(false);
  const refreshOrdinary = async () => { setWatchAttempt(value => value + 1); setLibraryItemsAttempt(value => value + 1); };
  useNativePullToRefresh(isOrdinaryNavigationView && !protectedMode, refreshOrdinary);
  const pullRefresh = usePullToRefresh({ enabled: isOrdinaryNavigationView && !protectedMode && !(Capacitor.getPlatform() === 'ios' && Capacitor.isPluginAvailable('NativeRefresh')), onRefreshStart: prepareRefreshFeedback, onThresholdReached: () => { navigator.vibrate?.(20); }, onRefresh: async () => { await refreshOrdinary(); await playRefreshFeedback(); } });
  const [representationsLoading, setRepresentationsLoading] = useState(false);
  const [representationsError, setRepresentationsError] = useState('');
  const [inspectorText, setInspectorText] = useState('');
  const inspectorReturnView = useRef<'home'|'leaves'|'stories'|'library'|'compose'|'enclave-writing'|'vault'|'local-private'|'reader'>('home');
  const localRepresentations = useRef<LocalRepresentationVault | null>(null);
  const representationVersion = useRef(0);
  const representationLoadRequest = useRef(0);
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
  const [judgeAccess, setJudgeAccess] = useState(false);
  const [judgeInviteAttempt, setJudgeInviteAttempt] = useState(0);
  const [showJudgeInvite, setShowJudgeInvite] = useState(() => Boolean(pendingJudgeInvitation()));
  const [judgeInviteAccepted, setJudgeInviteAccepted] = useState(false);
  useEffect(() => {
    if (development) return;
    let active = true;
    const invitation = judgeInviteAccepted ? pendingJudgeInvitation() : '';
    const action = invitation ? request<{judgeAccess:boolean}>('/judge/redeem', {invitation}) : request<{judgeAccess:boolean}>('/judge/access');
    void action.then(result => {
      if (!active || signingOut.current) return;
      setJudgeAccess(result.judgeAccess === true);
      if (invitation && result.judgeAccess) {clearJudgeInvitation();setJudgeInviteAccepted(false);setShowJudgeInvite(false);setNotice('Judge invitation linked to your account. Voice access is not available yet.');}
    }).catch(() => {
      if (active && invitation) setBackendError('Judge access could not be linked yet. Reopen your invitation or try again in Settings.');
    });
    return () => { active = false; };
  }, [session.uid, judgeInviteAttempt, judgeInviteAccepted]);
  useEffect(() => {
    if (session.emailVerificationStatus === 'sent') setNotice('Check your inbox to verify your email address.');
    else if (session.emailVerificationStatus === 'failed') setNotice('Verification email could not be sent. Retry in Settings.');
  }, [session.emailVerificationStatus]);

  useEffect(() => {
    writeAppPreferences(preferences);
    document.documentElement.dataset.luluReduceMotion = String(preferences.reduceMotion);
  }, [preferences]);
  useEffect(() => {
    let active = true;
    void readDisplayName(session.uid).then(name => { if (active && name && !displayNameEdited.current) setDisplayName(name); });
    return () => { active = false; };
  }, [session.uid]);

  useEffect(() => {
    let active = true;
    void readProfilePhoto(session.uid).then(photo => { if (active) setCustomPhoto(photo); });
    const unsubscribe = onAuthStateChanged(auth, user => {
      if (!active || user?.uid !== session.uid) { if (active) setGooglePhoto(''); return; }
      const google = user.providerData.find(provider => provider.providerId === 'google.com');
      const candidate = google?.photoURL || (google ? user.photoURL : '') || '';
      setGooglePhoto(candidate.startsWith('https://') ? candidate : '');
      if (!displayNameEdited.current && user.displayName) setDisplayName(current => current || user.displayName || '');
    });
    return () => { active = false; unsubscribe(); };
  }, [session.uid]);

  const [backendError,setBackendError]=useState('');
  const [privateUntil,setPrivateUntil]=useState(0);
  const [privacySource,setPrivacySource]=useState<{text:string;revision:string}|null>(null);
  const privateAuthority=useRef({until:0,generation:0});
  const privacySession=useMemo<LocalVaultSession|undefined>(()=>protectedMode && privateUntil>Date.now()?{
    ownerId:session.uid,
    generation:()=>privateAuthority.current.generation,
    isUnlocked:()=>!signingOut.current && Date.now()<session.expiresAt && Date.now()<privateAuthority.current.until,
  }:undefined,[protectedMode,privateUntil,session.uid,session.expiresAt]);
  const localVault=useRef<LocalVault | null>(null);
  const localMediaVault=useRef<LocalMediaVault | null>(null);
  const privateUnlockAttempt=useRef(0);
  const originalReadRequest=useRef(0);
  const [pendingView,setPendingView]=useState<'vault'|'inspector'|'private-capture'|'local-private'|null>(null);

  async function loadRepresentations(vault: LocalRepresentationVault) {
    const request = ++representationLoadRequest.current;
    const generation = privateAuthority.current.generation;
    setRepresentationsLoading(true);setRepresentationsError('');
    try {
      const snapshot = await vault.load();
      if (request !== representationLoadRequest.current || vault !== localRepresentations.current ||
          generation !== privateAuthority.current.generation || Date.now() >= privateAuthority.current.until) return;
      representationVersion.current = snapshot.version;
      setEntities(snapshot.entities);
    } catch {
      if (request === representationLoadRequest.current && vault === localRepresentations.current &&
          generation === privateAuthority.current.generation && Date.now() < privateAuthority.current.until) {
        setRepresentationsError('Could not read encrypted representations from this device. They were not changed.');
      }
    } finally {
      if (request === representationLoadRequest.current && vault === localRepresentations.current &&
          generation === privateAuthority.current.generation && Date.now() < privateAuthority.current.until) setRepresentationsLoading(false);
    }
  }

  useEffect(()=>{
    if(!session.resumePrivate || session.privateUntil<=Date.now())return;
    privateAuthority.current={until:session.privateUntil,generation:privateAuthority.current.generation+1};
    const privateSession={ownerId:session.uid,generation:()=>privateAuthority.current.generation,isUnlocked:()=>!signingOut.current && Date.now()<session.expiresAt && Date.now()<privateAuthority.current.until};
    localVault.current=new LocalVault(privateSession);localMediaVault.current=new LocalMediaVault(privateSession);
    const representationsVault=new LocalRepresentationVault(privateSession);
    localRepresentations.current=representationsVault;
    setPrivateUntil(session.privateUntil);setProtectedMode(true);
    void loadRepresentations(representationsVault);
  },[]);
  useEffect(()=>watchEntries(session.uid,loaded=>{if(signingOut.current)return;setEntries(loaded);setPersonalState({status:'ready'});},e=>{if(signingOut.current)return;setPersonalState({status:'error',message:e.message});}),[session.uid,watchAttempt]);
  useEffect(()=>{
    setLibraryItemsState({status:'loading'});
    return watchLibraryItems(session.uid,loaded=>{if(signingOut.current)return;setLibraryItems(loaded);setLibraryItemsState({status:'ready'});},error=>{
      if(signingOut.current)return;setLibraryItemsState({status:'error',message:error.message});
    });
  },[session.uid,libraryItemsAttempt]);
  useEffect(()=>{
    let current=true;
    if(development){setStarterState({status:'ready'});return;}
    setStarterState({status:'loading'});
    ensureStarterEntries(session.uid).then(()=>{if(current)setStarterState({status:'ready'});}).catch(e=>{
      if(current)setStarterState({status:'error',message:e instanceof Error?e.message:'Could not prepare your starter entries.'});
    });
    return()=>{current=false;};
  },[session.uid,starterAttempt]);
  useEffect(()=>{
    let current=true;
    if(development){setOnboardingImportState({status:'ready'});return;}
    setOnboardingImportState({status:'loading'});
    void retainFirstOnboardingEntry(session.uid).then(async()=>{const name=await readDisplayName(session.uid);if(current){if(name && !displayNameEdited.current)setDisplayName(name);setOnboardingImportState({status:'ready'});}})
      .catch(error=>{if(current)setOnboardingImportState({status:'error',message:error instanceof Error?error.message:'Your first entry could not be added to this journal.'});});
    return()=>{current=false;};
  },[session.uid,onboardingImportAttempt]);
  useEffect(()=>{
    const expire=setTimeout(()=>{signingOut.current=true;handleExitProtected();setEntries([]);if(development)onSignedOut();else void logout().catch(()=>{}).finally(onSignedOut);},Math.max(0,session.expiresAt-Date.now()));
    return ()=>clearTimeout(expire);
  },[session.expiresAt]);
  useEffect(()=>{
    if(!privateUntil)return;
    const timer=setTimeout(()=>handleExitProtected(),Math.max(0,privateUntil-Date.now()));
    return ()=>clearTimeout(timer);
  },[privateUntil]);
  useEffect(()=>{
    const stopLifecycle=onAppActiveChange(isActive=>{if(!isActive && privateAuthority.current.until>0)handleExitProtected();});
    const stopBack=onAndroidBack(()=>{
      if(privateAuthority.current.until>0)handleExitProtected();
      else if(currentViewRef.current==='compose') document.querySelector<HTMLButtonElement>('.transform-header button[aria-label="Go back"]')?.click();
      else if(currentViewRef.current!=='home')setCurrentView('home');
      else exitNativeApp();
    });
    const shortcut=(event:KeyboardEvent)=>{
      if(event.key==='Escape' && privateAuthority.current.until>0){event.preventDefault();handleExitProtected();}
    };
    document.addEventListener('keydown',shortcut,true);
    return()=>{stopLifecycle();stopBack();document.removeEventListener('keydown',shortcut,true);};
  },[]);
  function navigatePrivate(view:'vault'|'inspector', currentText = '') {
    if(view==='inspector') {
      inspectorReturnView.current = currentView === 'home' || currentView === 'leaves' || currentView === 'stories' || currentView === 'library' || currentView === 'compose'
        || currentView === 'enclave-writing' || currentView === 'vault' || currentView === 'local-private' || currentView === 'reader'
        ? currentView : 'home';
      setInspectorText(currentText);
    }
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

  const handleSelectEntry = async (entry:Entry, narrativeSequence?:Entry[]) => {
    const sourceView = currentViewRef.current;
    if (sourceView === 'home' || sourceView === 'leaves' || sourceView === 'stories' || sourceView === 'library') {
      readerReturnView.current = sourceView;
    }
    const request=++originalReadRequest.current;
    const generation=privateAuthority.current.generation;
    setReaderStorySequence(entry.kind === 'Story' && narrativeSequence ? [...narrativeSequence] : []);
    setSelectedEntry(entry);setCurrentView('reader');
    if(entry.protected && privateAuthority.current.until>Date.now()) {
      try {const original=await readOriginal(session.uid,entry.id);
        if(request===originalReadRequest.current && generation===privateAuthority.current.generation && Date.now()<privateAuthority.current.until)
          setSelectedEntry({...entry,originalBody:original.originalBody});
      }catch(e){if(request===originalReadRequest.current && generation===privateAuthority.current.generation)
        setBackendError(e instanceof Error?e.message:'Could not open the original.');}
    }
  };
  const handleSaveProtectedEntry = async (data:{entryId:string;title:string;body:string;originalBody:string;kind:'Journal'|'Story';curatedDeck:string;favorite:boolean;tags:string[]}) => {
    const routeToken = currentComposeRouteToken();
    if (!accountSessionActive()) throw new Error('Account session expired. Sign in again before saving.');
    if(protectedMode && Date.now()>=privateUntil)throw new Error('Private session expired. Unlock again before saving.');
    if(editingEntry) {
      if(editingEntry.protected)throw new Error('Protected entries cannot be edited in this view. Open protected access to work with protected content.');
      await updateEntry(session.uid,editingEntry.id,{title:data.title,body:data.body,kind:data.kind,curatedDeck:data.curatedDeck,favorite:data.favorite,tags:data.tags});
    } else if(protectedMode) {
      throw new Error('Save through the encrypted private draft editor.');
    } else {
      await saveEntry(session.uid,{...data,protected:protectedMode,entities});
    }
    if (currentComposeRouteToken() !== routeToken || !accountSessionActive()) return;
    if(editingEntry) {
      setSelectedEntry(current => current?.id === editingEntry.id
        ? { ...current, title: data.title, body: data.body, kind: data.kind, curatedDeck:data.kind==='Story'&&data.curatedDeck?data.curatedDeck:undefined, favorite:data.favorite, tags:data.tags }
        : current);
      setEditingEntry(null);
    }
    setLooLuDraft(null);
    setNotice('Entry saved.');setCurrentView(editorReturnView.current);
  };

  async function handleCreateLibraryItem(kind: LibraryItemKind, draft: LibraryItemDraft) {
    if (!accountSessionActive()) throw new Error('Account session expired. Sign in again before saving.');
    await createLibraryItem(session.uid, kind, draft);
  }
  async function handleUpdateLibraryItem(id: string, draft: LibraryItemDraft, completed?: boolean) {
    if (!accountSessionActive()) throw new Error('Account session expired. Sign in again before saving.');
    await updateLibraryItem(session.uid, id, draft, completed);
  }
  async function handleDeleteLibraryItem(id: string) {
    if (!accountSessionActive()) throw new Error('Account session expired. Sign in again before deleting.');
    await deleteLibraryItem(session.uid, id);
  }

  const guideMayLeave = (view: string) => ['home', 'leaves', 'stories', 'library', 'reader', 'settings', 'model-settings'].includes(view);

  function handleLooLuNavigate(destination: LooLuDestination) {
    if (!guideMayLeave(currentViewRef.current)) return;
    if (currentViewRef.current === 'privacy-demo') setPrivacySource(null);
    if (destination === 'home') setCurrentView('home');
    else if (destination === 'journal') setCurrentView('leaves');
    else if (destination === 'stories') setCurrentView('stories');
    else if (destination === 'library') setCurrentView('library');
    else if (destination === 'reader') {
      const entry = ordinaryEntries[0];
      if (entry) void handleSelectEntry(entry);
    } else if (destination === 'write') {
      const source = currentViewRef.current;
      editorReturnView.current = source === 'home' || source === 'leaves' || source === 'stories' || source === 'library' ? source : 'home';
      setLooLuDraft(null); setComposingKind('Journal'); setEditingEntry(null); setSelectedEntry(null); setCurrentView('compose');
    } else if (destination === 'settings') openSettings();
    else if (destination === 'privacy-settings') setCurrentView('model-settings');
    else if (destination === 'private-writing' && protectedMode && Date.now() < privateUntil) setCurrentView('local-private');
    else if (destination === 'support') navigatePrivate('vault');
  }

  function handleLooLuStartDraft(text: string, kind: 'Journal' | 'Story' = 'Journal') {
    if (protectedMode || !guideMayLeave(currentViewRef.current) || !text.trim()) return;
    const source = currentViewRef.current;
    editorReturnView.current = source === 'home' || source === 'leaves' || source === 'stories' || source === 'library' ? source : 'home';
    const nonce = globalThis.crypto?.randomUUID?.() ?? `${Date.now()}-${Math.random().toString(16).slice(2)}`;
    setComposingKind(kind); setEditingEntry(null); setSelectedEntry(null);
    setLooLuDraft({ text, nonce }); setCurrentView('compose');
  }

  function handleOrdinaryNavigate(view: 'home' | 'leaves' | 'stories' | 'library' | 'compose') {
    if (privateAuthority.current.until > 0) handleExitProtected();
    if (currentViewRef.current === 'inspector') setInspectorText('');
    if (view === 'compose') {
      const source = currentViewRef.current;
      editorReturnView.current = source === 'home' || source === 'leaves' || source === 'stories' || source === 'library' ? source : 'home';
      setComposingKind(source === 'stories' || (source === 'home' && activeCategoryTab === 'Stories') ? 'Story' : 'Journal');
      setEditingEntry(null); setSelectedEntry(null); setCurrentView('compose');
    } else setCurrentView(view);
  }

  async function handleConfirmRepresentations(next: Entity[]) {
    const vault = localRepresentations.current;
    const generation = privateAuthority.current.generation;
    if (!vault || !protectedMode || Date.now() >= privateAuthority.current.until) throw new Error('Unlock the private session before saving representations.');
    const saved = await vault.save(next, representationVersion.current);
    if (vault !== localRepresentations.current || generation !== privateAuthority.current.generation ||
        !protectedMode || Date.now() >= privateAuthority.current.until) throw new Error('The private session ended before the save was confirmed.');
    representationVersion.current = saved.version;
    setEntities(saved.entities);
    setRepresentationsError('');
    if (currentViewRef.current === 'inspector') {
      setInspectorText('');
      setNotice('Private representations saved encrypted on this device.');
      setCurrentView(inspectorReturnView.current);
    }
  }

  const handleDeleteOrdinaryEntry = async (id: string) => {
    const routeToken = currentComposeRouteToken();
    if (!accountSessionActive()) throw new Error('Account session expired. Sign in again before deleting an entry.');
    await deleteEntry(session.uid, id);
    await deleteOrdinaryMedia(session.uid,id).catch(()=>{});
    if (currentComposeRouteToken() !== routeToken || !accountSessionActive()) return;
    const returnView = editorReturnView.current === 'reader' ? readerReturnView.current : editorReturnView.current;
    setSelectedEntry(null);setEditingEntry(null);setCurrentView(returnView);setNotice('Entry permanently deleted.');
  };

  const handleProtectedSuccess = async () => {
    const attempt=++privateUnlockAttempt.current;
    const generation=privateAuthority.current.generation;
    const until=development ? Date.now()+15*60_000 : await unlockPrivate();
    if(attempt!==privateUnlockAttempt.current || generation!==privateAuthority.current.generation){if(!development)await lockPrivate();return;}
    privateAuthority.current.until=until;
    const privateSession={
      ownerId:session.uid,
      generation:()=>privateAuthority.current.generation,
      isUnlocked:()=>!signingOut.current && Date.now()<session.expiresAt && Date.now()<privateAuthority.current.until,
    };
    localVault.current=new LocalVault(privateSession);
    localMediaVault.current=new LocalMediaVault(privateSession);
    const representationsVault=new LocalRepresentationVault(privateSession);
    localRepresentations.current=representationsVault;
    void loadRepresentations(representationsVault);
    setPrivateUntil(until);setProtectedMode(true);setIsProtectedGateOpen(false);
    if(pendingView){
      if(pendingView==='private-capture') {
        editorReturnView.current='local-private';setEditingEntry(null);setSelectedEntry(null);setCurrentView('compose');
      } else setCurrentView(pendingView);
      setPendingView(null);
    }
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
    representationLoadRequest.current++;
    privateAuthority.current={until:0,generation:privateAuthority.current.generation+1};
    localVault.current=null;
    localMediaVault.current=null;
    localRepresentations.current=null;representationVersion.current=0;
    setRepresentationsLoading(false);setRepresentationsError('');setInspectorText('');
    setPrivateUntil(0);setProtectedMode(false);setEntities([]);
    setPrivacySource(null);
    setSelectedEntry(null);setEditingEntry(null);setNotice('');setBackendError('');
    setCurrentView('home');setIsProtectedGateOpen(false);setPendingView(null);
    if(!development)void lockPrivate().catch(()=>{});
  }
  async function signOutAccount(){
    signingOut.current=true;
    setQuickCapture(null);
    handleExitProtected();
    setEntries([]);
    setPersonalState({status:'ready'});setStarterState({status:'ready'});
    try{if(!development)await logout();}finally{onSignedOut();}
  }

  // Ordinary journal and reader screens must not reveal that a private session
  // exists. Private surfaces retain the immediate exit control.
  const privateSurface = isPrivateSurface(currentView, {
    editingOrdinaryEntry: Boolean(editingEntry), hasPrivatePreview: Boolean(privacySource),
    readingProtectedEntry: Boolean(selectedEntry?.protected),
  });

  return (
    <div className={`lulu-app-root ${currentView === 'vault' ? 'vault-dark-mode' : ''} ${currentView === 'settings' || currentView === 'model-settings' || currentView === 'privacy-demo' ? 'privacy-wide' : ''}`}>
      {showJudgeInvite && <section className="judge-invite-overlay" role="dialog" aria-modal="true" aria-labelledby="judge-invite-title">
        <div className="judge-invite-card"><h2 id="judge-invite-title">Judge invitation</h2>
        <p>This shared link is for judges. Sign in or create your own account to link judge access.</p>
        <p>Decisions are unlimited. Voice is not available yet; the trial plan is five active minutes, with another refill after 24 hours. An idle pause and usage tracking still need to be implemented.</p>
        <button type="button" onClick={() => setShowJudgeInvite(false)}>Not now</button>{' '}
        <button type="button" onClick={() => setJudgeInviteAccepted(true)}>Link invitation</button></div>
      </section>}
      {protectedMode && privateSurface && <div className="account-actions"><button type="button" onClick={handleExitProtected}>Quick exit</button></div>}
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
      <div ref={pullRefresh.containerRef} className={`lulu-viewport-shell ${isOrdinaryNavigationView ? 'ordinary-navigation-shell' : ''}`} data-ordinary-route={isOrdinaryNavigationView ? currentView : undefined}>
        {pullRefresh.state !== 'idle' && <div className="pull-refresh-indicator" role="status" style={{ marginTop: Math.max(0, Math.min(pullRefresh.pullDistance,128)-30) }}><span className={`pull-refresh-icon${pullRefresh.isRefreshing ? ' is-refreshing' : ''}`} style={{'--pull-progress': `${Math.min(pullRefresh.pullDistance/80,1)*360}deg`} as React.CSSProperties}><span>{pullRefresh.isRefreshing ? '↻' : <span style={{display:'inline-block',transform:`rotate(${Math.min(pullRefresh.pullDistance/80,1)*180}deg)`}}>↓</span>}</span></span>{pullRefresh.state === 'refreshing' ? 'Refreshing…' : pullRefresh.state === 'ready' ? 'Release to refresh' : 'Pull to refresh'}</div>}
        {(currentView === 'home' || currentView === 'leaves' || currentView === 'stories' || currentView === 'library' || currentView === 'reader') && (personalState.status !== 'ready' || starterState.status !== 'ready' || onboardingImportState.status !== 'ready') && (
          <section className="journal-source-panel" aria-label="Journal status">
            {(personalState.status === 'loading' || starterState.status === 'loading' || onboardingImportState.status === 'loading') && <p className="journal-source-status" role="status">Preparing your journal…</p>}
            {personalState.status === 'error' && <p className="journal-source-status is-error" role="alert">Could not load your journal. {personalState.message || 'Check your connection and try again.'} <button type="button" onClick={()=>{setPersonalState({status:'loading'});setWatchAttempt(value=>value+1);}}>Try again</button></p>}
            {starterState.status === 'error' && <p className="journal-source-status is-error" role="alert">Could not prepare your starter entries. {starterState.message || 'Check your connection and try again.'} <button type="button" onClick={()=>setStarterAttempt(value=>value+1)}>Try again</button></p>}
            {onboardingImportState.status === 'error' && <p className="journal-source-status is-error" role="alert">Your onboarding details are still on this device. {onboardingImportState.message || 'Setup could not be finished yet.'} <button type="button" onClick={()=>setOnboardingImportAttempt(value=>value+1)}>Try again</button></p>}
          </section>
        )}
        {currentView === 'home' && (
          <JournalHome
            notificationUid={development ? undefined : session.uid}
            photoUrl={photoUrl}
            entries={ordinaryEntries}
            displayName={displayName}
            activeTab={activeCategoryTab}
            onTabChange={setActiveCategoryTab}
            onNewEntry={() => { editorReturnView.current='home';setComposingKind(activeCategoryTab === 'Stories' ? 'Story' : 'Journal');setEditingEntry(null);setSelectedEntry(null);setCurrentView('compose'); }}
            onQuickCreateLibraryItem={kind => {
              setLibraryLaunch({ section: kind === 'note' ? 'notes' : 'tasks', kind });
              setCurrentView('library');
            }}
            onSelectEntry={handleSelectEntry}
            onOpenProtectedGate={() => setIsProtectedGateOpen(true)}
            protectedMode={protectedMode}
            onOpenVault={() => navigatePrivate('vault')}
            onSignOut={() => void signOutAccount()}
            onOpenSettings={openSettings}
            onNavigate={handleOrdinaryNavigate}
          />
        )}

        {isOrdinaryNavigationView && currentView !== 'home' && (
          <OrdinaryNavigationHeader
            notificationUid={development ? undefined : session.uid}
            photoUrl={photoUrl}
            currentView={currentView}
            onNavigate={handleOrdinaryNavigate}
            protectedMode={protectedMode}
            onOpenVault={() => navigatePrivate('vault')}
            onOpenSettings={openSettings}
            onSignOut={() => void signOutAccount()}
            onSearch={() => {
              const search = document.querySelector<HTMLInputElement>('[data-ordinary-page-search]');
              search?.focus({ preventScroll: true });
              search?.scrollIntoView({ block: 'nearest' });
            }}
          />
        )}

        {currentView === 'settings' && (
          <ProfileSettingsView preferences={preferences} displayName={displayName} onDisplayNameChange={async name => {await writeDisplayName(session.uid, name);displayNameEdited.current=true;setDisplayName(name);}} photoUrl={photoUrl} onPhotoSave={async photo => {await writeProfilePhoto(session.uid, photo);setCustomPhoto(photo);}} uid={session.uid} authMethod={session.authMethod} emailVerificationStatus={session.emailVerificationStatus} isPrivateSessionActive={() => !signingOut.current && Date.now() < privateAuthority.current.until} judgeAccess={judgeAccess} judgeInvitePending={Boolean(pendingJudgeInvitation())} onRetryJudgeInvite={() => {setShowJudgeInvite(true);setJudgeInviteAttempt(value => value + 1);}} onPreferencesChange={setPreferences}
            onBack={() => setCurrentView(settingsReturnView.current)} onOpenModelSettings={() => setCurrentView('model-settings')}
            onSignOut={() => void signOutAccount()} />
        )}

        {currentView === 'model-settings' && (
          <PrivacyModelSettings onBack={() => setCurrentView('settings')} onOpenDemo={() => {setPrivacySource(null);setCurrentView('privacy-demo');}} />
        )}

        {currentView === 'privacy-demo' && (
          <Suspense fallback={<main className="privacy-demo-page"><p role="status">Loading the local model runtime…</p></main>}>
            <PrivacyModelDemo key={privacySource?.revision ?? 'ordinary-model-review'}
              onBack={() => {setCurrentView(privacySource?'local-private':'model-settings');setPrivacySource(null);}}
              entries={privacySource?[]:ordinaryEntries} initialText={privacySource?.text} initialRevision={privacySource?.revision}
              privateSession={privacySession} onUnlockPrivate={handleProtectedSuccess} />
          </Suspense>
        )}

        {(currentView === 'leaves' || currentView === 'stories') && (
            <StoryLeavesView key={currentView}
              pageTitle={currentView === 'leaves' ? 'Journal' : 'Stories'}
              initialFilter={currentView === 'leaves' ? 'Journal' : 'Stories'}
              entries={ordinaryEntries}
              onSelectEntry={handleSelectEntry}
            />
        )}

        {currentView === 'library' && <LibraryView entries={ordinaryEntries} items={libraryItems} itemsLoading={libraryItemsState.status === 'loading'} itemsError={libraryItemsState.status === 'error' ? libraryItemsState.message : undefined}
          onRetryItems={()=>setLibraryItemsAttempt(value=>value+1)} onCreateItem={handleCreateLibraryItem} onUpdateItem={handleUpdateLibraryItem} onDeleteItem={handleDeleteLibraryItem}
          onSelectEntry={handleSelectEntry} initialSection={libraryLaunch?.section ?? 'entries'} initialCreateKind={libraryLaunch?.kind}
          onInitialIntentConsumed={() => setLibraryLaunch(null)} />}

        {(currentView === 'compose' || (currentView === 'inspector' && protectedMode && inspectorReturnView.current === 'compose')) && (
          <div style={currentView === 'inspector' ? {display:'none'} : undefined}>
          <TransformProtectView
            key={`compose-${privateAuthority.current.generation}-${editingEntry?.id ?? `new-${composingKind}-${looLuDraft?.nonce ?? ''}`}`}
            entities={entities}
            ownerId={session.uid}
            protectedMode={protectedMode && !editingEntry}
            editingEntry={editingEntry ?? undefined}
            initialKind={composingKind}
            initialDraft={!protectedMode ? looLuDraft?.text : undefined}
            onBack={() => {setLooLuDraft(null);setCurrentView(editorReturnView.current);}}
            onSaveProtected={handleSaveProtectedEntry}
            onDeleteOrdinary={handleDeleteOrdinaryEntry}
            isOrdinarySessionActive={()=>!signingOut.current && Date.now()<session.expiresAt}
            onOpenEntityInspector={(text) => navigatePrivate('inspector', text ?? '')}
            privateVault={localVault.current ?? undefined}
            privateMediaVault={localMediaVault.current ?? undefined}
            onPrivateSaved={() => {
              if(Date.now()>=privateAuthority.current.until)return;
              setNotice('Private record saved in this browser.');setCurrentView('local-private');
            }}
          />
          </div>
        )}

        {currentView === 'local-private' && protectedMode && localVault.current && (
          <LocalPrivateJournal key={privateAuthority.current.generation} vault={localVault.current} mediaVault={localMediaVault.current ?? undefined}
            onInspectText={(text,revision)=>{
              localVault.current?.assertUnlocked();
              if(!privacySession?.isUnlocked())return;
              setPrivacySource({text,revision});setCurrentView('privacy-demo');
            }}
            onExit={handleExitProtected} onCompose={()=>{editorReturnView.current='local-private';setEditingEntry(null);setSelectedEntry(null);setCurrentView('compose');}} />
        )}

        {currentView === 'enclave-writing' && (
          <ProtectedWritingView
            onBack={() => { if (protectedMode) handleExitProtected(); else setCurrentView('home'); }}
            onOpenEntityInspector={() => navigatePrivate('inspector')}
            onDone={() => { if (protectedMode) handleExitProtected(); else setCurrentView('home'); }}
          />
        )}

        {currentView === 'vault' && (
          <PrivateSanctuaryView
            uid={session.uid}
            onQuickExit={handleExitProtected}
          />
        )}

        {currentView === 'inspector' && (
          <EntityInspectorView
            entities={entities}
            referenceText={inspectorText}
            loading={representationsLoading}
            loadError={representationsError}
            onBack={() => {
              if(Date.now()<privateAuthority.current.until) {setInspectorText('');setCurrentView(inspectorReturnView.current);}
              else handleExitProtected();
            }}
            onConfirm={handleConfirmRepresentations}
          />
        )}

        {currentView === 'reader' && selectedEntry && (
            <ReaderView
              entry={selectedEntry}
              mediaOwnerId={session.uid}
              protectedMode={protectedMode}
              onBack={() => {
                originalReadRequest.current++;
                if (selectedEntry.protected && privateAuthority.current.until > 0) handleExitProtected();
                setSelectedEntry(null);setReaderStorySequence([]);
                setCurrentView(readerReturnView.current);
              }}
              onEdit={() => {
                if(selectedEntry.protected) {setBackendError('Protected entries cannot be edited in this view. Open protected access to work with protected content.');return;}
                editorReturnView.current='reader';
                setEditingEntry(selectedEntry);setCurrentView('compose');
              }}
              onEnterProtected={() => setIsProtectedGateOpen(true)}
              storySequence={readerStorySequence}
              onSelectStorySequenceEntry={entry => {
                originalReadRequest.current++;
                setSelectedEntry(entry);
              }}
            />
        )}


      </div>

      <LooLuGuide
        dockEnabled={isOrdinaryNavigationView}
        entries={ordinaryEntries}
        onSelectEntry={handleSelectEntry}
        onDockNavigate={handleOrdinaryNavigate}
        currentView={currentView === 'leaves' ? 'journal' : currentView === 'compose' ? 'write' : currentView === 'model-settings' ? 'privacy-settings' : currentView === 'local-private' ? 'private-writing' : currentView}
        privateAvailable={protectedMode && privateSurface && Date.now() < privateUntil}
        canLeaveCurrentView={guideMayLeave(currentView)}
        canStartDraft={!protectedMode && guideMayLeave(currentView)}
        captureBlockReason={protectedMode ? 'Finish or leave this screen before starting another draft.' : !guideMayLeave(currentView) ? 'Finish or leave this screen before starting another draft.' : ''}
        hasEntries={ordinaryEntries.length > 0}
        onNavigate={handleLooLuNavigate}
        onStartDraft={handleLooLuStartDraft}
        onQuickAction={action => {
          if (action !== 'private-content') {setQuickCapture(action);return;}
          if (!guideMayLeave(currentViewRef.current) && !window.confirm('Opening private content leaves this screen. Unsaved changes may be lost. Continue?')) return;
          if (protectedMode && Date.now() < privateUntil) setCurrentView('local-private');
          else {setPendingView('local-private');setIsProtectedGateOpen(true);}
        }}
      />
      {quickCapture && accountSessionActive() && <PrivateQuickCapture key={quickCapture} mode={quickCapture} uid={session.uid} isAccountActive={accountSessionActive} onClose={()=>setQuickCapture(null)} />}

      {/* Biometric Passkey Modal (Screen C) */}
      <ProtectedGateModal
        isOpen={isProtectedGateOpen}
        onClose={() => {
          if(privateAuthority.current.until>0){handleExitProtected();return;}
          privateUnlockAttempt.current++;setIsProtectedGateOpen(false);setPendingView(null);setInspectorText('');
        }}
        onVerify={handleProtectedSuccess}
      />
    </div>
  );
}
