import { useEffect, useRef, useState, type PointerEvent as ReactPointerEvent } from 'react';
import { AudioLines, Camera, ImagePlus, Mic, BookOpen } from 'lucide-react';
import { createPortal } from 'react-dom';
import './LuOrb.css';

export type LuQuickAction = 'dictate' | 'record' | 'camera' | 'upload' | 'private-content';

const actions = [
  { id: 'dictate', label: 'Dictate', icon: AudioLines },
  { id: 'record', label: 'Voice note', icon: Mic },
  { id: 'camera', label: 'Camera', icon: Camera },
  { id: 'upload', label: 'Add photo', icon: ImagePlus },
  { id: 'private-content', label: 'My private', icon: BookOpen },
] as const;
const radius = 92;

type Props = { open: boolean; disabled: boolean; onOpen: () => void; onAction: (action: LuQuickAction) => void };

export function LuOrb({ open, disabled, onOpen, onAction }: Props) {
  const [wheel, setWheel] = useState(false);
  const [active, setActive] = useState<LuQuickAction | null>(null);
  const [center, setCenter] = useState({ x: 0, y: 0 });
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const held = useRef(false);
  const moved = useRef(false);
  const start = useRef({ x: 0, y: 0 });
  const selected = useRef<LuQuickAction | null>(null);
  const buttons = useRef(new Map<LuQuickAction, HTMLButtonElement>());

  function clearTimer() { if (timer.current) clearTimeout(timer.current); timer.current = null; }
  useEffect(() => () => clearTimer(), []);
  useEffect(() => {
    if (!wheel) return;
    const closeOnEscape = (event: KeyboardEvent) => { if (event.key === 'Escape') { event.stopPropagation(); setWheel(false); setActive(null); } };
    const keepInView = () => setCenter({ x: window.innerWidth / 2, y: window.innerHeight / 2 });
    document.addEventListener('keydown', closeOnEscape);
    window.addEventListener('resize', keepInView);
    return () => { document.removeEventListener('keydown', closeOnEscape); window.removeEventListener('resize', keepInView); };
  }, [wheel]);

  function openWheel(_x: number, _y: number) {
    setCenter({ x: window.innerWidth / 2, y: window.innerHeight / 2 });
    selected.current = null; setActive(null); setWheel(true);
  }
  function choose(action: LuQuickAction) {
    if (disabled) return;
    setWheel(false); setActive(null); selected.current = null; onAction(action);
  }
  function updateSelection(x: number, y: number) {
    let next: LuQuickAction | null = null;
    for (const [id, button] of buttons.current) {
      const rect = button.getBoundingClientRect();
      if (x >= rect.left - 12 && x <= rect.right + 12 && y >= rect.top - 12 && y <= rect.bottom + 12) { next = id; break; }
    }
    selected.current = next; setActive(next);
  }
  function pointerDown(event: ReactPointerEvent<HTMLButtonElement>) {
    if (event.button !== 0) return;
    clearTimer(); held.current = false; moved.current = false;
    start.current = { x: event.clientX, y: event.clientY };
    event.currentTarget.setPointerCapture(event.pointerId);
    timer.current = setTimeout(() => { held.current = true; openWheel(start.current.x, start.current.y); }, 450);
  }
  function pointerMove(event: ReactPointerEvent<HTMLButtonElement>) {
    if (Math.hypot(event.clientX - start.current.x, event.clientY - start.current.y) > 12) moved.current = true;
    if (held.current) updateSelection(event.clientX, event.clientY);
    else if (moved.current) clearTimer();
  }
  function pointerUp(event: ReactPointerEvent<HTMLButtonElement>) {
    clearTimer();
    if (held.current && moved.current) {
      updateSelection(event.clientX, event.clientY);
      if (selected.current) choose(selected.current); else setWheel(false);
    }
  }
  return <>
    <button type="button" className="lu-orb-launcher" aria-label="Open Lu. Press and hold for quick actions" aria-haspopup="dialog" aria-expanded={open || wheel}
      onPointerDown={pointerDown} onPointerMove={pointerMove} onPointerUp={pointerUp}
      onPointerCancel={() => { clearTimer(); held.current = false; setWheel(false); }}
      onContextMenu={event => { event.preventDefault(); clearTimer(); held.current = true; openWheel(event.clientX || window.innerWidth / 2, event.clientY || window.innerHeight / 2); }}
      onClick={() => { if (held.current) { held.current = false; return; } onOpen(); }}>
      <span className="lu-orb-sphere" aria-hidden="true" /><img className="lu-orb-mark" src="/media/brand/lu-mark-white.png" alt="" />
    </button>
    <button type="button" className="lu-orb-keyboard-actions" onClick={() => openWheel(window.innerWidth / 2, window.innerHeight / 2)}>Open Lu quick actions</button>
    {wheel && createPortal(<div className="lu-wheel-overlay" onPointerDown={event => { if (event.target === event.currentTarget) setWheel(false); }}>
      <div className="lu-wheel" role="dialog" aria-label="Lu quick actions" style={{ left: center.x, top: center.y }}>
        <div className="lu-wheel-rings" aria-hidden="true" /><span className="lu-wheel-orb lu-orb-sphere" aria-hidden="true" /><img className="lu-wheel-mark" src="/media/brand/lu-mark-white.png" alt="" />
        {actions.map(({ id, label, icon: Icon }, index) => {
          const angle = -Math.PI / 2 + index * 2 * Math.PI / actions.length;
          return <button key={id} ref={node => { if (node) buttons.current.set(id, node); else buttons.current.delete(id); }} type="button" disabled={disabled}
            className={`lu-wheel-action${active === id ? ' is-active' : ''}`} style={{ left: Math.cos(angle) * radius, top: Math.sin(angle) * radius }} onClick={() => choose(id)}>
            <Icon size={21} strokeWidth={1.7} aria-hidden="true" /><span>{label}</span>
          </button>;
        })}
        <span className="lu-wheel-hint">{disabled ? 'Finish your current work first' : 'Slide to choose'}</span>
        <button type="button" className="lu-wheel-close" onClick={() => setWheel(false)}>Close</button>
      </div>
    </div>, document.body)}
  </>;
}
