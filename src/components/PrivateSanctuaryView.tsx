import React, { useState } from 'react';
import { ChevronRight, Lock, Shield, Users, X } from 'lucide-react';
import { LuLuLogo } from './Logo';
import { TrustedContacts } from './TrustedContacts';
import { SupportDirectory } from './SupportDirectory';

type Props = {
  uid: string;
  onQuickExit: () => void;
};

type SanctuarySection = 'Private' | 'Safety' | 'Resources';

const safetyPrompts = [
  'Think about a person or service I could contact.',
  'Consider a place I could go if I needed to leave.',
  'Consider whether this device is safe for private records.',
  'Review how to leave LuLu quickly.',
];

export const PrivateSanctuaryView: React.FC<Props> = ({ uid, onQuickExit }) => {
  const [showContacts, setShowContacts] = useState(false);
  const [activeCategory, setActiveCategory] = useState<SanctuarySection>('Private');
  const [checkedPrompts, setCheckedPrompts] = useState<Set<number>>(() => new Set());

  const titles: Record<SanctuarySection, string> = {
    Private: 'Your private space.',
    Safety: 'At your own pace.',
    Resources: 'Support when you choose.',
  };
  const descriptions: Record<SanctuarySection, string> = {
    Private: 'Your private tools stay separate from everyday journal browsing.',
    Safety: 'Use these optional prompts to think through what could help you feel safer. Nothing here contacts anyone.',
    Resources: 'Review the source and current contact details, then choose whether to reach out.',
  };

  function chooseSection(section: SanctuarySection) {
    setActiveCategory(section);
    setShowContacts(false);
  }

  return (
    <div className="sanctuary-screen">
      <header className="sanctuary-header">
        <div className="header-left"><LuLuLogo size="sm" dark /></div>
        <div className="header-right">
          <button className="quick-exit-btn-top" type="button" onClick={onQuickExit} title="Quick Exit to Journal">
            <X size={14} /><span>Quick exit</span>
          </button>
        </div>
      </header>

      <div className="sanctuary-pills-row" aria-label="Private support sections">
        {(['Private', 'Safety', 'Resources'] as const).map(section => <button
          key={section}
          className={`sanctuary-pill ${activeCategory === section ? 'active' : ''}`}
          type="button"
          aria-pressed={activeCategory === section}
          onClick={() => chooseSection(section)}
        >{section === 'Private' ? 'Private Sanctuary' : section === 'Safety' ? 'Safety Plan' : 'Helplines'}</button>)}
      </div>

      <main className="sanctuary-content">
        <div className="sanctuary-hero">
          <h1 className="sanctuary-title">{titles[activeCategory]}</h1>
          <p className="sanctuary-subtitle">{descriptions[activeCategory]}</p>
        </div>

        {activeCategory === 'Private' && (showContacts
          ? <TrustedContacts uid={uid} onClose={() => setShowContacts(false)} />
          : <section className="sanctuary-cards-list" aria-label="Private tools">
              <button className="sanctuary-card" type="button" onClick={() => setShowContacts(true)}>
                <span className="sanctuary-card-icon"><Users size={18} /></span>
                <span className="sanctuary-card-info"><strong>Trusted contacts</strong><span>Keep numbers you may choose to call. LuLu sends no alerts.</span></span>
                <ChevronRight size={16} className="chevron" aria-hidden="true" />
              </button>
              <div className="sanctuary-assurance-box">
                <div className="assurance-icon"><Lock size={16} /></div>
                <div className="assurance-text">
                  <strong>Private storage details</strong>
                  <p>Trusted contact details are encrypted before account storage. The encryption key is held by this browser; clearing its data can prevent access.</p>
                </div>
              </div>
            </section>)}

        {activeCategory === 'Safety' && <section className="sanctuary-plan" aria-label="Optional safety planning prompts">
          <p className="sanctuary-support-note">These are private reflection prompts, not a complete safety plan. They stay only while this view is open and clear when you leave the private area. Skip anything that does not feel safe to record on this device.</p>
          <ul className="sanctuary-plan-list">{safetyPrompts.map((prompt, index) => <li key={prompt}>
            <label><input type="checkbox" checked={checkedPrompts.has(index)} onChange={event => setCheckedPrompts(current => {
              const next = new Set(current);
              if (event.target.checked) next.add(index); else next.delete(index);
              return next;
            })} /><span>{prompt}</span></label>
          </li>)}</ul>
          <button className="sanctuary-card sanctuary-plan-resource" type="button" onClick={() => chooseSection('Resources')}>
            <span className="sanctuary-card-icon"><Shield size={18} /></span>
            <span className="sanctuary-card-info"><strong>Review support numbers</strong><span>Open the source-linked South African directory.</span></span>
            <ChevronRight size={16} className="chevron" aria-hidden="true" />
          </button>
        </section>}

        {activeCategory === 'Resources' && <SupportDirectory />}

        <div className="quick-exit-action-container">
          <button className="primary-quick-exit-button" type="button" onClick={onQuickExit}>
            <X size={16} /><span>Quick exit to notes</span>
          </button>
        </div>
      </main>
    </div>
  );
};
