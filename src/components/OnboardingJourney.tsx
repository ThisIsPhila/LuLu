import { useRef, useState } from 'react';
import {
  ArrowLeft, ArrowRight, BookOpen, Check, ChevronRight, CircleAlert,
  Heart, Image, Info, Leaf, LockKeyhole, Mic, Pencil, ShieldCheck,
  Sparkles, Users,
} from 'lucide-react';
import { OnboardingCaptureDemo } from './OnboardingCaptureDemo';
import './OnboardingJourney.css';

export type OnboardingJourneyScreen = 1 | 2 | 3 | 4 | 5 | 6 | 7 | 8 | 9 | 10 | 11 | 12 | 13 | 14 | 'sign-in';

export type OnboardingJourneyState = {
  name: string;
  intentions: string[];
  prompt: string | null;
  firstEntryText: string;
  supportChoice: string | null;
};

export type JourneyActionResult =
  | { status: 'success' }
  | { status: 'cancelled' }
  | { status: 'error'; message?: string; actionUrl?: string; actionLabel?: string };

type JourneyFeedback = { type: 'error' | 'cancelled' | 'saved'; message: string; actionUrl?: string; actionLabel?: string };

export type OnboardingJourneyProps = {
  initialScreen?: OnboardingJourneyScreen;
  initialState?: Partial<OnboardingJourneyState>;
  /** Called whenever the user changes an onboarding answer. The host owns persistence. */
  onboardingStateChange?: (state: OnboardingJourneyState) => void;
  /** Called whenever the visible journey screen changes. */
  onNavigate?: (screen: OnboardingJourneyScreen) => void;
  /** Must resolve only after the host has durably saved the entry. */
  onSaveFirstEntry: (entry: { text: string; prompt: string | null }) => Promise<JourneyActionResult>;
  /** Screen 14 is the only screen that starts real private-access enrollment. */
  onCreatePrivateSpace: (state: OnboardingJourneyState) => Promise<JourneyActionResult>;
  /** Direct route for a returning user; no onboarding demo is run first. */
  onSignIn: () => void;
};

const blankState: OnboardingJourneyState = {
  name: '', intentions: [], prompt: null, firstEntryText: '', supportChoice: null,
};

const intentions = [
  { title: 'Write privately', detail: 'A separate place for personal thoughts', icon: Pencil, tone: 'sage' },
  { title: 'Capture thoughts', detail: 'Reflect on your day and feelings', icon: Leaf, tone: 'sand' },
  { title: 'Understand my options', detail: 'Gain clarity with thoughtful guidance', icon: Sparkles, tone: 'sage' },
  { title: 'Find support', detail: 'Feel less alone on your journey', icon: Heart, tone: 'sand' },
  { title: 'Save important moments', detail: 'Keep track of what matters to you', icon: Image, tone: 'sage' },
];

const demoEntry = 'I have to ask permission before using money for everyday things.';
const firstEntrySample = 'The morning was quieter than usual. I noticed the light through the leaves, took my time with breakfast, and felt clearer about what mattered to me today.';

