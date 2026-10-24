import React, { useState } from 'react';
import { ArrowLeft, Plus, Check, Edit2, User, MapPin, Clock, Tag } from 'lucide-react';
import type { Entity, EntityType } from '../domain/transform';

type Props = {
  isOpen: boolean;
  onClose: () => void;
  entities: Entity[];
  onUpdateEntity: (entityId: string, newAlias: string) => void;
  onAddEntity: (newEntity: { original: string; alias: string; type: EntityType }) => void;
};

export const EntityControlsSheet: React.FC<Props> = ({
  isOpen,
  onClose,
  entities,
  onUpdateEntity,
  onAddEntity,
}) => {
  const [editingId, setEditingId] = useState<string | null>(null);
  const [tempAlias, setTempAlias] = useState('');
  const [showAddForm, setShowAddForm] = useState(false);
  const [newOriginal, setNewOriginal] = useState('');
  const [newAlias, setNewAlias] = useState('');
  const [newType, setNewType] = useState<EntityType>('Person');

  if (!isOpen) return null;

  const startEdit = (e: Entity) => {
    setEditingId(e.id);
    setTempAlias(e.alias);
  };

  const saveEdit = (id: string) => {
    if (tempAlias.trim()) {
      onUpdateEntity(id, tempAlias.trim());
    }
    setEditingId(null);
  };

  const handleCreate = (e: React.FormEvent) => {
    e.preventDefault();
    if (newOriginal.trim() && newAlias.trim()) {
      onAddEntity({
        original: newOriginal.trim(),
        alias: newAlias.trim(),
        type: newType,
      });
      setNewOriginal('');
      setNewAlias('');
      setShowAddForm(false);
    }
  };

  const getIcon = (type: EntityType) => {
    switch (type) {
      case 'Person':
        return <User size={15} />;
      case 'Place':
        return <MapPin size={15} />;
      case 'Time':
        return <Clock size={15} />;
      default:
        return <Tag size={15} />;
    }
  };

  return (
    <div className="entity-controls-overlay" onClick={onClose}>
      <div className="entity-controls-sheet" onClick={(e) => e.stopPropagation()}>
        <div className="sheet-header">
          <button className="icon-btn" onClick={onClose} aria-label="Back">
            <ArrowLeft size={18} />
          </button>
          <h3>Recognised in this entry</h3>
          <span style={{ width: 32 }} />
        </div>

        <div className="sheet-body">
          <p className="sheet-intro">
            LuLu connects sensitive mentions to stable, coherent alternative identities.
            Corrections are saved locally.
          </p>

          <div className="entity-card-list">
            {entities.map((entity) => {
              const isEditing = editingId === entity.id;
              return (
                <div key={entity.id} className="entity-card">
                  <div className="entity-avatar">{getIcon(entity.type)}</div>
                  <div className="entity-info">
                    <div className="entity-name-row">
                      <span className="entity-alias">{entity.alias}</span>
                      <span className="entity-type-badge">{entity.type}</span>
                    </div>
                    <div className="entity-original-row">
                      Original: <code>{entity.original}</code>
                      {entity.mentions ? (
                        <span className="mention-count"> • {entity.mentions} mention{entity.mentions > 1 ? 's' : ''}</span>
                      ) : null}
                    </div>
                  </div>

                  <div className="entity-actions">
                    {isEditing ? (
                      <div className="inline-edit-box">
                        <input
                          type="text"
                          value={tempAlias}
                          onChange={(e) => setTempAlias(e.target.value)}
                          className="alias-input"
                          autoFocus
                        />
                        <button
                          className="icon-btn-confirm"
                          onClick={() => saveEdit(entity.id)}
                          aria-label="Confirm alias"
                        >
                          <Check size={14} />
                        </button>
                      </div>
                    ) : (
                      <button
                        className="btn-view"
                        onClick={() => startEdit(entity)}
                      >
                        <Edit2 size={12} />
                        <span>Edit</span>
                      </button>
                    )}
                  </div>
                </div>
              );
            })}
          </div>

          {showAddForm ? (
            <form onSubmit={handleCreate} className="add-entity-form">
              <h4>New private association</h4>
              <div className="form-group">
                <label>Real sensitive reference</label>
                <input
                  placeholder="e.g. Sarah or work address"
                  value={newOriginal}
                  onChange={(e) => setNewOriginal(e.target.value)}
                  required
                />
              </div>
              <div className="form-group">
                <label>Concealed alias / representation</label>
                <input
                  placeholder="e.g. Maya or The Archive"
                  value={newAlias}
                  onChange={(e) => setNewAlias(e.target.value)}
                  required
                />
              </div>
              <div className="form-group">
                <label>Category</label>
                <select
                  value={newType}
                  onChange={(e) => setNewType(e.target.value as EntityType)}
                >
                  <option value="Person">Person</option>
                  <option value="Place">Location</option>
                  <option value="Time">Time / Date</option>
                  <option value="Topic">Topic</option>
                </select>
              </div>
              <div className="form-buttons">
                <button type="submit" className="primary-btn">
                  Save Association
                </button>
                <button
                  type="button"
                  className="secondary-btn"
                  onClick={() => setShowAddForm(false)}
                >
                  Cancel
                </button>
              </div>
            </form>
          ) : (
            <div className="sheet-footer-actions">
              <button
                className="btn-add-ref"
                onClick={() => setShowAddForm(true)}
              >
                <Plus size={16} />
                <span>Add a new reference</span>
              </button>
              <button className="primary-btn full-width" onClick={onClose}>
                Done
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
