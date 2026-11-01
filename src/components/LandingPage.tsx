import { useState } from 'react';
import {
  ArrowRight,
  ArrowUpRight,
  BookOpen,
  Camera,
  Check,
  ChevronDown,
  Clock3,
  Download,
  EyeOff,
  FileCheck2,
  Fingerprint,
  KeyRound,
  Leaf,
  LockKeyhole,
  Menu,
  MessageCircle,
  Mic,
  Moon,
  PenLine,
  Search,
  ShieldCheck,
  Sparkles,
  Smartphone,
  Trash2,
  Users,
  X,
} from 'lucide-react';
import './LuOrb.css';
import './LandingPage.css';
import { LuEyes } from './LuEyes';

const signInUrl = '/?auth=signin';
const androidUrl = 'https://github.com/ThisIsPhila/LuLu/releases/tag/android-ios-preview-2026-10-27';

type LandingPageProps = {
  onSignIn?: () => void;
  onCreateAccount?: () => void;
};

function EntryAction({ action, href, className, children }: { action?: () => void; href: string; className: string; children: React.ReactNode }) {
  if (action) return <button type="button" className={className} onClick={action}>{children}</button>;
  return <a className={className} href={href}>{children}</a>;
}

const journey = [
  {
    number: '01',
    title: 'Write',
    lead: 'Begin with an ordinary journal.',
    copy: 'Reflections, stories, notes, tasks, photographs and voice notes live in a calm everyday space—no safety workflow forced onto ordinary writing.',
  },
  {
    number: '02',
    title: 'Protect',
    lead: 'Move sensitive writing behind a second door.',
    copy: 'A deliberate private mode, passkey verification and quick exit separate what is personal from what is merely everyday.',
  },
  {
    number: '03',
    title: 'Understand',
    lead: 'Notice what may be happening.',
    copy: 'Lu and LuLu’s pattern review can help surface recurring themes, explain possible options and point to relevant information—without making decisions for you.',
  },
  {
    number: '04',
    title: 'Choose',
    lead: 'Keep it private or take a next step.',
    copy: 'Preserve the record, export or back it up, prepare a controlled disclosure, contact someone trusted, or explore professional support. Nothing moves without your direction.',
  },
];

const ordinaryFeatures = [
  { icon: PenLine, title: 'Journal & Stories', copy: 'Write daily entries, group related pieces into Stories and return to them in reading order.' },
  { icon: Camera, title: 'Photo & voice capture', copy: 'Attach moments as they happen, then keep text, images and audio connected to the entry.' },
  { icon: Search, title: 'Library & retrieval', copy: 'Search your own words, filter collections and favourites, and manage notes and tasks alongside entries.' },
  { icon: Clock3, title: 'A record over time', copy: 'Dates, revisions and collections preserve continuity instead of leaving memories scattered across apps.' },
];

const privateFeatures = [
  { icon: Fingerprint, title: 'Passkey-gated entry', copy: 'Private content asks your device to verify that it is really you before anything is revealed.' },
  { icon: EyeOff, title: 'Concealment & quick exit', copy: 'Hide sensitive material and return to the ordinary journal immediately when the moment changes.' },
  { icon: Sparkles, title: 'Contextual scrubbing', copy: 'Review identifying details and narrative perspective before any optional processing or disclosure.' },
  { icon: FileCheck2, title: 'Originals preserved', copy: 'A safer reading copy never replaces your original words, revisions or protected media.' },
];

const luActions = [
  'Find the entry where I mentioned the rent.',
  'Show me themes across these selected entries.',
  'Help me turn these notes into a calmer summary.',
  'What support options relate to this situation?',
];

const securityLayers = [
  {
    title: 'On your device first',
    copy: 'Private originals are encrypted locally with AES-GCM and protected by a device-held key. Autosaved private drafts, media, export and restore stay under the same private-session authority.',
    points: ['Encrypted IndexedDB vaults', 'Device key, never your passkey itself', 'Quick exit clears the live session view'],
  },
  {
    title: 'Owner-scoped cloud',
    copy: 'Ordinary account records use Firebase Authentication and owner-checked Firestore rules. The Johannesburg API verifies identity before protected account actions and applies bounded quotas.',
    points: ['Passkey and provider sign-in', 'Rules tied to the account UID', 'Server-side checks fail closed'],
  },
  {
    title: 'AI only after review',
    copy: 'Optional cloud understanding works from material you choose and review. Identifying details are checked first; local model exploration remains on-device where supported.',
    points: ['Explicit selection and review', 'No silent upload of private originals', 'Daily request limits on cloud assistance'],
  },
  {
    title: 'Disclosure stays frozen',
    copy: 'When you prepare something for someone else, LuLu binds the reviewed copy to the exact saved revision, recipient label and purpose before you decide whether to hand it over.',
    points: ['Exact-version review', 'No automatic sending', 'Export, backup and deletion remain available'],
  },
];