export function OnboardingJourney({
  initialScreen = 1,
  initialState,
  onboardingStateChange,
  onNavigate,
  onSaveFirstEntry,
  onCreatePrivateSpace,
  onSignIn,
}: OnboardingJourneyProps) {
  const [screen, setScreen] = useState<OnboardingJourneyScreen>(initialScreen);
  const contentRef = useRef<HTMLElement | null>(null);
  const [state, setState] = useState<OnboardingJourneyState>({ ...blankState, ...initialState, firstEntryText: initialState?.firstEntryText ?? (initialScreen === 6 ? firstEntrySample : '') });
  const [busy, setBusy] = useState<'save' | 'enroll' | null>(null);
  const [feedback, setFeedback] = useState<JourneyFeedback | null>(null);
  const [demoVerified, setDemoVerified] = useState(false);
  const [demoExited, setDemoExited] = useState(false);
  const [scrubbedVariant, setScrubbedVariant] = useState(false);

  function update(patch: Partial<OnboardingJourneyState>) {
    const next = { ...state, ...patch };
    setState(next);
    onboardingStateChange?.(next);
    setFeedback(null);
  }

  function go(to: OnboardingJourneyScreen, keepFeedback = false) {
    if (!keepFeedback) setFeedback(null);
    if (contentRef.current) contentRef.current.scrollTop = 0;
    if (to === 6 && !state.firstEntryText.trim()) {
      update({ firstEntryText: firstEntrySample });
    }
    setScreen(to);
    onNavigate?.(to);
  }

  function next() {
    if (typeof screen === 'number' && screen < 14) go((screen + 1) as OnboardingJourneyScreen);
  }

  function back() {
    if (typeof screen === 'number' && screen > 1) go((screen - 1) as OnboardingJourneyScreen);
    else if (screen === 'sign-in') go(1);
  }

  async function saveEntry() {
    if (busy) return;
    setBusy('save'); setFeedback(null);
    try {
      const result = await onSaveFirstEntry({ text: state.firstEntryText, prompt: state.prompt });
      if (result.status === 'success') { setFeedback({ type: 'saved', message: 'Saved on this device.' }); go(7, true); }
      else if (result.status === 'cancelled') setFeedback({ type: 'cancelled', message: 'Save cancelled. Your writing is still here; you can try again or skip this step.' });
      else setFeedback({ type: 'error', message: result.message?.trim() || 'Your entry wasn’t saved. Please try again, or skip this step.' });
    } catch { setFeedback({ type: 'error', message: 'Your entry wasn’t saved. Please try again, or skip this step.' }); }
    finally { setBusy(null); }
  }

  async function enroll() {
    if (busy) return;
    setBusy('enroll'); setFeedback(null);
    try {
      const result = await onCreatePrivateSpace(state);
      if (result.status === 'success') setFeedback({ type: 'saved', message: 'Access setup complete. Opening your LuLu space…' });
      else if (result.status === 'cancelled') setFeedback({ type: 'cancelled', message: 'Passkey setup was cancelled. Your onboarding answers are still here; you can try again or leave this screen.' });
      else setFeedback({ type: 'error', message: result.message?.trim() || 'We couldn’t finish setting up access. Please try again.', actionUrl: result.actionUrl, actionLabel: result.actionLabel });
    } catch { setFeedback({ type: 'error', message: 'We couldn’t finish setting up access. Please try again.' }); }
    finally { setBusy(null); }
  }

  const isDark = screen === 4 || screen === 8 || screen === 12 || screen === 14;
  const isWelcome = screen === 1;
  const progressScreen = typeof screen === 'number' ? screen : 14;

  return (
    <main className={`onboarding-journey ${isDark ? 'oj-dark' : ''} ${isWelcome ? 'oj-welcome' : ''} oj-screen-${screen}`}>
      <div className="oj-shell">
        <header className="oj-header">
          <img className="oj-logo" src={isDark || isWelcome ? '/media/brand/lulu-wordmark-white.png' : '/media/brand/lulu-wordmark-black.png'} alt="LuLu" />
          {typeof screen === 'number' && screen > 1 && screen < 14 ? <button className="oj-header-side oj-skip" type="button" onClick={next} disabled={busy !== null}>Skip</button> : <span className="oj-header-side" />}
        </header>
        <Progress screen={progressScreen} />
        {isWelcome ? <Welcome /> : (
          <div className="oj-main">
            <section ref={contentRef} className="oj-content" aria-live="polite">
              {screen === 2 && <PersonaliseScreen name={state.name} onName={name => update({ name })} />}
              {screen === 3 && <IntentionsScreen selected={state.intentions} onToggle={title => update({ intentions: state.intentions.includes(title) ? state.intentions.filter(item => item !== title) : [...state.intentions, title] })} />}
              {screen === 4 && <PersonalWelcome name={state.name} />}
              {screen === 5 && <PromptSelection selected={state.prompt} onSelect={prompt => update({ prompt })} />}
              {screen === 6 && <FirstEntryScreen state={state} onText={firstEntryText => update({ firstEntryText })} busy={busy === 'save'} />}
              {screen === 7 && <PrivateIntro />}
              {screen === 8 && <PrivateAccessDemo verified={demoVerified} onVerify={() => setDemoVerified(true)} />}
              {screen === 9 && <ScrubAndExitDemo variant={scrubbedVariant} onNextExample={() => setScrubbedVariant(value => !value)} />}
              {screen === 10 && <QuickExitDemo exited={demoExited} onExit={() => setDemoExited(value => !value)} />}
              {screen === 11 && <OnboardingCaptureDemo />}
              {screen === 12 && <UnderstandingDemo />}
              {screen === 13 && <ReflectionSupport selected={state.supportChoice} onSelect={supportChoice => update({ supportChoice })} />}
              {screen === 14 && <SecureAccess />}
              {screen === 'sign-in' && <SignInRoute onSignIn={onSignIn} />}
              {feedback && screen !== 6 && screen !== 14 && <Feedback feedback={feedback} />}
            </section>
          </div>
        )}
        <footer className={`oj-footer ${isWelcome ? 'oj-footer-welcome' : ''}`}>
          {!isWelcome && <button className="oj-footer-back" type="button" onClick={back} aria-label="Go back" disabled={busy !== null}><ArrowLeft size={19} /></button>}
          {(screen === 6 || screen === 14) && feedback && <Feedback feedback={feedback} />}
          {isWelcome ? <>
            <button className="oj-primary" type="button" onClick={next}>Continue <ArrowRight size={18} /></button>
            <button className="oj-text-action" type="button" onClick={onSignIn}>I already have an account</button>
          </> : screen === 6 ? <>
            <button className="oj-primary" type="button" onClick={() => void saveEntry()} disabled={busy !== null || !state.firstEntryText.trim()}>
              {busy === 'save' ? <><span className="oj-spinner" />Saving your entry…</> : <>Save entry <ArrowRight size={18} /></>}
            </button>
            <button className="oj-text-action" type="button" onClick={next} disabled={busy !== null}>Skip for now</button>
          </> : screen === 14 ? <>
            <button className="oj-primary oj-light-button" type="button" onClick={() => void enroll()} disabled={busy !== null}>
              {busy === 'enroll' ? <><span className="oj-spinner" />Waiting for your device…</> : <>Create my private space <ArrowRight size={18} /></>}
            </button>
            <button className="oj-text-action" type="button" onClick={onSignIn} disabled={busy !== null}>Already have an account? Sign in</button>
          </> : screen === 'sign-in' ? <button className="oj-primary" type="button" onClick={onSignIn}>Continue to sign in <ArrowRight size={18} /></button> : (
            <button className={`oj-primary ${isDark ? 'oj-light-button' : ''}`} type="button" onClick={next}>
              Continue <ArrowRight size={18} />
            </button>
          )}
        </footer>
      </div>
    </main>
  );
}

