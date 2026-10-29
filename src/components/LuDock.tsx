import { useEffect, useState, type ReactNode } from 'react';
import { AnimatePresence, motion, useReducedMotion } from 'framer-motion';
import { BookOpen, Camera, Compass, FileText, ImagePlus, LibraryBig, Menu, MessageCircle, Mic, PenLine, Search, X } from 'lucide-react';
import type { Entry } from '../domain/journal';
import './LuDock.css';

type View = 'home' | 'leaves' | 'stories' | 'library' | 'compose';
type Mode = 'draft' | 'search' | 'upload' | 'menu' | null;
type Props = { anchor: ReactNode; onDismissGuide: () => void; entries: Entry[]; onNavigate: (view: View) => void; onGuideNavigate: (view: 'reader' | 'settings') => void; hasEntries: boolean; onSelect: (entry: Entry) => void; onChat: (text: string) => void; onDraft: (text: string, kind: 'Journal' | 'Story') => void; canStartDraft: boolean; onCapture: (action: 'record' | 'camera' | 'upload') => void };

export function LuDock({ anchor, onDismissGuide, entries, onNavigate, onGuideNavigate, hasEntries, onSelect, onChat, onDraft, canStartDraft, onCapture }: Props) {
  const [mode, setMode] = useState<Mode>(null);
  const [draft, setDraft] = useState('');
  const [query, setQuery] = useState('');
  const reduced = useReducedMotion();
  useEffect(() => { const close = (event: KeyboardEvent) => { if (event.key === 'Escape') setMode(null); }; window.addEventListener('keydown', close); return () => window.removeEventListener('keydown', close); }, []);
  const choose = (next: Mode) => setMode(current => current === next ? null : next);
  const results = query.trim() ? entries.filter(entry => `${entry.title} ${entry.body} ${entry.tags.join(' ')}`.toLowerCase().includes(query.toLowerCase().trim())).slice(0, 6) : [];
  return <div className="lu-dock-wrap">
    <AnimatePresence initial={false}>
      {mode && <motion.section key={mode} className="lu-dock-expanded" aria-label={mode === 'menu' ? 'Navigation menu' : mode === 'upload' ? 'Add a photo' : mode === 'search' ? 'Search entries' : 'Start a draft'} initial={reduced ? false : {opacity:0,y:12,scale:.98}} animate={{opacity:1,y:0,scale:1}} exit={reduced ? {opacity:0} : {opacity:0,y:8,scale:.98}} transition={{duration:reduced ? 0 : .2}}>
        <div className="lu-dock-expanded-heading"><strong>{mode === 'draft' ? 'Start a draft' : mode === 'search' ? 'Search' : mode === 'upload' ? 'Add a photo' : 'Navigation'}</strong><button type="button" aria-label="Close dock panel" onClick={() => setMode(null)}><X size={18}/></button></div>
        {mode === 'draft' && <div><p>Choose where to continue your draft.</p><div className="lu-dock-options"><button type="button" disabled={!canStartDraft || !draft.trim()} onClick={() => {onDraft(draft,'Journal');setDraft('');setMode(null);}}>Continue in Journal</button><button type="button" disabled={!canStartDraft || !draft.trim()} onClick={() => {onDraft(draft,'Story');setDraft('');setMode(null);}}>Continue in Stories</button></div>{!canStartDraft && <small>Finish your current screen before starting a draft.</small>}</div>}
        {mode === 'search' && <div className="lu-dock-results">{query.trim() ? results.length ? results.map(entry => <button type="button" key={entry.id} onClick={() => {onSelect(entry);setMode(null);setQuery('');}}><strong>{entry.title}</strong><small>{entry.kind} · {entry.groupDate}</small></button>) : <p>No matching entries.</p> : <small>Search your journal and stories.</small>}</div>}
        {mode === 'upload' && <div className="lu-dock-menu"><button type="button" onClick={() => {setMode(null);onCapture('camera');}}><Camera size={18}/> Take a photo</button><button type="button" onClick={() => {setMode(null);onCapture('upload');}}><ImagePlus size={18}/> Choose a photo</button></div>}
        {mode === 'menu' && <nav className="lu-dock-menu lu-dock-navigation" aria-label="Main navigation">{([
          {view:'home',label:'Home',description:'See recent writing and quick actions for notes and tasks.',icon:BookOpen},
          {view:'leaves',label:'Journal',description:'Browse your journal entries.',icon:FileText},
          {view:'stories',label:'Stories',description:'Browse saved stories and their collections.',icon:BookOpen},
          {view:'library',label:'Library',description:'Find entries, notes and tasks in one place.',icon:LibraryBig},
          {view:'reader',label:'Reader',description:'Read your latest saved entry.',icon:BookOpen},
          {view:'compose',label:'Write',description:'Start a new journal entry or story.',icon:PenLine},
          {view:'settings',label:'Settings',description:'Review account, accessibility and storage settings.',icon:Compass},
        ] as const).map(({view,label,description,icon:Icon}) => <button key={view} type="button" disabled={view === 'reader' && !hasEntries} onClick={() => {if(view === 'reader' || view === 'settings') onGuideNavigate(view); else onNavigate(view);setMode(null);}}><span className="lulu-guide-icon"><Icon size={17} aria-hidden="true" /></span><span className="lulu-guide-destination-copy"><strong>{label}</strong><small>{description}</small></span></button>)}</nav>}
      </motion.section>}
    </AnimatePresence>
    <motion.nav layout transition={reduced ? {duration:0} : {type:'spring',stiffness:400,damping:34}} className="lu-dock" aria-label="Lu and app actions" onClickCapture={event => { if (!(event.target as HTMLElement).closest('.lu-dock-anchor')) onDismissGuide(); }}>
      {mode === 'draft' || mode === 'search' ? <motion.div className="lu-dock-inline" initial={reduced ? false : {opacity:0, x:12}} animate={{opacity:1,x:0}} transition={{duration:reduced ? 0 : .2}}>
        <span className="lu-dock-inline-icon">{mode === 'draft' ? <PenLine size={19}/> : <Search size={19}/>}</span>
        <input aria-label={mode === 'draft' ? 'Your draft' : 'Search journal and stories'} placeholder={mode === 'draft' ? 'Start writing…' : 'Search entries…'} value={mode === 'draft' ? draft : query} onChange={event => { if(mode === 'draft') setDraft(event.target.value); else setQuery(event.target.value); }} autoFocus />
        <button type="button" aria-label="Close dock input" onClick={() => setMode(null)}><X size={18}/></button>
      </motion.div> : <>
      <span className="lu-dock-anchor" onClick={() => setMode(null)}>{anchor}</span>
      <button type="button" aria-label="Open a full-page text chat with Lu" onClick={() => onChat('')}><MessageCircle size={19}/></button>
      <span className="lu-dock-separator" aria-hidden="true" />
      <button type="button" aria-label="Start a text draft" aria-expanded={false} onClick={() => choose('draft')}><PenLine size={19}/></button>
      <button type="button" aria-label="Record a voice note" onClick={() => {setMode(null);onCapture('record');}}><Mic size={19}/></button>
      <button type="button" className={mode==='upload'?'active':''} aria-label="Add a photo" aria-expanded={mode==='upload'} onClick={() => choose('upload')}><ImagePlus size={19}/></button>
      <span className="lu-dock-separator" aria-hidden="true" />
      <button type="button" aria-label="Search" aria-expanded={false} onClick={() => choose('search')}><Search size={19}/></button>
      <button type="button" className={mode==='menu'?'active':''} aria-label="Open navigation menu" aria-expanded={mode==='menu'} onClick={() => choose('menu')}><Menu size={20}/></button>
      </>}
    </motion.nav>
  </div>;
}
