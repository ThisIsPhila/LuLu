import { useState, useRef, useCallback, useEffect } from "react";


export type PullState = "idle" | "pulling" | "ready" | "refreshing";

export interface PullToRefreshOptions {
  enabled?: boolean;
  threshold?: number;
  damping?: number;
  minimumRefreshingMs?: number;
  onThresholdReached?: () => void;
  /** Called synchronously on release, while iOS still grants user activation. */
  onRefreshStart?: () => void;
  onRefresh: () => Promise<void>;
}

export interface PullToRefreshReturn {
  isRefreshing: boolean;
  pullDistance: number;
  state: PullState;
  containerRef: React.RefObject<HTMLDivElement | null>;
}

type InputMode = "pointer" | "touch" | null;

function pointFromTouch(event: TouchEvent): { x: number; y: number } | null {
  const touch = event.touches[0] ?? event.changedTouches[0];
  return touch ? { x: touch.clientX, y: touch.clientY } : null;
}

function pointFromPointer(event: PointerEvent): { x: number; y: number } {
  return { x: event.clientX, y: event.clientY };
}

/**
 * Pull-to-refresh for the scroll containers used by the mobile shell.
 *
 * Both Pointer Events (the current iOS WebView path) and Touch Events (older
 * WebKit) are supported. Listeners are capture-phase and non-passive so a
 * downward gesture at scrollTop 0 can be claimed before WebKit starts its
 * rubber-band scroll. Upward and horizontal gestures are left to the browser.
 */