function Welcome() {
  return <div className="oj-welcome-layout">
    <section className="oj-welcome-scene">
      <div className="oj-photo" />
      <div className="oj-welcome-copy"><h1>Meet LuLu.</h1><p>An ordinary journal with<br />an extraordinary purpose.</p></div>
    </section>
  </div>;
}

function Progress({ screen }: { screen: number }) {
  return <div className="oj-progress" role="progressbar" aria-label={`Onboarding progress: screen ${screen} of 14`} aria-valuemin={1} aria-valuemax={14} aria-valuenow={screen}>
    <span>{screen} / 14</span>
    <div className="oj-progress-segments" aria-hidden="true">{Array.from({ length: 14 }, (_, index) => <i key={index} className={index < screen ? 'is-complete' : ''} />)}</div>
  </div>;
}

function PersonaliseScreen({ name, onName }: { name: string; onName: (value: string) => void }) {
  return <><h1>What should we call you?</h1><p className="oj-lead">Choose a name or nickname to make this space feel like yours.</p><label className="oj-input-label" htmlFor="oj-name">Your name</label><input id="oj-name" className="oj-input" value={name} maxLength={80} onChange={event => onName(event.target.value.slice(0, 80))} placeholder="e.g. Alex" autoComplete="given-name" /><p className="oj-note"><LockKeyhole size={17} /><span>Your name stays on this device.</span></p></>;
}