const faqs = [
  {
    question: 'Is LuLu just another journal app?',
    answer: 'Journaling is the everyday surface, not the whole product. Behind it are a separate private space, protected media, contextual concealment, pattern understanding, support routes and user-controlled disclosure.',
  },
  {
    question: 'What does “secret mode” actually mean?',
    answer: 'It is a separate protected space reached deliberately and unlocked with a passkey. Private originals are encrypted on the device, concealed until verification, and can be hidden again instantly with quick exit.',
  },
  {
    question: 'Does Lu or AI read everything I write?',
    answer: 'No. Cloud understanding is optional and begins with entries you select and review. Private originals are not silently uploaded, and identifying details are checked before any external processing.',
  },
  {
    question: 'Can LuLu report something for me?',
    answer: 'No. LuLu helps you document, understand and prepare. Whether to keep a record private, seek support, share it or report remains your decision.',
  },
  {
    question: 'What happens if I need to leave quickly?',
    answer: 'Quick exit conceals the private session and returns you to the ordinary journal. Your saved original remains protected and can be reopened only after verification.',
  },
];

function LuOrbVisual({ large = false }: { large?: boolean }) {
  return (
    <span className={`lu-orb-widget lp-real-orb ${large ? 'is-large' : ''}`} aria-hidden="true">
      <span className="lu-orb-sphere lp-real-sphere" />
      <LuEyes />
    </span>
  );
}

function PhonePreview() {
  return (
    <div className="lp-phone" aria-label="Preview of the LuLu mobile journal home">
      <div className="lp-phone-notch" />
      <div className="lp-phone-head">
        <img src="/media/brand/lulu-wordmark-black.png" alt="LuLu" />
        <span className="lp-phone-head-actions"><i aria-hidden="true">●</i><i aria-hidden="true">●</i></span>
      </div>
      <p className="lp-phone-date">Sunday, 1 November 2026</p>
      <h3>Good afternoon</h3>
      <p className="lp-phone-sub">A quiet sanctuary for your personal thoughts & discoveries.</p>
      <div className="lp-phone-tabs"><b>All <small>13</small></b><span>Journal</span><span>Stories</span></div>
      <article className="lp-phone-card lp-phone-reflection">
        <small>Reflection question</small>
        <p>“What felt quiet today, even while everything else was moving?”</p>
        <div><span>Begin quick entry…</span><b>Enter</b></div>
      </article>
      <div className="lp-phone-collections">
        <article><BookOpen size={16} /><b>Journal</b><small>5 entries</small><p>A little room in the morning</p></article>
        <article><Leaf size={16} /><b>Stories</b><small>8 entries</small><p>The empty lot</p></article>
      </div>
      <p className="lp-phone-label">Your latest writing</p>
      <article className="lp-phone-entry"><div><b>A little room in the morning</b><p>I left my phone on the table while the kettle warmed…</p></div><time>08:35</time></article>
      <nav className="lp-phone-nav" aria-label="Lu preview actions">
        <LuOrbVisual />
        <MessageCircle size={18} /><PenLine size={18} /><Mic size={18} /><Camera size={18} /><Search size={18} /><Menu size={18} />
      </nav>
    </div>
  );
}

function Header({ onSignIn }: { onSignIn?: () => void }) {
  const [open, setOpen] = useState(false);
  const links = [
    ['The experience', '#experience'], ['Everyday LuLu', '#ordinary'], ['Private space', '#private'], ['Meet Lu', '#lu'], ['Security', '#security'], ['Why it matters', '#why'],
  ] as const;
  return (
    <header className="lp-header">
      <a className="lp-brand" href="#top" aria-label="LuLu landing page home"><img src="/media/brand/lulu-wordmark-black.png" alt="LuLu" /></a>
      <nav className={open ? 'is-open' : ''} aria-label="Landing page">
        {links.map(([label, href]) => <a key={href} href={href} onClick={() => setOpen(false)}>{label}</a>)}
      </nav>
      <div className="lp-header-actions">
        <EntryAction action={onSignIn} href={signInUrl} className="lp-open-app">Open LuLu <ArrowUpRight size={16} /></EntryAction>
        <button type="button" className="lp-menu" onClick={() => setOpen(value => !value)} aria-expanded={open} aria-label="Toggle navigation">{open ? <X size={21} /> : <Menu size={21} />}</button>
      </div>
    </header>
  );
}