export function usePullToRefresh(options: PullToRefreshOptions): PullToRefreshReturn {
  const {
    enabled = true,
    onRefresh,
    threshold = 80,
    damping = 0.5,
    minimumRefreshingMs = 900,
    onThresholdReached,
    onRefreshStart,
  } = options;
  const [state, setState] = useState<PullState>("idle");
  const [pullDistance, setPullDistance] = useState(0);
  const containerRef = useRef<HTMLDivElement | null>(null);

  const startY = useRef(0);
  const startX = useRef(0);
  const tracking = useRef(false);
  const pulling = useRef(false);
  const refreshing = useRef(false);
  const pullDistanceRef = useRef(0);
  const inputMode = useRef<InputMode>(null);
  const pointerId = useRef<number | null>(null);
  const thresholdReached = useRef(false);
  const onRefreshRef = useRef(onRefresh);
  const onRefreshStartRef = useRef(onRefreshStart);
  const onThresholdReachedRef = useRef(onThresholdReached);

  useEffect(() => {
    onRefreshRef.current = onRefresh;
    onRefreshStartRef.current = onRefreshStart;
    onThresholdReachedRef.current = onThresholdReached;
  }, [onRefresh, onRefreshStart, onThresholdReached]);

  const getScrollTop = useCallback(() => {
    const element = containerRef.current;
    if (!element) return typeof window !== "undefined" ? window.scrollY : 0;
    if (element.scrollHeight > element.clientHeight + 1) return element.scrollTop;
    return typeof window !== "undefined" ? window.scrollY : 0;
  }, []);

  const resetGesture = useCallback(() => {
    tracking.current = false;
    pulling.current = false;
    inputMode.current = null;
    pointerId.current = null;
    thresholdReached.current = false;
    pullDistanceRef.current = 0;
    setState("idle");
    setPullDistance(0);
  }, []);

  const begin = useCallback(
    (x: number, y: number, mode: Exclude<InputMode, null>, id?: number) => {
      if (!containerRef.current || refreshing.current || getScrollTop() > 1) return;
      tracking.current = true;
      pulling.current = false;
      inputMode.current = mode;
      pointerId.current = id ?? null;
      startX.current = x;
      startY.current = y;
      thresholdReached.current = false;
      pullDistanceRef.current = 0;
    },
    [getScrollTop],
  );

  const move = useCallback(
    (event: TouchEvent | PointerEvent, point: { x: number; y: number }) => {
      if (!tracking.current || refreshing.current || getScrollTop() > 1) return;

      const diffY = point.y - startY.current;
      const diffX = point.x - startX.current;
      if (diffY <= 0 || Math.abs(diffX) > diffY + 4) {
        if (!pulling.current) tracking.current = false;
        return;
      }

      // A small dead-zone avoids stealing ordinary vertical scrolls.
      if (diffY < 6) return;
      pulling.current = true;
      const damped = Math.min(diffY * damping, threshold * 1.8);
      pullDistanceRef.current = damped;
      setPullDistance(damped);
      const ready = damped >= threshold;
      setState(ready ? "ready" : "pulling");
      if (ready && !thresholdReached.current) {
        thresholdReached.current = true;

        onThresholdReachedRef.current?.();
      }
      if (!ready) thresholdReached.current = false;
      if (event.cancelable) event.preventDefault();
    },
    [damping, getScrollTop, threshold],
  );

  const finish = useCallback(() => {
    if (!tracking.current) return;
    const shouldRefresh = pulling.current && pullDistanceRef.current >= threshold;
    tracking.current = false;
    pulling.current = false;
    inputMode.current = null;
    pointerId.current = null;

    if (!shouldRefresh) {
      resetGesture();
      return;
    }

    refreshing.current = true;
    setState("refreshing");
    onRefreshStartRef.current?.();

    void (async () => {
      const startedAt = Date.now();
      try {
        await onRefreshRef.current();
      } catch {
        // The owning page is responsible for its error state/toast. The pull
        // surface must always settle so a failed request cannot trap the UI.
      }
      const remaining = minimumRefreshingMs - (Date.now() - startedAt);
      if (remaining > 0) {
        await new Promise<void>((resolve) => window.setTimeout(resolve, remaining));
      }
      refreshing.current = false;
      resetGesture();
    })();
  }, [minimumRefreshingMs, resetGesture, threshold]);

  useEffect(() => {
    if (!enabled) {
      resetGesture();
      return;
    }

    const element = containerRef.current;
    if (!element) return;

    const onPointerDown = (event: PointerEvent) => {
      if (event.pointerType === "mouse") return;
      if ((event.target as Element | null)?.closest("button, input, textarea, select, [role=dialog], .lulu-guide-root")) return;
      if (inputMode.current && inputMode.current !== "pointer") return;
      begin(event.clientX, event.clientY, "pointer", event.pointerId);
    };
    const onPointerMove = (event: PointerEvent) => {
      if (inputMode.current !== "pointer" || pointerId.current !== event.pointerId) return;
      move(event, pointFromPointer(event));
    };
    const onPointerEnd = (event: PointerEvent) => {
      if (inputMode.current !== "pointer" || pointerId.current !== event.pointerId) return;
      finish();
    };
    const onTouchStart = (event: TouchEvent) => {
      if (inputMode.current || (event.target as Element | null)?.closest("button, input, textarea, select, [role=dialog], .lulu-guide-root")) return;
      const point = pointFromTouch(event);
      if (point) begin(point.x, point.y, "touch");
    };
    const onTouchMove = (event: TouchEvent) => {
      if (inputMode.current !== "touch") return;
      const point = pointFromTouch(event);
      if (point) move(event, point);
    };
    const onTouchEnd = () => {
      if (inputMode.current === "touch") finish();
    };

    element.addEventListener("pointerdown", onPointerDown, { capture: true });
    element.addEventListener("pointermove", onPointerMove, { capture: true, passive: false });
    element.addEventListener("pointerup", onPointerEnd, { capture: true });
    element.addEventListener("pointercancel", onPointerEnd, { capture: true });
    element.addEventListener("touchstart", onTouchStart, { capture: true, passive: true });
    element.addEventListener("touchmove", onTouchMove, { capture: true, passive: false });
    element.addEventListener("touchend", onTouchEnd, { capture: true });
    element.addEventListener("touchcancel", onTouchEnd, { capture: true });

    return () => {
      element.removeEventListener("pointerdown", onPointerDown, { capture: true });
      element.removeEventListener("pointermove", onPointerMove, { capture: true });
      element.removeEventListener("pointerup", onPointerEnd, { capture: true });
      element.removeEventListener("pointercancel", onPointerEnd, { capture: true });
      element.removeEventListener("touchstart", onTouchStart, { capture: true });
      element.removeEventListener("touchmove", onTouchMove, { capture: true });
      element.removeEventListener("touchend", onTouchEnd, { capture: true });
      element.removeEventListener("touchcancel", onTouchEnd, { capture: true });
    };
  }, [begin, enabled, finish, move, resetGesture]);

  return {
    isRefreshing: state === "refreshing",
    pullDistance,
    state,
    containerRef,
  };
}