function IntentionsScreen({ selected, onToggle }: { selected: string[]; onToggle: (title: string) => void }) {
  return <><h1>What brings you here today?</h1><p className="oj-lead">Choose what you’d like LuLu to help with first.</p><div className="oj-intention-grid">{intentions.map(({ title, detail, icon: Icon, tone }) => <button key={title} className={`oj-choice-card oj-intention ${selected.includes(title) ? 'is-selected' : ''} ${title.startsWith('Save') ? 'oj-wide' : ''}`} type="button" aria-pressed={selected.includes(title)} onClick={() => onToggle(title)}><span className={`oj-icon-well ${tone}`}><Icon size={19} /></span><span className="oj-choice-title">{title}</span><span className="oj-choice-detail">{detail}</span>{selected.includes(title) && <span className="oj-choice-check" aria-hidden="true"><Check size={13} /></span>}</button>)}</div></>;
}

function PersonalWelcome({ name }: { name: string }) {
  return <div className="oj-personal-welcome"><h1>{name.trim() ? `${name.trim()}, you’re in the right place.` : 'You’re in the right place.'}</h1><p className="oj-lead">Whatever brings you here, there’s room for your story.</p><p className="oj-note"><LockKeyhole size={17} /><span>Your name stays on this device.</span></p></div>;
}

function PromptSelection({ selected, onSelect }: { selected: string | null; onSelect: (prompt: string) => void }) {
  const prompts = [
    { title: 'What feels important today?', icon: Leaf },
    { title: 'Is there something you want to remember?', icon: Heart },
    { title: 'What has been on your mind lately?', icon: BookOpen },
    { title: 'Start with a blank page.', icon: Pencil },
  ];
  return <><h1>Every story starts somewhere.</h1><p className="oj-lead">Choose a prompt to create your first entry.</p><div className="oj-prompt-grid">{prompts.map(({ title, icon: Icon }) => <button key={title} className={`oj-choice-card oj-prompt ${selected === title ? 'is-selected' : ''}`} type="button" aria-pressed={selected === title} onClick={() => onSelect(title)}><span className="oj-icon-well sage"><Icon size={18} /></span><span className="oj-choice-title">{title}</span></button>)}</div><p className="oj-note"><Sparkles size={17} /><span>Prompts can adapt to what brings you here as you continue.</span></p></>;
}

function FirstEntryScreen({ state, onText, busy }: { state: OnboardingJourneyState; onText: (text: string) => void; busy: boolean }) {
  const prompt = state.prompt && !state.prompt.startsWith('Start with') ? state.prompt : 'What feels important today?';
  return <><h1>Your first entry.</h1><p className="oj-lead">Take a moment to read this example. Edit it if you like; there’s no right or wrong way.</p><div className="oj-editor"><div className="oj-editor-prompt"><Leaf size={18} /><span>{prompt}</span></div><textarea aria-label="Write your first entry" value={state.firstEntryText} maxLength={50000} onChange={event => onText(event.target.value.slice(0, 50000))} placeholder="Begin wherever you are…" disabled={busy} rows={5} /><div className="oj-editor-tools" aria-label="Illustrative writing tools"><button type="button" disabled aria-label="Add image"><Image size={19} /></button><button type="button" disabled aria-label="Record voice"><Mic size={19} /></button><span /><button type="button" disabled aria-label="Bold"><b>B</b></button><button type="button" disabled aria-label="Italic"><i>I</i></button><button type="button" disabled aria-label="Add link">↗</button></div><small className="oj-character-count">{state.firstEntryText.length.toLocaleString()} / 50,000</small></div><p className="oj-note"><Info size={17} /><span>This example is not saved unless you choose “Save entry”.</span></p></>;
}

