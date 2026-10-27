export type AudioCaptureState = 'idle' | 'requesting' | 'recording' | 'stopping' | 'captured' | 'cancelled' | 'error';

export interface AudioCaptureStatus {
  state: AudioCaptureState;
  /** A short, content-free message suitable for a status region. */
  message?: string;
}

export interface AudioCaptureMetadata {
  durationMs: number;
  mimeType: string;
}

export interface AudioCaptureOptions {
  /** Injected to keep permission acquisition under the caller's explicit start action. */
  getUserMedia?: (constraints: MediaStreamConstraints) => Promise<MediaStream>;
  MediaRecorder?: typeof MediaRecorder;
  now?: () => number;
  setTimeout?: typeof globalThis.setTimeout;
  clearTimeout?: typeof globalThis.clearTimeout;
  onState?: (status: AudioCaptureStatus) => void;
  onCaptured?: (blob: Blob, metadata: AudioCaptureMetadata) => void;
  onStream?: (stream: MediaStream) => void;
  /** Test/host override. Values above the privacy limits are clamped. */
  maxBytes?: number;
  maxDurationMs?: number;
}

export interface AudioCaptureController {
  start(): Promise<void>;
  stop(): void;
  /** Use for lock/unmount/abandon. Discards all captured bytes. */
  cancel(): void;
  getState(): AudioCaptureState;
}

const DEFAULT_MAX_BYTES = 25 * 1024 * 1024;
const DEFAULT_MAX_DURATION_MS = 60_000;
const MIME_PREFERENCES = [
  'audio/webm;codecs=opus',
  'audio/webm',
  'audio/ogg;codecs=opus',
  'audio/ogg',
  'audio/mp4;codecs=mp4a.40.2',
  'audio/mp4',
] as const;

type RecorderLike = Pick<MediaRecorder, 'start' | 'stop' | 'state' | 'mimeType'> & {
  ondataavailable: ((event: BlobEvent) => void) | null;
  onstop: ((event: Event) => void) | null;
  onerror: ((event: Event) => void) | null;
};

type RecorderConstructor = {
  new (stream: MediaStream, options?: MediaRecorderOptions): RecorderLike;
  isTypeSupported?: (type: string) => boolean;
};

function contentFreePermissionMessage(error: unknown): string {
  const name = (error as { name?: unknown } | null)?.name;
  if (name === 'NotAllowedError' || name === 'PermissionDeniedError' || name === 'SecurityError') {
    return 'Microphone access was denied. Allow microphone access in browser settings and try again.';
  }
  if (name === 'NotFoundError' || name === 'DevicesNotFoundError') {
    return 'No microphone was found. Connect a microphone and try again.';
  }
  return 'Microphone capture is unavailable. Check browser support and try again.';
}

function safeCall(callback: (() => void) | undefined): void {
  try {
    callback?.();
  } catch {
    // Consumer callbacks must not prevent microphone/timer cleanup.
  }
}

function stopTracks(stream: MediaStream | null): void {
  if (!stream) return;
  for (const track of stream.getTracks()) {
    try {
      track.stop();
    } catch {
      // Continue stopping remaining tracks if a browser track is already closed.
    }
  }
}

function clampLimit(value: number | undefined, maximum: number, fallback: number): number {
  if (value === undefined || !Number.isFinite(value) || value <= 0) return fallback;
  return Math.min(Math.floor(value), maximum);
}

