import React, { useState } from 'react';
import {
  Shield,
  PhoneCall,
  Users,
  Compass,
  Lock,
  X,
  Volume2,
  FileCheck,
  ChevronRight,
  ArrowLeft,
  LifeBuoy,
} from 'lucide-react';
import { LuLuLogo } from './Logo';

type Props = {
  onQuickExit: () => void;
  onOpenJournal: () => void;
};

export const PrivateSanctuaryView: React.FC<Props> = ({ onQuickExit, onOpenJournal }) => {
  const [activeCategory, setActiveCategory] = useState<'Private' | 'Safety' | 'Resources'>('Private');
  const [isPlayingAudio, setIsPlayingAudio] = useState(false);
  const [selectedPlanStep, setSelectedPlanStep] = useState<string | null>(null);

  return (
    <div className="sanctuary-screen">
      {/* Top Header */}
      <header className="sanctuary-header">
        <div className="header-left">
          <LuLuLogo size="sm" dark />
        </div>
        <div className="header-right">
          <button className="quick-exit-btn-top" onClick={onQuickExit} title="Quick Exit to Journal">
            <X size={14} />
            <span>Quick exit</span>
          </button>
        </div>
      </header>

      {/* Sanctuary Sub-nav */}
      <div className="sanctuary-pills-row">
        <button
          className={`sanctuary-pill ${activeCategory === 'Private' ? 'active' : ''}`}
          onClick={() => setActiveCategory('Private')}
        >
          <span>• Private Sanctuary</span>
        </button>
        <button
          className={`sanctuary-pill ${activeCategory === 'Safety' ? 'active' : ''}`}
          onClick={() => setActiveCategory('Safety')}
        >
          <span>Safety Plan</span>
        </button>
        <button
          className={`sanctuary-pill ${activeCategory === 'Resources' ? 'active' : ''}`}
          onClick={() => setActiveCategory('Resources')}
        >
          <span>Helplines</span>
        </button>
      </div>

      {/* Main Sanctuary Content */}
      <main className="sanctuary-content">
        <div className="sanctuary-hero">
          <h1 className="sanctuary-title">You're not alone.</h1>
          <p className="sanctuary-subtitle">
            Support, information and tools when you're ready. Everything stays encrypted on this device.
          </p>
        </div>

        {/* Core GBV & Safety Support Cards */}
        <section className="sanctuary-cards-list">
          <div
            className="sanctuary-card"
            onClick={() =>
              alert(
                'Safety Planning Checklist:\n\n1. Safe word identified with trusted friend.\n2. Key documents (ID, passport, bank cards) safely backed up.\n3. Emergency transport or safe location identified.\n4. Device lock secured with personal passkey.'
              )
            }
          >
            <div className="sanctuary-card-icon">
              <Shield size={18} />
            </div>
            <div className="sanctuary-card-info">
              <h3>Safety planning</h3>
              <p>Create a plan that feels right for you, step by step.</p>
            </div>
            <ChevronRight size={16} className="chevron" />
          </div>

          <div
            className="sanctuary-card"
            onClick={() =>
              alert(
                'Understand Your Rights & Options:\n\n• Legal Protection Orders (Domestic Violence Act).\n• Medical care without police reporting requirement.\n• Confidential evidence preservation.\n• Non-profit legal advocacy.'
              )
            }
          >
            <div className="sanctuary-card-icon">
              <Compass size={18} />
            </div>
            <div className="sanctuary-card-info">
              <h3>Understand your options</h3>
              <p>Learn about your rights, choices and what to expect.</p>
            </div>
            <ChevronRight size={16} className="chevron" />
          </div>

          <div
            className="sanctuary-card"
            onClick={() =>
              alert(
                'Trusted Contacts:\n\nYour trusted emergency circle can receive silent alerts or pre-written check-ins if ever triggered by your choice.'
              )
            }
          >
            <div className="sanctuary-card-icon">
              <Users size={18} />
            </div>
            <div className="sanctuary-card-info">
              <h3>Trusted contacts</h3>
              <p>Save people you trust and have them ready when you need them.</p>
            </div>
            <ChevronRight size={16} className="chevron" />
          </div>

          <div
            className="sanctuary-card"
            onClick={() =>
              alert(
                'Support Helplines (South Africa):\n\n• GBV Command Centre: 0800 428 428 (Toll-free, 24/7)\n• Please Call Me: *120*7867#\n• TEARS Foundation: *134*7355#\n• Lifeline SA: 0861 322 322'
              )
            }
          >
            <div className="sanctuary-card-icon">
              <LifeBuoy size={18} />
            </div>
            <div className="sanctuary-card-info">
              <h3>Support resources</h3>
              <p>Helplines, local services and trusted organisations.</p>
            </div>
            <ChevronRight size={16} className="chevron" />
          </div>
        </section>

        {/* Privacy Assurance Box */}
        <div className="sanctuary-assurance-box">
          <div className="assurance-icon">
            <Lock size={16} />
          </div>
          <div className="assurance-text">
            <strong>This is your private space.</strong>
            <p>
              You're in control. You can explore, save and return at any time. No history or
              notifications will leave this device.
            </p>
          </div>
        </div>

        {/* Big Quick Exit Button */}
        <div className="quick-exit-action-container">
          <button className="primary-quick-exit-button" onClick={onQuickExit}>
            <X size={16} />
            <span>Quick exit to notes</span>
          </button>
        </div>

        {/* Calm Focus Section (Offline • Encrypted) */}
        <section className="calm-focus-section">
          <div className="calm-focus-header">
            <span className="calm-focus-title">CALM FOCUS</span>
            <span className="calm-focus-meta">Offline • Encrypted</span>
          </div>

          <div className="calm-focus-grid">
            <div
              className={`calm-card ${isPlayingAudio ? 'active' : ''}`}
              onClick={() => setIsPlayingAudio(!isPlayingAudio)}
            >
              <img
                src="https://images.unsplash.com/photo-1506744038136-46273834b3fb?w=300&q=80"
                alt="Grounding landscape"
                className="calm-card-image"
              />
              <div className="calm-card-caption">
                <h4>Grounding sound</h4>
                <span>{isPlayingAudio ? 'Playing • Breathing cadence' : '4 min breathing'}</span>
              </div>
            </div>

            <div
              className="calm-card"
              onClick={() =>
                alert(
                  'Step-by-step checklist:\n✓ Keep phone charged\n✓ Save safe emergency numbers\n✓ Keep evidence in LuLu protected enclave\n✓ Know your nearest sanctuary shelter'
                )
              }
            >
              <img
                src="https://images.unsplash.com/photo-1518495973542-4542c06a5843?w=300&q=80"
                alt="Safety checklist eucalyptus"
                className="calm-card-image"
              />
              <div className="calm-card-caption">
                <h4>Safety checklist</h4>
                <span>Step-by-step guide</span>
              </div>
            </div>
          </div>
        </section>
      </main>
    </div>
  );
};
