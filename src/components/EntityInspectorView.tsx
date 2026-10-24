import React, { useState } from 'react';
import {
  ArrowLeft,
  MoreHorizontal,
  ShieldCheck,
  User,
  MapPin,
  Clock,
  Plus,
  Lock,
  ArrowRight,
  Edit2,
  RotateCcw,
} from 'lucide-react';
import { LuLuLogo } from './Logo';
import type { Entity } from '../domain/transform';

type Props = {
  entities: Entity[];
  onBack: () => void;
  onUpdateAlias: (id: string, newAlias: string) => void;
  onConfirm: () => void;
};

export const EntityInspectorView: React.FC<Props> = ({
  entities,
  onBack,
  onUpdateAlias,
  onConfirm,
}) => {
  const [activeTab, setActiveTab] = useState<'Active' | 'Audit'>('Active');
  const [editingId, setEditingId] = useState<string | null>(null);
  const [tempAlias, setTempAlias] = useState('');

  const startEdit = (e: Entity) => {
    setEditingId(e.id);
    setTempAlias(e.alias);
  };

  const saveEdit = (id: string) => {
    if (tempAlias.trim()) {
      onUpdateAlias(id, tempAlias.trim());
    }
    setEditingId(null);
  };

  return (
    <div className="inspector-screen">
      {/* Top Header */}
      <header className="inspector-header">
        <button className="icon-btn-round" onClick={onBack} aria-label="Go back">
          <ArrowLeft size={18} />
        </button>
        <div className="inspector-header-title">
          <h2>Recognised in this entry</h2>
          <span className="entry-meta-sub">14 MAY 2026 • 21:36 • ENTRY #142</span>
        </div>
        <button className="icon-btn-ghost">
          <MoreHorizontal size={18} />
        </button>
      </header>

      {/* Main Content */}
      <main className="inspector-body">
        {/* High Privacy Status Card */}
        <div className="privacy-level-card">
          <div className="privacy-badge-row">
            <div className="shield-circle">
              <ShieldCheck size={16} />
            </div>
            <div className="level-titles">
              <strong>3 entities mapped • HIGH PRIVACY LEVEL</strong>
              <p>
                LuLu mapped original references to coherent representations. Your device enclave
                keeps original data completely offline.
              </p>
            </div>
          </div>
          <div className="enclave-status-footer">
            <div className="status-tag">
              <span className="green-dot" />
              <span>Neural Enclave Active</span>
            </div>
            <span className="zero-knowledge-tag">Zero-Knowledge Mask</span>
          </div>
        </div>

        {/* Transformations Section Header */}
        <div className="transformations-meta-row">
          <div className="left-count">
            <span className="section-label">TRANSFORMATIONS</span>
            <span className="count-pill">3 Active</span>
          </div>
          <div className="toggle-subtabs">
            <button
              className={`subtab-btn ${activeTab === 'Active' ? 'active' : ''}`}
              onClick={() => setActiveTab('Active')}
            >
              All
            </button>
            <button
              className={`subtab-btn ${activeTab === 'Audit' ? 'active' : ''}`}
              onClick={() => setActiveTab('Audit')}
            >
              Audit Log
            </button>
          </div>
        </div>

        {/* Entity Card 1: Person */}
        <div className="inspector-entity-card">
          <div className="card-type-row">
            <div className="type-badge person">
              <span>Person</span>
            </div>
            <span className="mention-label">4 mentions in this entry</span>
          </div>

          <div className="mapping-headline">
            <div className="col-orig">
              <span className="meta-caps">ORIGINAL</span>
              <h4>David</h4>
            </div>
            <ArrowRight size={16} className="arrow-sep" />
            <div className="col-rep">
              <span className="meta-caps">REPRESENTATION</span>
              <h4>
                {editingId === 'person-david' ? (
                  <input
                    value={tempAlias}
                    onChange={(e) => setTempAlias(e.target.value)}
                    className="inline-input"
                    autoFocus
                  />
                ) : (
                  entities.find((e) => e.id === 'person-david')?.alias || 'John'
                )}
              </h4>
            </div>
          </div>

          <p className="context-snippet-quote">
            "...met up with <span className="highlight-tag">John [David]</span> later to discuss plans
            for the next residency..."
          </p>

          <div className="card-actions-row">
            {editingId === 'person-david' ? (
              <button
                className="btn-pill-action primary"
                onClick={() => saveEdit('person-david')}
              >
                Save
              </button>
            ) : (
              <button
                className="btn-pill-action"
                onClick={() => startEdit(entities.find((e) => e.id === 'person-david')!)}
              >
                Change
              </button>
            )}
            <button
              className="btn-pill-action secondary"
              onClick={() => onUpdateAlias('person-david', 'David')}
            >
              Keep Original
            </button>
          </div>
        </div>

        {/* Entity Card 2: Location */}
        <div className="inspector-entity-card">
          <div className="card-type-row">
            <div className="type-badge location">
              <span>Location</span>
            </div>
            <span className="mention-label">2 mentions</span>
          </div>

          <div className="mapping-headline">
            <div className="col-orig">
              <span className="meta-caps">ORIGINAL</span>
              <h4>House in Tamboersk...</h4>
            </div>
            <ArrowRight size={16} className="arrow-sep" />
            <div className="col-rep">
              <span className="meta-caps">REPRESENTATION</span>
              <h4>The Nest</h4>
            </div>
          </div>

          <p className="context-snippet-quote">
            "...morning breeze at <span className="highlight-tag">The Nest</span> was crisp and kept
            thoughts untangled..."
          </p>

          <div className="card-actions-row">
            <button
              className="btn-pill-action"
              onClick={() => {
                const next = prompt('Edit representation for location:', 'The Nest');
                if (next) onUpdateAlias('place-tamboerskloof', next);
              }}
            >
              Edit Name
            </button>
            <button
              className="btn-pill-action secondary"
              onClick={() => onUpdateAlias('place-tamboerskloof', 'The Nest')}
            >
              Reset
            </button>
          </div>
        </div>

        {/* Entity Card 3: Time / Context */}
        <div className="inspector-entity-card">
          <div className="card-type-row">
            <div className="type-badge time">
              <span>Time / Context</span>
            </div>
            <span className="mention-label">1 mention</span>
          </div>

          <div className="mapping-headline">
            <div className="col-orig">
              <span className="meta-caps">ORIGINAL</span>
              <h4>May 2026 / 9pm</h4>
            </div>
            <ArrowRight size={16} className="arrow-sep" />
            <div className="col-rep">
              <span className="meta-caps">REPRESENTATION</span>
              <h4>Blue Moon</h4>
            </div>
          </div>

          <div className="card-actions-row">
            <button
              className="btn-pill-action"
              onClick={() => {
                const next = prompt('Change time alias:', 'Blue Moon');
                if (next) onUpdateAlias('time-evening', next);
              }}
            >
              Change Period
            </button>
            <button
              className="btn-pill-action secondary"
              onClick={() => onUpdateAlias('time-evening', '9pm')}
            >
              Keep Literal
            </button>
          </div>
        </div>

        {/* Add Reference Button */}
        <button
          className="btn-add-reference-manually"
          onClick={() => {
            const orig = prompt('Enter real private word:');
            const rep = prompt('Enter concealed alias:');
            if (orig && rep) {
              onUpdateAlias('new-' + Date.now(), rep);
              alert(`Added private mapping: ${orig} → ${rep}`);
            }
          }}
        >
          <Plus size={16} />
          <span>Add a new reference manually</span>
        </button>

        {/* Enclave Lock Footnote */}
        <div className="enclave-lock-footnote">
          <Lock size={13} />
          <span>Protected with Biometric Passkey / Device Enclave</span>
        </div>

        {/* Primary Confirm Button */}
        <div className="confirm-action-footer">
          <button className="confirm-apply-btn" onClick={onConfirm}>
            <span>Confirm representations</span>
            <span className="apply-tag">APPLY →</span>
          </button>
        </div>
      </main>
    </div>
  );
};