export function createAudioCapture(options: AudioCaptureOptions = {}): AudioCaptureController {
  const now = options.now ?? (() => globalThis.performance?.now() ?? Date.now());
  const schedule = options.setTimeout ?? globalThis.setTimeout.bind(globalThis);
  const unschedule = options.clearTimeout ?? globalThis.clearTimeout.bind(globalThis);
  const maxBytes = clampLimit(options.maxBytes, DEFAULT_MAX_BYTES, DEFAULT_MAX_BYTES);
  const maxDurationMs = clampLimit(options.maxDurationMs, DEFAULT_MAX_DURATION_MS, DEFAULT_MAX_DURATION_MS);

  let state: AudioCaptureState = 'idle';
  let operation = 0;
  let stream: MediaStream | null = null;
  let recorder: RecorderLike | null = null;
  let chunks: Blob[] = [];
  let chunkBytes = 0;
  let startedAt = 0;
  let actualMimeType = '';
  let timer: ReturnType<typeof globalThis.setTimeout> | null = null;
  let completionSent = false;

  const currentState = (): AudioCaptureState => state;

  const update = (next: AudioCaptureState, message?: string): void => {
    state = next;
    safeCall(() => options.onState?.({ state: next, ...(message ? { message } : {}) }));
  };

  const clearTimer = (): void => {
    if (timer !== null) {
      unschedule(timer);
      timer = null;
    }
  };

  const releaseStream = (): void => {
    stopTracks(stream);
    stream = null;
  };

  const clearBytes = (): void => {
    chunks = [];
    chunkBytes = 0;
  };

  const clearRecorderHandlers = (target: RecorderLike | null): void => {
    if (!target) return;
    target.ondataavailable = null;
    target.onstop = null;
    target.onerror = null;
  };

  const fail = (message: string, op: number, shouldStopRecorder = true): void => {
    if (op !== operation) return;
    clearTimer();
    clearBytes();
    completionSent = true;
    const activeRecorder = recorder;
    recorder = null;
    clearRecorderHandlers(activeRecorder);
    if (shouldStopRecorder && activeRecorder && activeRecorder.state !== 'inactive') {
      try {
        activeRecorder.stop();
      } catch {
        // A recorder may already have stopped after its error event.
      }
    }
    releaseStream();
    update('error', message);
  };

  const stopForOperation = (op: number): void => {
    if (op !== operation || state !== 'recording') return;
    clearTimer();
    update('stopping');
    const activeRecorder = recorder;
    if (!activeRecorder) {
      fail('Recording could not be completed. Please try again.', op, false);
      return;
    }
    try {
      if (activeRecorder.state !== 'inactive') activeRecorder.stop();
    } catch {
      fail('Recording could not be completed. Please try again.', op, false);
      return;
    }
    // stop() queues its final dataavailable and stop events; release the input now.
    releaseStream();
  };

  const chooseRecorder = (constructor: RecorderConstructor, input: MediaStream): RecorderLike => {
    const type = MIME_PREFERENCES.find((candidate) => {
      try {
        return constructor.isTypeSupported?.(candidate) === true;
      } catch {
        return false;
      }
    });
    if (!type) return new constructor(input);
    try {
      return new constructor(input, { mimeType: type });
    } catch {
      // Some implementations report a type as supported but reject it at construction.
      return new constructor(input);
    }
  };

  const start = async (): Promise<void> => {
    if (state === 'requesting' || state === 'recording' || state === 'stopping') return;

    const op = ++operation;
    clearTimer();
    clearBytes();
    completionSent = false;
    recorder = null;
    stream = null;
    actualMimeType = '';
    update('requesting');

    const getUserMedia = options.getUserMedia ?? (() => {
      const devices = globalThis.navigator?.mediaDevices;
      if (!devices?.getUserMedia) throw new Error('unavailable');
      return devices.getUserMedia({ audio: true });
    });
    let acquired: MediaStream;
    try {
      acquired = await getUserMedia({ audio: true });
    } catch (error) {
      if (op === operation) fail(contentFreePermissionMessage(error), op, false);
      return;
    }

    // Permission prompts cannot be aborted consistently. A resolved stale stream must
    // be closed immediately and must never attach recorder callbacks.
    if (op !== operation || currentState() !== 'requesting') {
      stopTracks(acquired);
      return;
    }
    stream = acquired;

    const constructor = (options.MediaRecorder ?? globalThis.MediaRecorder) as unknown as RecorderConstructor | undefined;
    if (!constructor) {
      fail('Audio recording is not supported by this browser.', op, false);
      return;
    }

    try {
      recorder = chooseRecorder(constructor, acquired);
    } catch {
      fail('This browser cannot record audio in a supported format. Try a current browser.', op, false);
      return;
    }

    const activeRecorder = recorder;
    actualMimeType = activeRecorder.mimeType || '';
    startedAt = now();
    activeRecorder.ondataavailable = (event): void => {
      if (op !== operation || completionSent || state === 'cancelled' || state === 'error') return;
      const data = event.data;
      if (!data || data.size === 0) return;
      if (chunkBytes + data.size > maxBytes) {
        fail('The recording exceeded its size limit and was discarded. Record a shorter clip and try again.', op);
        return;
      }
      chunks.push(data);
      chunkBytes += data.size;
      if (!actualMimeType) actualMimeType = data.type || '';
    };
    activeRecorder.onerror = (): void => {
      fail('Audio recording stopped because of a browser error. Please try again.', op);
    };
    activeRecorder.onstop = (): void => {
      if (op !== operation || completionSent || state === 'cancelled' || state === 'error') return;
      clearTimer();
      releaseStream();
      const durationMs = Math.max(0, Math.round(now() - startedAt));
      const blob = new Blob(chunks, actualMimeType ? { type: actualMimeType } : undefined);
      clearBytes();
      recorder = null;
      completionSent = true;
      if (blob.size === 0) {
        update('error', 'No audio was captured. Check your microphone and try again.');
        return;
      }
      update('captured');
      safeCall(() => options.onCaptured?.(blob, { durationMs, mimeType: actualMimeType || blob.type }));
    };

    try {
      activeRecorder.start();
    } catch {
      fail('Audio recording could not start. Check microphone access and try again.', op);
      return;
    }
    startedAt = now();
    update('recording');
    safeCall(() => options.onStream?.(acquired));
    timer = schedule(() => stopForOperation(op), maxDurationMs);
  };

  const stop = (): void => {
    if (state === 'requesting') {
      // A user stop while the permission prompt is open acts as an abandon operation.
      operation += 1;
      clearTimer();
      clearBytes();
      completionSent = true;
      update('cancelled');
      return;
    }
    if (state !== 'recording') return;
    stopForOperation(operation);
  };

  const cancel = (): void => {
    operation += 1;
    clearTimer();
    clearBytes();
    completionSent = true;
    const activeRecorder = recorder;
    recorder = null;
    clearRecorderHandlers(activeRecorder);
    if (activeRecorder && activeRecorder.state !== 'inactive') {
      try {
        activeRecorder.stop();
      } catch {
        // Stop may race a browser-generated recorder shutdown.
      }
    }
    releaseStream();
    update('cancelled');
  };

  return { start, stop, cancel, getState: () => state };
}