export default function LandingPage({ onSignIn, onCreateAccount }: LandingPageProps = {}) {
  return (
    <div className="lp-page" id="top">
      <Header onSignIn={onSignIn} />
      <main>
        <section className="lp-hero">
          <div className="lp-hero-inner">
          <div className="lp-hero-copy">
            <img className="lp-hero-logo" src="/media/brand/lulu-wordmark-black.png" alt="LuLu" />
            <h1>Your story.<br />Your safety.<br />Your choice.</h1>
            <p className="lp-hero-lead">An ordinary journal with an extraordinary purpose.</p>
            <p>Write for the everyday. When something matters more, LuLu quietly gives you a protected place to preserve it, understand it and decide what happens next.</p>
            <div className="lp-actions">
              <EntryAction action={onSignIn} href={signInUrl} className="lp-button lp-button-dark">Open LuLu <ArrowRight size={18} /></EntryAction>
              <a className="lp-button lp-button-light" href="#private">Discover the private space</a>
            </div>
            <div className="lp-hero-proof"><span><ShieldCheck size={17} /> Passkey protected</span><span><Moon size={17} /> Quick exit</span><span><Sparkles size={17} /> Meet Lu</span></div>
          </div>
          <div className="lp-hero-phone"><PhonePreview /></div>
          </div>
        </section>

        <section className="lp-intro lp-section" id="experience">
          <div className="lp-section-heading lp-heading-split">
            <div><p className="lp-label">The LuLu experience</p><h2>One place to begin.<br />Your choice of what comes next.</h2></div>
            <p>LuLu does not begin as a safety app. It begins as a journal people can return to every day—then offers protection only when they deliberately ask for it.</p>
          </div>
          <div className="lp-journey">
            {journey.map(item => (
              <article key={item.number}>
                <span>{item.number}</span><h3>{item.title}</h3><strong>{item.lead}</strong><p>{item.copy}</p>
              </article>
            ))}
          </div>
        </section>

        <section className="lp-ordinary lp-section" id="ordinary">
          <div className="lp-two-column">
            <div className="lp-sticky-copy">
              <p className="lp-label">Everyday by design</p>
              <h2>A journal you would use even when life is calm.</h2>
              <p>That ordinariness is intentional. LuLu is useful without a crisis: a place for morning pages, stories, photographs, voice notes, reminders and the small evidence of a life being lived.</p>
              <EntryAction action={onSignIn} href={signInUrl} className="lp-text-link">Start writing in LuLu <ArrowRight size={17} /></EntryAction>
            </div>
            <div className="lp-feature-list">
              {ordinaryFeatures.map(({ icon: Icon, title, copy }) => <article key={title}><span><Icon size={21} /></span><div><h3>{title}</h3><p>{copy}</p></div></article>)}
            </div>
          </div>
          <div className="lp-ordinary-note">
            <Leaf size={19} />
            <p><b>Ordinary on the surface.</b> No alarming labels, no pressure and no privacy processing switched on for everyday writing. The protected layer appears only when you choose it.</p>
          </div>
        </section>

        <section className="lp-private lp-section" id="private">
          <div className="lp-private-copy">
            <p className="lp-label lp-label-light">The space underneath</p>
            <h2>Some things are<br />just yours.</h2>
            <p>Behind the familiar journal is a separate private sanctuary for experiences you are not ready to name, share or explain. Entering is deliberate. Leaving can be instant.</p>
            <div className="lp-private-steps">
              <div><Fingerprint size={20} /><span><b>Verify</b><small>Passkey opens the door</small></span></div>
              <ArrowRight size={18} />
              <div><PenLine size={20} /><span><b>Preserve</b><small>Originals stay intact</small></span></div>
              <ArrowRight size={18} />
              <div><EyeOff size={20} /><span><b>Conceal</b><small>Quick exit to ordinary</small></span></div>
            </div>
          </div>
          <div className="lp-private-features">
            {privateFeatures.map(({ icon: Icon, title, copy }) => <article key={title}><Icon size={22} /><h3>{title}</h3><p>{copy}</p></article>)}
          </div>
          <aside className="lp-private-note"><LockKeyhole size={20} /><p><b>Important:</b> LuLu is a documentation and support tool. It does not replace emergency services, legal advice or professional care.</p></aside>
        </section>

        <section className="lp-lu lp-section" id="lu">
          <div className="lp-lu-copy">
            <div className="lp-lu-intro">
              <LuOrbVisual large />
              <div><p className="lp-label">Meet Lu</p><span><i /> Ready in your dock</span></div>
            </div>
            <h2>A quiet assistant<br />inside your journal.</h2>
            <p>Lu is the small pearl in the dock at the bottom of LuLu. Tap it to chat, press and hold for quick actions, or use it to dictate, record, add a photo and move into your private space.</p>
            <p>Lu helps you work with what you have already written: finding entries, connecting selected pieces, noticing possible patterns and turning scattered notes into a clearer next step. It does not diagnose, decide, report or share on your behalf.</p>
            <div className="lp-lu-orbit" aria-label="Lu quick actions">
              <span><Mic size={16} /> Dictate</span><span><Camera size={16} /> Camera</span><span><BookOpen size={16} /> My private</span><span><MessageCircle size={16} /> Live voice</span>
            </div>
          </div>
          <div className="lp-chat" aria-label="Examples of requests for Lu">
            <div className="lp-chat-head"><LuOrbVisual /><span><b>Lu</b><small>Journal assistant · text or live voice</small></span><span className="lp-chat-live"><i /> Available</span></div>
            {luActions.map(action => <div className="lp-chat-row" key={action}><p>{action}</p><ArrowUpRight size={16} /></div>)}
            <div className="lp-chat-response"><Sparkles size={18} /><p><b>Found across three entries.</b><br />I can show the passages, explain the possible pattern and suggest support options. You choose what happens next.</p></div>
          </div>
        </section>

        <section className="lp-transform lp-section">
          <div className="lp-transform-copy">
            <p className="lp-label">Before anything leaves the page</p>
            <h2>Understanding creates options.</h2>
            <p>A private entry may mention people, places, dates or patterns you do not want exposed. LuLu can help review and transform a copy while the protected original stays exactly as you wrote it.</p>
          </div>
          <div className="lp-transform-flow">
            <article><small>Original intent</small><p>“I keep having to ask permission before I can use my own money.”</p><span>Preserved privately</span></article>
            <ArrowRight size={22} />
            <article><small>Reviewed protection</small><p>Names, places and identifying details are surfaced for your correction before optional processing.</p><span>You approve the copy</span></article>
            <ArrowRight size={22} />
            <article className="lp-transform-result"><small>Possible pattern</small><h3>Financial control</h3><p>Learn what it can look like, speak to someone trusted or explore professional support.</p><span>No automatic action</span></article>
          </div>
        </section>

        <section className="lp-security lp-section" id="security">
          <div className="lp-section-heading">
            <p className="lp-label lp-label-light">How the protection works</p>
            <h2>The promise is backed<br />by the architecture.</h2>
            <p>LuLu separates ordinary account writing from protected originals, then adds verification at every boundary where information could move.</p>
          </div>
          <div className="lp-security-grid">
            {securityLayers.map((layer, index) => (
              <article key={layer.title}>
                <span className="lp-security-number">0{index + 1}</span>
                <h3>{layer.title}</h3><p>{layer.copy}</p>
                <ul>{layer.points.map(point => <li key={point}><Check size={16} />{point}</li>)}</ul>
              </article>
            ))}
          </div>
          <div className="lp-record-strip">
            <div><Clock3 size={21} /><span><b>Chronology</b><small>Entries, media and revisions stay connected.</small></span></div>
            <div><Download size={21} /><span><b>Take it with you</b><small>Readable export and encrypted per-record backup.</small></span></div>
            <div><Trash2 size={21} /><span><b>Delete deliberately</b><small>Scoped deletion after review and acknowledgement.</small></span></div>
            <div><Users size={21} /><span><b>Share selectively</b><small>Prepare a copy for a named purpose; never auto-send.</small></span></div>
          </div>
        </section>

        <section className="lp-why lp-section" id="why">
          <div className="lp-why-copy">
            <p className="lp-label">Why LuLu exists</p>
            <h2>Documentation should not require disclosure before you are ready.</h2>
            <p>In South Africa, experiences of violence, harassment, coercion and abuse are often held across messages, photographs, memory and silence. LuLu gives those fragments one survivor-directed place to live.</p>
            <a className="lp-source" href="https://hsrc.ac.za/wp-content/uploads/2024/12/FULL-REPORT-THE-FIRST-SOUTH-AFRICAN-NATIONAL-GENDER-BASED-VIOLENCE-STUDY-2022-10.12.24-SPREAD.pdf" target="_blank" rel="noreferrer">HSRC national study <ArrowUpRight size={15} /></a>
          </div>
          <div className="lp-stat">
            <strong>35.5%</strong>
            <p>of women aged 18+ in the HSRC’s first national GBV study reported physical and/or sexual violence in their lifetime.</p>
            <span>LuLu is for anyone who needs a safer way to preserve what happened—regardless of gender.</span>
          </div>
          <div className="lp-audience">
            <article><BookOpen size={22} /><h3>For everyday writers</h3><p>A beautiful journal and storybook, useful long before privacy features are needed.</p></article>
            <article><ShieldCheck size={22} /><h3>For people documenting harm</h3><p>Discreet capture, continuity, evidence organisation and support without pressure to report.</p></article>
            <article><Users size={22} /><h3>For trusted organisations</h3><p>Future sponsored access through NGOs, universities and community programmes—never access to private writing.</p></article>
          </div>
        </section>

        <section className="lp-model lp-section">
          <div><p className="lp-label">A sustainable access model</p><h2>Essential protection should not be sold back to the person who needs it.</h2></div>
          <div className="lp-model-grid">
            <article><h3>Free essentials</h3><p>Private documentation, protected entries, evidence organisation and support resources remain the foundation.</p></article>
            <article><h3>Optional premium</h3><p>Expanded storage, richer narrative tools and advanced organisation can sustain development.</p></article>
            <article><h3>Institutional support</h3><p>NGOs, educational institutions, grants and social-impact partners may sponsor access for communities.</p></article>
            <article className="lp-model-rule"><KeyRound size={22} /><h3>Never the product</h3><p>LuLu does not sell private narratives, evidence or identifying information. Trust is the business model’s boundary.</p></article>
          </div>
        </section>

        <section className="lp-faq lp-section">
          <div className="lp-section-heading lp-heading-split"><div><p className="lp-label">Clear answers</p><h2>What LuLu is—and what it is not.</h2></div><p>The landing page should name the hidden capability honestly, including its limits. Control means very little if the system is vague about where your words go.</p></div>
          <div className="lp-faq-list">
            {faqs.map(item => <details key={item.question}><summary>{item.question}<ChevronDown size={19} /></summary><p>{item.answer}</p></details>)}
          </div>
        </section>

        <section className="lp-final" id="access">
          <img src="/media/brand/lulu-wordmark-white.png" alt="LuLu" />
          <h2>Your experience.<br />Your evidence.<br />Your decision.</h2>
          <p>Begin with an ordinary page. Keep the extraordinary protection nearby, ready only if you ever need it.</p>
          <div className="lp-actions">
            <EntryAction action={onSignIn} href={signInUrl} className="lp-button lp-button-light">Open the web app <ArrowRight size={18} /></EntryAction>
            <EntryAction action={onCreateAccount} href={signInUrl} className="lp-text-link lp-create-link">Create an account <ArrowRight size={17} /></EntryAction>
            <a className="lp-button lp-button-outline" href={androidUrl}>Get the Android preview <Smartphone size={18} /></a>
          </div>
          <small>iPhone users can install published LuLu updates from Settings → App updates after signing in.</small>
        </section>
      </main>
      <footer className="lp-footer">
        <img src="/media/brand/lulu-wordmark-black.png" alt="LuLu" />
        <p>Your story. Your safety. Your choice.</p>
        <nav><a href="#experience">Experience</a><a href="#private">Private space</a><a href="#security">Security</a>{onSignIn ? <button type="button" className="lp-footer-open" onClick={onSignIn}>Open app</button> : <a href={signInUrl}>Open app</a>}</nav>
        <small>Team KHÔRA · FNB App of the Year Hackathon 2026</small>
      </footer>
    </div>
  );
}
