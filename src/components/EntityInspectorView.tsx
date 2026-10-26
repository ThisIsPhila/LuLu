import React, { useEffect, useMemo, useState } from 'react';
import {
  ArrowLeft,
  ArrowRight,
  Lock,
  Plus,
} from 'lucide-react';
import { LuLuLogo } from './Logo';
import { recognised, type Entity, type EntityType } from '../domain/transform';

type Props = {
  entities: Entity[];
  referenceText?: string;
  loading?: boolean;
  loadError?: string;
  onBack: () => void;
  onConfirm: (entities: Entity[]) => Promise<void>;
};

const entityTypes: EntityType[] = ['Person', 'Place', 'Time', 'Topic', 'Pronoun'];

function newReferenceId(): string {
  const bytes = crypto.getRandomValues(new Uint8Array(16));
  return `reference-${Array.from(bytes, (byte) => byte.toString(16).padStart(2, '0')).join('')}`;
}

export const EntityInspectorView: React.FC<Props> = ({
  entities,
  referenceText = '',
  loading = false,
  loadError = '',
  onBack,
  onConfirm,
}) => {
  const [draftEntities, setDraftEntities] = useState<Entity[]>(entities);
  const [dirty, setDirty] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [tempAlias, setTempAlias] = useState('');
  const [adding, setAdding] = useState(false);
  const [newOriginal, setNewOriginal] = useState('');
  const [newAlias, setNewAlias] = useState('');
  const [newType, setNewType] = useState<EntityType>('Person');
  const [error, setError] = useState('');
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!dirty) setDraftEntities(entities);
  }, [entities, dirty]);

  const currentMatches = useMemo(
    () => new Map(recognised(referenceText, draftEntities).map((entity) => [entity.id, entity.mentions ?? 0])),
    [referenceText, draftEntities],
  );
  const controlsDisabled = loading || saving || Boolean(loadError);

  const startEdit = (entity: Entity) => {
    setError('');
    setEditingId(entity.id);
    setTempAlias(entity.alias);
  };

  const saveEdit = (id: string) => {
    const alias = tempAlias.trim();
    if (!alias || alias.length > 200) {
      setError('Enter a representation between 1 and 200 characters.');
      return;
    }
    setDraftEntities((current) => current.map((entity) => entity.id === id ? { ...entity, alias } : entity));
    setDirty(true);
    setEditingId(null);
    setError('');
  };

  const keepOriginal = (id: string) => {
    setDraftEntities((current) => current.map((entity) => entity.id === id ? { ...entity, alias: entity.original } : entity));
    setDirty(true);
    setEditingId(null);
    setError('');
  };

  const addReference = (event: React.FormEvent) => {
    event.preventDefault();
    const original = newOriginal.trim();
    const alias = newAlias.trim();
    if (!original || original.length > 200 || !alias || alias.length > 200) {
      setError('Enter an original reference and a representation, each up to 200 characters.');
      return;
    }
    if (draftEntities.length >= 100) {
      setError('You can save up to 100 private references.');
      return;
    }
    if (draftEntities.some((entity) => entity.original.toLocaleLowerCase() === original.toLocaleLowerCase())) {
      setError('That original reference is already listed.');
      return;
    }
    setDraftEntities((current) => [...current, { id: newReferenceId(), original, alias, type: newType }]);
    setDirty(true);
    setNewOriginal('');
    setNewAlias('');
    setNewType('Person');
    setAdding(false);
    setError('');
  };

  async function confirm() {
    if (saving || loading) return;
    setSaving(true);
    setError('');
    try {
      await onConfirm(draftEntities);
    } catch {
      setError('Could not confirm whether these private representations were saved. Reopen the inspector to check before retrying.');
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="inspector-screen">
      <header className="inspector-header">
        <button className="icon-btn-round" onClick={onBack} aria-label="Back to private writing">
          <ArrowLeft size={18} />
        </button>
        <div className="inspector-header-title">
          <h2>Private representations</h2>
          <span className="entry-meta-sub">Configured for this account on this device</span>
        </div>
        <div className="header-brand-title"><LuLuLogo size="sm" /></div>
      </header>

      <main className="inspector-body">
        <div className="privacy-level-card">
          <div className="level-titles">
            <strong>Your configured references</strong>
            <p>These replacements are saved encrypted on this device when you confirm. They are not a complete privacy review.</p>
          </div>
          <div className="enclave-status-footer">
            <div className="status-tag"><Lock size={13} /><span>Private session required</span></div>
            <span className="zero-knowledge-tag">This device</span>
          </div>
        </div>

        <div className="transformations-meta-row">
          <div className="left-count">
            <span className="section-label">REFERENCES</span>
            <span className="count-pill">{draftEntities.length} configured</span>
          </div>
        </div>

        {loading && <p className="private-journal-status" role="status">Loading encrypted references…</p>}
        {loadError && <p className="private-journal-alert" role="alert">{loadError}</p>}
        {error && <p className="private-journal-alert" role="alert">{error}</p>}

        {!loading && draftEntities.length === 0 && (
          <p className="private-journal-empty">No private references are configured. Add only replacements you choose to use.</p>
        )}

        {draftEntities.map((entity) => {
          const matches = currentMatches.get(entity.id);
          const typeClass = entity.type === 'Place' ? 'location' : entity.type === 'Time' ? 'time' : entity.type === 'Person' ? 'person' : '';
          return (
            <article className="inspector-entity-card" key={entity.id}>
              <div className="card-type-row">
                <div className={`type-badge ${typeClass}`}><span>{entity.type}</span></div>
                <span className="mention-label">
                  {referenceText ? `${matches ?? 0} matches in current writing` : 'Configured reference'}
                </span>
              </div>
              <div className="mapping-headline">
                <div className="col-orig"><span className="meta-caps">ORIGINAL</span><h4>{entity.original}</h4></div>
                <ArrowRight size={16} className="arrow-sep" aria-hidden="true" />
                <div className="col-rep">
                  <span className="meta-caps">REPRESENTATION</span>
                  {editingId === entity.id ? (
                    <input
                      value={tempAlias}
                      onChange={(event) => setTempAlias(event.target.value)}
                      className="inline-input"
                      aria-label={`Representation for ${entity.original}`}
                      maxLength={200}
                      autoFocus
                    />
                  ) : <h4>{entity.alias}</h4>}
                </div>
              </div>
              <div className="card-actions-row">
                {editingId === entity.id ? (
                  <>
                    <button className="btn-pill-action primary" type="button" onClick={() => saveEdit(entity.id)}>Keep change</button>
                    <button className="btn-pill-action secondary" type="button" onClick={() => setEditingId(null)}>Cancel</button>
                  </>
                ) : (
                  <>
                    <button className="btn-pill-action" type="button" disabled={controlsDisabled} onClick={() => startEdit(entity)}>Change</button>
                    <button className="btn-pill-action secondary" type="button" disabled={controlsDisabled} onClick={() => keepOriginal(entity.id)}>Keep original</button>
                  </>
                )}
              </div>
            </article>
          );
        })}

        {adding ? (
          <form className="inspector-entity-card" onSubmit={addReference}>
            <span className="section-label">ADD PRIVATE REFERENCE</span>
            <label className="meta-caps">ORIGINAL REFERENCE
              <input className="inline-input" aria-label="Original reference" value={newOriginal} onChange={(event) => setNewOriginal(event.target.value)} maxLength={200} autoComplete="off" />
            </label>
            <label className="meta-caps">REPRESENTATION
              <input className="inline-input" aria-label="New representation" value={newAlias} onChange={(event) => setNewAlias(event.target.value)} maxLength={200} autoComplete="off" />
            </label>
            <label className="meta-caps">TYPE
              <select aria-label="Reference type" value={newType} onChange={(event) => setNewType(event.target.value as EntityType)}>
                {entityTypes.map((type) => <option key={type} value={type}>{type}</option>)}
              </select>
            </label>
            <div className="card-actions-row">
              <button className="btn-pill-action primary" type="submit" disabled={controlsDisabled}>Add reference</button>
              <button className="btn-pill-action secondary" type="button" disabled={saving} onClick={() => { setAdding(false); setError(''); }}>Cancel</button>
            </div>
          </form>
        ) : (
          <button className="btn-add-reference-manually" type="button" disabled={controlsDisabled} onClick={() => { setAdding(true); setError(''); }}>
            <Plus size={16} /><span>Add a new reference manually</span>
          </button>
        )}

        <div className="enclave-lock-footnote">
          <Lock size={13} />
          <span>Confirm to save these changes encrypted on this device.</span>
        </div>
        <div className="confirm-action-footer">
          <button className="confirm-apply-btn" type="button" disabled={loading || saving || Boolean(loadError)} onClick={() => void confirm()}>
            <span>{saving ? 'Saving…' : 'Confirm representations'}</span>
            <span className="apply-tag">{saving ? 'SAVE…' : 'SAVE →'}</span>
          </button>
        </div>
      </main>
    </div>
  );
};