function PrivateIntro() {
  return <><h1>Some things are just yours.</h1><p className="oj-lead">LuLu gives you a private space for experiences you’d rather keep to yourself.</p><div className="oj-private-intro-demo"><article className="oj-entry-card"><span className="oj-card-top"><Leaf size={16} /> Today <small>Sample</small></span><p>A quiet morning and a lot on my mind. I’m proud of how far I’ve come.</p></article><ArrowRight className="oj-transform-arrow" size={25} /><article className="oj-entry-card oj-private-sample"><span className="oj-card-top"><Leaf size={16} /> Today <small>Sample</small></span><p>A quiet morning and a lot on my mind. I’m proud of how far I’ve come.</p><span className="oj-sample-tag">PRIVATE EXAMPLE</span></article></div><p className="oj-note"><Info size={17} /><span>This example is fictional. Private writing is separate from everyday journal entries.</span></p></>;
}

function PrivateAccessDemo({ verified, onVerify }: { verified: boolean; onVerify: () => void }) {
  return <><h1>Your private space, one gesture away.</h1><p className="oj-lead">LuLu verifies it’s you before revealing private content.</p><div className="oj-space-compare"><article><span className="oj-icon-well sage"><BookOpen size={19} /></span><b>My journal</b><p>Everyday writing stays available.</p></article><article><span className="oj-icon-well sand"><LockKeyhole size={19} /></span><b>Private</b><p>Verify before entering.</p></article></div><div className="oj-simulated-passkey" aria-live="polite"><div className="oj-fingerprint">{verified ? <Check size={32} /> : <ShieldCheck size={32} />}</div><span className="oj-simulated-label">{verified ? 'SAMPLE SPACE OPEN' : 'SIMULATED PASSKEY'}</span><b>{verified ? 'Verify it’s you' : 'Your private space'}</b><p>{verified ? 'This is fictional content. No account or authenticator was used.' : 'Try this sample transition. It does not call your device authenticator.'}</p>{verified ? <div className="oj-simulated-sample">“I’m taking a moment to notice what I need today.”</div> : <button className="oj-mini-button" type="button" onClick={onVerify}>Simulate passkey verification</button>}</div></>;
}

function ScrubAndExitDemo({ variant, onNextExample }: { variant: boolean; onNextExample: () => void }) {
  const text = variant ? 'We talked about a difficult moment. I took some time to feel steady and decide what I needed next.' : 'The conversation left me unsettled. I gave myself time, then chose what felt right for me.';
  return <><h1>Protect what matters.</h1><p className="oj-lead">Choose what stays visible. Your original words remain preserved.</p><article className="oj-writing-card"><h2>A calmer morning</h2><small>MON, 14 APR · SAMPLE ENTRY</small><p>The morning was quieter than usual. I noticed the light through the leaves, and felt more grounded.</p><p className="oj-scrubbed-copy">{text}</p><button className="oj-inline-action" type="button" onClick={onNextExample}>Try another scrubbed example <ArrowRight size={15} /></button></article><p className="oj-note"><Info size={17} /><span>The sample uses ordinary-looking replacement text. It does not reveal or store real private writing.</span></p></>;
}

function UnderstandingDemo() {
  return <><h1>A little clarity can change everything.</h1><p className="oj-lead">Explore possible patterns, understand your options and decide what happens next.</p><article className="oj-understanding-card"><span className="oj-card-top"><Sparkles size={16} /> Example entry <small>FICTIONAL</small></span><p className="oj-sample-quote">“{demoEntry}”</p><div className="oj-topic"><span><small>Possible topic</small><b>Financial control</b><p>This can include restricting access to money or everyday financial decisions.</p></span></div><div className="oj-understanding-options"><div><BookOpen size={18} /><span>Information and guidance</span></div><div><Heart size={18} /><span>Ways to respond</span></div><div><Users size={18} /><span>Local support services</span></div></div><p className="oj-understanding-privacy"><LockKeyhole size={15} /> Identifying details are checked before anything is processed outside your device.</p></article><p className="oj-note"><Info size={17} /><span>This is a fictional illustration, not an assessment. LuLu does not process or share this sample.</span></p></>;
}

