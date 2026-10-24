import { useEffect, useState } from 'react';

/** Keep the composing surface inside the visible viewport when a mobile keyboard opens. */
export function useWritingViewport() {
  const [viewport, setViewport] = useState({ height: window.innerHeight, top: 0 });
  useEffect(() => {
    const visible = window.visualViewport;
    const update = () => setViewport({ height: visible?.height ?? window.innerHeight, top: visible?.offsetTop ?? 0 });
    update();
    visible?.addEventListener('resize', update);
    visible?.addEventListener('scroll', update);
    window.addEventListener('resize', update);
    return () => {
      visible?.removeEventListener('resize', update);
      visible?.removeEventListener('scroll', update);
      window.removeEventListener('resize', update);
    };
  }, []);
  return viewport;
}
