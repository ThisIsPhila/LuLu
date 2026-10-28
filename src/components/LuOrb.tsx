import { useEffect, useRef, useState, type PointerEvent as ReactPointerEvent } from 'react';
import { AudioLines, Camera, ImagePlus, Mic, BookOpen } from 'lucide-react';
import { createPortal } from 'react-dom';
import './LuOrb.css';
import { LuEyes } from './LuEyes';
import { nativeHaptic } from '../services/nativeHaptic';

export type LuQuickAction = 'dictate' | 'record' | 'camera' | 'upload' | 'private-content';

const actions = [
  { id: 'dictate', label: 'Dictate', icon: AudioLines },
  { id: 'record', label: 'Voice note', icon: Mic },
  { id: 'camera', label: 'Camera', icon: Camera },
  { id: 'upload', label: 'Add photo', icon: ImagePlus },
  { id: 'private-content', label: 'My private', icon: BookOpen },
] as const;
const radius = 112;

function wheelCenter() {
  return { x: window.innerWidth / 2, y: Math.max(148, window.innerHeight - 210) };
}

// Confessions uses an annular, angle-snapped hit target for hold-and-slide.
function actionAt(x: number, y: number, center: { x: number; y: number }): LuQuickAction | null {
  const dx = x - center.x, dy = y - center.y;
  const distance = Math.hypot(dx, dy);
  if (distance < 40 || distance > radius + 44) return null;
  const step = 2 * Math.PI / actions.length;
  const angle = (Math.atan2(dy, dx) + Math.PI / 2 + 2 * Math.PI) % (2 * Math.PI);
  return actions[Math.round(angle / step) % actions.length].id;
}

type Props = { open: boolean; disabled: boolean; onOpen: () => void; onLive: () => void; onAction: (action: LuQuickAction) => void };

