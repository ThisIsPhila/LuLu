import { useEffect, useRef } from 'react';
import { edgeSwipeDirection, isCompletedEdgeSwipe, type SwipeDirection } from './edgeSwipe';

/** Navigate between stable screens. Editing and private screens retain their own exit guards. */
const screens = new Set(['home', 'leaves', 'stories', 'library', 'settings', 'model-settings']);
type Screen = 'home' | 'leaves' | 'stories' | 'library' | 'settings' | 'model-settings';
const isScreen = (view: string): view is Screen => screens.has(view);
const hasPendingEditor = () => Boolean(document.querySelector('.library-item-form, dialog[open], [role="dialog"]')) ||
  Array.from(document.querySelectorAll<HTMLInputElement>('.account-linking-form input')).some(input => input.value.length > 0);

export function useEdgeSwipeNavigation(view: string, navigate: (view: Screen) => void) {
  const history = useRef<{ entries: Screen[]; index: number }>({ entries: ['home'], index: 0 });
  const viewRef = useRef(view);
  const navigateRef = useRef(navigate);
  viewRef.current = view;
  navigateRef.current = navigate;

  useEffect(() => {
    if (!isScreen(view)) return;
    const stack = history.current;
    if (stack.entries[stack.index] === view) return;
    if (stack.index > 0 && stack.entries[stack.index - 1] === view) stack.index--;
    else if (stack.entries[stack.index + 1] === view) stack.index++;
    else { stack.entries = [...stack.entries.slice(0, stack.index + 1), view].slice(-40); stack.index = stack.entries.length - 1; }
  }, [view]);

  useEffect(() => {
    let start: { x: number; y: number; direction: SwipeDirection; claimed: boolean } | null = null;
    const onStart = (event: TouchEvent) => {
      if (event.touches.length !== 1 || !isScreen(viewRef.current) || hasPendingEditor()) return;
      const target = event.target;
      if (target instanceof Element && target.closest('input, textarea, select, [contenteditable="true"]')) return;
      const point = event.touches[0];
      const width = document.documentElement.clientWidth;
      const stack = history.current;
      const direction = edgeSwipeDirection(point.clientX, width, stack.index, stack.entries.length);
      if (!direction) return;
      start = { x: point.clientX, y: point.clientY, direction, claimed: false };
    };
    const onMove = (event: TouchEvent) => {
      if (!start || event.touches.length !== 1) { start = null; return; }
      const dx = event.touches[0].clientX - start.x, dy = event.touches[0].clientY - start.y;
      if (Math.abs(dy) > 30 && Math.abs(dy) > Math.abs(dx)) { start = null; return; }
      if (dx * -start.direction > 35 && Math.abs(dx) > Math.abs(dy) * 1.5) start.claimed = true;
      if (start.claimed && event.cancelable) event.preventDefault();
    };
    const onEnd = (event: TouchEvent) => {
      if (!start || event.changedTouches.length !== 1) { start = null; return; }
      const dx = event.changedTouches[0].clientX - start.x, dy = event.changedTouches[0].clientY - start.y;
      const direction = start.direction;
      const valid = start.claimed && isCompletedEdgeSwipe(direction, dx, dy);
      start = null;
      if (!valid || !isScreen(viewRef.current) || hasPendingEditor()) return;
      const stack = history.current, next = stack.index + direction;
      if (next < 0 || next >= stack.entries.length) return;
      stack.index = next;
      navigateRef.current(stack.entries[next]);
    };
    const cancel = () => { start = null; };
    document.addEventListener('touchstart', onStart, { passive: true });
    document.addEventListener('touchmove', onMove, { passive: false });
    document.addEventListener('touchend', onEnd, { passive: true });
    document.addEventListener('touchcancel', cancel, { passive: true });
    return () => { document.removeEventListener('touchstart', onStart); document.removeEventListener('touchmove', onMove); document.removeEventListener('touchend', onEnd); document.removeEventListener('touchcancel', cancel); };
  }, []);
}
