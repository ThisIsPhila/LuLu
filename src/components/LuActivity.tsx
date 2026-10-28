import { useEffect, useState } from 'react';
import { ThinkingOrb, type OrbState } from 'thinking-orbs';
import './LuActivity.css';

/** An activity label is shown only while the corresponding operation is active. */
export function LuActivity({ state, label }: { state: OrbState; label: string }) {
  const [paused, setPaused] = useState(() => typeof document !== 'undefined' && document.documentElement.dataset.luluReduceMotion === 'true');
  useEffect(() => {
    const root = document.documentElement;
    const observer = new MutationObserver(() => setPaused(root.dataset.luluReduceMotion === 'true'));
    observer.observe(root, { attributes: true, attributeFilter: ['data-lulu-reduce-motion'] });
    return () => observer.disconnect();
  }, []);
  return <div className="lu-activity" role="status"><ThinkingOrb state={state} size={32} theme="light" color="#69765f" paused={paused} aria-hidden="true" /><span>{label}</span></div>;
}