export function LuOrb({ open, disabled, onOpen, onLive, onAction }: Props) {
  const [wheel, setWheel] = useState(false);
  const [active, setActive] = useState<LuQuickAction | null>(null);
  const [center, setCenter] = useState({ x: 0, y: 0 });
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const held = useRef(false);
  const moved = useRef(false);
  const start = useRef({ x: 0, y: 0 });
  const selected = useRef<LuQuickAction | null>(null);
  const centerRef = useRef(center);
  const actionRef = useRef(onAction);
  actionRef.current = onAction;

  function clearTimer() { if (timer.current) clearTimeout(timer.current); timer.current = null; }
  useEffect(() => () => clearTimer(), []);
  useEffect(() => {
    if (!wheel) return;
    const closeOnEscape = (event: KeyboardEvent) => { if (event.key === 'Escape') { event.stopPropagation(); setWheel(false); setActive(null); } };
    const keepInView = () => { centerRef.current = wheelCenter(); setCenter(centerRef.current); };
    const root = document.documentElement, body = document.body;
    const rootOverflow = root.style.overflow, bodyOverflow = body.style.overflow;
    const rootOverscroll = root.style.overscrollBehaviorY, bodyOverscroll = body.style.overscrollBehaviorY;
    root.style.overflow = body.style.overflow = 'hidden';
    root.style.overscrollBehaviorY = body.style.overscrollBehaviorY = 'none';
    const preventTouchScroll = (event: TouchEvent) => event.preventDefault();
    // Track the original held pointer at window level, as Confessions does.
    const onMove = (event: PointerEvent) => {
      if (!held.current) return;
      if (event.cancelable) event.preventDefault();
      if (Math.hypot(event.clientX - start.current.x, event.clientY - start.current.y) > 12) moved.current = true;
      updateSelection(event.clientX, event.clientY);
    };
    const onEnd = (event: PointerEvent) => {
      if (!held.current) return;
      const action = moved.current ? actionAt(event.clientX, event.clientY, centerRef.current) : null;
      setWheel(false); setActive(null); selected.current = null;
      if (action && !disabled) actionRef.current(action);
      else if (!moved.current && !disabled) onLive();
    };
    const onCancel = () => { setWheel(false); setActive(null); selected.current = null; };
    window.addEventListener('pointermove', onMove, { passive: false });
    window.addEventListener('pointerup', onEnd);
    window.addEventListener('pointercancel', onCancel);
    window.addEventListener('touchmove', preventTouchScroll, { passive: false });
    document.addEventListener('keydown', closeOnEscape);
    window.addEventListener('resize', keepInView);
    return () => { document.removeEventListener('keydown', closeOnEscape); window.removeEventListener('resize', keepInView); window.removeEventListener('touchmove', preventTouchScroll); window.removeEventListener('pointermove', onMove); window.removeEventListener('pointerup', onEnd); window.removeEventListener('pointercancel', onCancel); root.style.overflow = rootOverflow; body.style.overflow = bodyOverflow; root.style.overscrollBehaviorY = rootOverscroll; body.style.overscrollBehaviorY = bodyOverscroll; };
  }, [wheel, disabled, onLive]);

  function openWheel(_x: number, _y: number) {
    window.getSelection()?.removeAllRanges();
    centerRef.current = wheelCenter(); setCenter(centerRef.current);
    selected.current = null; setActive(null); setWheel(true);
  }
  function choose(action: LuQuickAction) {
    if (disabled) return;
    setWheel(false); setActive(null); selected.current = null; onAction(action);
  }
  function updateSelection(x: number, y: number) {
    const next = actionAt(x, y, centerRef.current);
    selected.current = next; setActive(next);
  }
  function pointerDown(event: ReactPointerEvent<HTMLButtonElement>) {
    if (event.button !== 0) return;
    clearTimer(); held.current = false; moved.current = false;
    start.current = { x: event.clientX, y: event.clientY };
    event.currentTarget.setPointerCapture(event.pointerId);
    timer.current = setTimeout(() => { held.current = true; void nativeHaptic(); openWheel(start.current.x, start.current.y); }, 450);
  }
  function pointerMove(event: ReactPointerEvent<HTMLButtonElement>) {
    if (Math.hypot(event.clientX - start.current.x, event.clientY - start.current.y) > 12) moved.current = true;
    if (held.current) updateSelection(event.clientX, event.clientY);
    else if (moved.current) clearTimer();
  }
  return <>
    <button type="button" className="lu-orb-launcher" aria-label="Open Lu. Press and hold for quick actions" aria-haspopup="dialog" aria-expanded={open || wheel}
      onPointerDown={pointerDown} onPointerMove={pointerMove} onPointerUp={clearTimer}
      onPointerCancel={() => { clearTimer(); held.current = false; setWheel(false); }}
      onContextMenu={event => event.preventDefault()}
      onDoubleClick={event => { event.preventDefault(); onLive(); }}
      onClick={() => { if (held.current) { held.current = false; return; } onOpen(); }}>
      <span className="lu-orb-sphere" aria-hidden="true" /><LuEyes />
    </button>
    <button type="button" className="lu-orb-keyboard-actions" onClick={() => openWheel(window.innerWidth / 2, window.innerHeight / 2)}>Open Lu quick actions</button>
    {wheel && createPortal(<div className="lu-wheel-overlay" onContextMenu={event => event.preventDefault()} onPointerDown={event => { if (event.target === event.currentTarget) setWheel(false); }}>
      <div className="lu-wheel" role="dialog" aria-label="Lu quick actions" style={{ left: center.x, top: center.y }}>
        <div className="lu-wheel-rings" aria-hidden="true" /><span className="lu-wheel-orb lu-orb-sphere" aria-hidden="true" /><LuEyes wheel />
        {actions.map(({ id, label, icon: Icon }, index) => {
          const angle = -Math.PI / 2 + index * 2 * Math.PI / actions.length;
          return <button key={id} type="button" disabled={disabled}
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