function ReflectionSupport({ selected, onSelect }: { selected: string | null; onSelect: (choice: string) => void }) {
  const choices = [
    { title: 'Trusted companion', detail: 'Share selected records or receive contributions.', icon: Users },
    { title: 'Professional support', detail: 'Explore counselling, legal help or local services.', icon: Heart },
    { title: 'Keep it private', detail: 'Continue documenting without sharing anything.', icon: LockKeyhole },
  ];
  return <><h1>You don’t have to do this alone.</h1><p className="oj-lead">Share with someone you trust, explore available help or take your time.</p><div className="oj-support-list">{choices.map(({ title, detail, icon: Icon }) => <button key={title} className={`oj-choice-card oj-support-card ${selected === title ? 'is-selected' : ''}`} type="button" aria-pressed={selected === title} onClick={() => onSelect(title)}><span className="oj-icon-well sage"><Icon size={18} /></span><span><b className="oj-choice-title">{title}</b><small className="oj-choice-detail">{detail}</small></span><ChevronRight size={17} /></button>)}</div><p className="oj-note"><Info size={17} /><span>These are introductions only. No contact is added, and nothing is shared from this demo.</span></p></>;
}

function QuickExitDemo({ exited, onExit }: { exited: boolean; onExit: () => void }) {
  return <><h1>Leave in an instant.</h1><p className="oj-lead">One quick action conceals your private space and returns you to your everyday journal.</p><div className="oj-exit-demo" aria-live="polite">{exited ? <><article className="oj-ordinary-stack"><span><Leaf size={15} /> My journal</span><p>A quiet morning, a few notes, and time to think.</p></article><div className="oj-exit-confirm" role="status"><Check size={16} />Private sample concealed</div></> : <><article className="oj-private-stack"><span>Private writing · sample</span><div /><div /><div /></article><ArrowRight className="oj-exit-arrow" size={23} /><article className="oj-ordinary-stack"><span><Leaf size={15} /> My journal</span><p>Everyday journal</p></article></>}<button className="oj-quick-exit-action" type="button" onClick={onExit}>{exited ? 'Replay quick exit' : 'Try quick exit'} <ArrowRight size={15} /></button></div><p className="oj-note"><Info size={17} /><span>This is a demonstration. It does not change your real journal or authentication state.</span></p></>;
}

function SecureAccess() {
  return <><h1>Your space.<br />Your control.</h1><p className="oj-lead">Protect your private space with a passkey. What you choose to share stays your decision.</p><div className="oj-fingerprint-large"><ShieldCheck size={50} strokeWidth={1.4} /></div><div className="oj-assurance-list"><div><span><LockKeyhole size={18} /></span><p><b>Private access</b><small>Use your device’s passkey authentication to unlock LuLu’s private space.</small></p></div><div><span><BookOpen size={18} /></span><p><b>On-device by default</b><small>Private originals are stored on your device by default.</small></p></div><div><span><ShieldCheck size={18} /></span><p><b>Your permissions</b><small>External processing and sharing follow your permissions.</small></p></div></div></>;
}

function SignInRoute({ onSignIn }: { onSignIn: () => void }) {
  return <><p className="oj-kicker">Welcome back</p><h1>Pick up where you left off.</h1><p className="oj-lead">Continue to your LuLu account.</p><button className="oj-primary" type="button" onClick={onSignIn}>Continue to sign in <ArrowRight size={18} /></button></>;
}

function Feedback({ feedback }: { feedback: JourneyFeedback }) {
  const actionHref = safeLocalActionUrl(feedback.actionUrl);
  return <div className={`oj-feedback oj-feedback-${feedback.type}`} role={feedback.type === 'error' ? 'alert' : 'status'}>{feedback.type === 'error' ? <CircleAlert size={18} /> : feedback.type === 'saved' ? <Check size={18} /> : <Info size={18} />}<span>{feedback.message}{actionHref && <a className="oj-feedback-link" href={actionHref}>{feedback.actionLabel?.trim() || 'Open LuLu on localhost'} <ArrowRight size={14} /></a>}</span></div>;
}

function safeLocalActionUrl(value?: string) {
  if (!value) return null;
  try {
    const url = new URL(value, typeof window === 'undefined' ? 'http://localhost' : window.location.origin);
    return (url.protocol === 'http:' || url.protocol === 'https:') && (url.hostname === 'localhost' || url.hostname === '127.0.0.1') ? url.href : null;
  } catch { return null; }
}

