import React from 'react';
import { ArrowRight, X } from 'lucide-react';

type EntityPopoverProps = {
  original: string;
  alias: string;
  type: string;
  position: { top: number; left: number };
  onKeep: () => void;
  onChangeAlias: () => void;
  onDismiss: () => void;
};

export const EntityPopover: React.FC<EntityPopoverProps> = ({
  original,
  alias,
  type,
  position,
  onKeep,
  onChangeAlias,
  onDismiss,
}) => {
  return (
    <div
      className="entity-popover"
      style={{
        position: 'absolute',
        top: position.top,
        left: Math.max(10, Math.min(position.left, window.innerWidth - 300)),
        zIndex: 50,
      }}
      onClick={(e) => e.stopPropagation()}
    >
      <div className="popover-header">
        <span className="popover-type">{type} reference</span>
        <button className="popover-close" onClick={onDismiss} aria-label="Close">
          <X size={12} />
        </button>
      </div>

      <div className="popover-mapping">
        <span className="popover-original">{original}</span>
        <ArrowRight size={13} className="popover-arrow" />
        <span className="popover-alias">{alias}</span>
      </div>

      <div className="popover-actions">
        <button className="btn-popover-keep" onClick={onKeep}>
          Keep
        </button>
        <button className="btn-popover-change" onClick={onChangeAlias}>
          Change
        </button>
        <button className="btn-popover-dismiss" onClick={onDismiss}>
          Dismiss
        </button>
      </div>
    </div>
  );
};
