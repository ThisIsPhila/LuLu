import type { LocalVaultDraft, LocalVaultRevision, LocalVaultDraftTarget } from './vault/localVault.ts';

/** The narrow storage surface required by the autosave coordinator. */
export interface PrivateDraftStore {
  saveDraft(input: {
    draftId: string;
    expectedVersion: number | null;
    content: unknown;
    target?: LocalVaultDraftTarget;
  }): Promise<LocalVaultDraft>;
  getDraft(draftId: string): Promise<LocalVaultDraft | null>;
  listDrafts(): Promise<LocalVaultDraft[]>;
  finalizeDraft(input: {
    draftId: string;
    expectedVersion: number;
    recordId?: string;
    revisionId?: string;
  }): Promise<LocalVaultRevision>;
  getRevision?(recordId: string, revisionId: string): Promise<LocalVaultRevision | null>;
}

export type PrivateDraftSaveStatus =
  | { state: 'idle'; draftId: string; version: number | null }
  | { state: 'saving'; draftId: string; version: number | null }
  | { state: 'saved'; draftId: string; version: number | null }
  | { state: 'error'; draftId: string; version: number | null; stage: 'draft' | 'record'; kind: PrivateDraftErrorKind; message: string; retryable: boolean }
  | { state: 'finalizing'; draftId: string; version: number | null }
  | { state: 'finalized'; draftId: string; version: number | null }
  | { state: 'stopped'; draftId: string; version: number | null };

export type PrivateDraftErrorKind = 'quota' | 'security' | 'unavailable' | 'conflict' | 'locked' | 'invalid';
type PrivateDraftStatusUpdate =
  | { state: 'idle' | 'saving' | 'saved' | 'finalizing' | 'finalized' | 'stopped' }
  | { state: 'error'; stage: 'draft' | 'record'; kind: PrivateDraftErrorKind; message: string; retryable: boolean };

export interface PrivateDraftAutosaveOptions {
  vault: PrivateDraftStore;
  draftId: string;
  /** Optional account binding for acknowledgement validation. */
  ownerId?: string;
  /** null creates a draft; a positive version resumes a draft already loaded by the caller. */
  expectedVersion: number | null;
  /** Existing draft content, if resuming. This value is copied on construction. */
  initialContent?: unknown;
  target?: LocalVaultDraftTarget;
  onStatus?: (status: PrivateDraftSaveStatus) => void;
}

export interface PrivateDraftFinalizeOptions {
  recordId?: string;
  revisionId?: string;
}

export interface PrivateDraftAutosaveController {
  /** Accept an exact snapshot. Every accepted edit starts or joins a serialized save. */
  acceptSnapshot(content: unknown): void;
  /** Wait until the latest accepted snapshot has an encrypted-storage acknowledgement. */
  flush(): Promise<void>;
  /** Retry the latest retained snapshot after retryable storage failures. */
  retry(): Promise<void>;
  /** Persist the latest snapshot, then atomically ask the vault to create/append its record. */
  finalize(options?: PrivateDraftFinalizeOptions): Promise<LocalVaultRevision>;
  /** Forget plaintext references and suppress all future callbacks and vault operations. */
  stop(): void;
  get status(): PrivateDraftSaveStatus;
}

type Waiter = { sequence: number; resolve: () => void; reject: (error: Error) => void };
type Snapshot = { sequence: number; content: unknown };
type FinalizationAttempt = { recordId: string; revisionId: string; expectedVersion: number; content: unknown; kind: 'original' | 'derived'; parentRevisionId: string | null };

/** Copy data-only JSON values without invoking accessors or custom toJSON hooks. */
function copyPlainJson(value: unknown, ancestors = new Set<object>()): unknown {
  if (value === null || typeof value === 'string' || typeof value === 'boolean') return value;
  if (typeof value === 'number') {
    if (!Number.isFinite(value) || Object.is(value, -0)) throw new TypeError('Draft content must contain lossless JSON values.');
    return value;
  }
  if (typeof value !== 'object') throw new TypeError('Draft content must contain only plain JSON values.');
  if (ancestors.has(value)) throw new TypeError('Draft content must not contain circular references.');
  const prototype = Object.getPrototypeOf(value);
  if (Array.isArray(value)) {
    if (prototype !== Array.prototype) throw new TypeError('Draft content must contain plain JSON arrays.');
    ancestors.add(value);
    const keys = Reflect.ownKeys(value);
    const result: unknown[] = [];
    for (let index = 0; index < value.length; index += 1) {
      if (!Object.prototype.hasOwnProperty.call(value, index)) throw new TypeError('Draft content must not contain sparse arrays.');
      const descriptor = Object.getOwnPropertyDescriptor(value, String(index));
      if (!descriptor?.enumerable || !('value' in descriptor)) throw new TypeError('Draft content must not contain accessors.');
      result.push(copyPlainJson(descriptor.value, ancestors));
    }
    if (keys.some((key) => typeof key === 'symbol' || (key !== 'length' && !/^(0|[1-9]\d*)$/.test(key)))) {
      throw new TypeError('Draft content must not contain extra array properties.');
    }
    ancestors.delete(value);
    return result;
  }
  if (prototype !== Object.prototype && prototype !== null) throw new TypeError('Draft content must contain plain JSON objects.');
  ancestors.add(value);
  const result: Record<string, unknown> = {};
  for (const key of Reflect.ownKeys(value)) {
    if (typeof key === 'symbol') throw new TypeError('Draft content must not contain symbol properties.');
    const descriptor = Object.getOwnPropertyDescriptor(value, key);
    if (!descriptor?.enumerable || !('value' in descriptor)) throw new TypeError('Draft content must not contain accessors.');
    Object.defineProperty(result, key, { value: copyPlainJson(descriptor.value, ancestors), enumerable: true, writable: true, configurable: true });
  }
  ancestors.delete(value);
  return result;
}

function canonicalJson(value: unknown): string {
  if (Array.isArray(value)) return `[${value.map(canonicalJson).join(',')}]`;
  if (value && typeof value === 'object') {
    const object = value as Record<string, unknown>;
    return `{${Object.keys(object).sort().map((key) => `${JSON.stringify(key)}:${canonicalJson(object[key])}`).join(',')}}`;
  }
  return JSON.stringify(value);
}

function matchesFinalization(
  revision: LocalVaultRevision,
  attempt: FinalizationAttempt,
  expectedOwnerId: string | undefined,
): boolean {
  try {
    return revision.recordId === attempt.recordId && revision.revisionId === attempt.revisionId &&
      (expectedOwnerId === undefined || revision.ownerId === expectedOwnerId) &&
      revision.kind === attempt.kind && revision.parentRevisionId === attempt.parentRevisionId &&
      (attempt.kind === 'derived' ? revision.provenance === null : revision.provenance === 'user-authored') &&
      canonicalJson(copyPlainJson(revision.content)) === canonicalJson(attempt.content);
  } catch {
    return false;
  }
}

/**
 * In-memory write coordinator for an encrypted LocalVault draft. It deliberately
 * has no debounce: edits start a write immediately, with one writer and only the
 * newest pending snapshot retained. A vault call already in progress is governed
 * by LocalVault's own session-generation check; stop prevents any subsequent call.
 */
export function createPrivateDraftAutosave(options: PrivateDraftAutosaveOptions): PrivateDraftAutosaveController {
  const { vault, draftId } = options;
  const expectedOwnerId = options.ownerId;
  if (!draftId || draftId.trim() !== draftId) throw new TypeError('A private draft identifier is required.');
  if (options.expectedVersion !== null && (!Number.isSafeInteger(options.expectedVersion) || options.expectedVersion < 1)) {
    throw new TypeError('A resumed private draft must have a valid version.');
  }

  let expectedVersion = options.expectedVersion;
  let status: PrivateDraftSaveStatus = { state: 'idle', draftId, version: expectedVersion };
  let latest: Snapshot | null = null;
  let latestSequence = 0;
  let savedSequence = 0;
  let waiters: Waiter[] = [];
  let worker: Promise<void> | null = null;
  let stopped = false;
  let finalizing = false;
  let finalized = false;
  let finalizationAttempt: FinalizationAttempt | null = null;
  let retryableError = false;
  let validationCanClearOnEdit = false;
  let invalidLatestSnapshot = false;
  let lastError: Error | null = null;
  let target = options.target ? { ...options.target } : undefined;
  let observer = options.onStatus ?? null;

  function publish(next: PrivateDraftStatusUpdate): void {
    if (stopped) return;
    const withMetadata = { ...next, draftId, version: expectedVersion } as PrivateDraftSaveStatus;
    status = withMetadata;
    try { observer?.(withMetadata); } catch { /* UI observers cannot interrupt storage coordination. */ }
  }

  function safeError(error: unknown): { kind: PrivateDraftErrorKind; message: string; retryable: boolean } {
    const name = error instanceof Error ? error.name : '';
    if (name === 'LocalVaultLockedError' || name === 'NotAllowedError') {
      return { kind: 'locked', message: 'Private writing is locked. Unlock it again to continue saving.', retryable: false };
    }
    if (name === 'LocalVaultConflictError' || name === 'ConflictError') {
      return { kind: 'conflict', message: 'This draft changed elsewhere. Reopen it before saving more changes.', retryable: false };
    }
    if (name === 'QuotaExceededError') {
      return { kind: 'quota', message: 'This device is low on storage. Free space, then retry saving.', retryable: true };
    }
    if (name === 'SecurityError') {
      return { kind: 'security', message: 'Private storage is unavailable in this browser context.', retryable: false };
    }
    if (name === 'InvalidStateError' || name === 'NotFoundError' || name === 'UnknownError' || name === 'AbortError') {
      return { kind: 'unavailable', message: 'Private storage could not finish saving. Retry when it is available.', retryable: true };
    }
    if (error instanceof TypeError || error instanceof RangeError) {
      return { kind: 'invalid', message: 'This draft could not be saved in its current form.', retryable: false };
    }
    if (name === 'PrivateDraftValidationError') {
      return { kind: 'invalid', message: error instanceof Error ? error.message : 'Write some text before saving this private record.', retryable: false };
    }
    return { kind: 'unavailable', message: 'Private storage could not finish saving. Retry when it is available.', retryable: true };
  }

  function settleThrough(sequence: number): void {
    const resolved = waiters.filter((item) => item.sequence <= sequence);
    waiters = waiters.filter((item) => item.sequence > sequence);
    for (const item of resolved) item.resolve();
  }

  function rejectWaiters(error: Error): void {
    const pending = waiters;
    waiters = [];
    for (const item of pending) item.reject(error);
  }

  async function runWorker(): Promise<void> {
    while (!stopped && !finalized && savedSequence < latestSequence && latest) {
      const snapshot = latest;
      publish({ state: 'saving' });
      try {
        const saved = await vault.saveDraft({
          draftId,
          expectedVersion,
          content: snapshot.content,
          ...(target ? { target } : {}),
        });
        if (stopped) return;
        const expectedAcknowledgedVersion = (expectedVersion ?? 0) + 1;
        if (saved.draftId !== draftId || (expectedOwnerId !== undefined && saved.ownerId !== expectedOwnerId) ||
            !Number.isSafeInteger(saved.version) || saved.version !== expectedAcknowledgedVersion) {
          throw new Error('Draft storage returned an invalid acknowledgement.');
        }
        expectedVersion = saved.version;
        savedSequence = snapshot.sequence;
        settleThrough(savedSequence);
        if (savedSequence === latestSequence) publish({ state: 'saved' });
      } catch (error) {
        if (stopped) return;
        const classified = safeError(error);
        lastError = new Error(classified.message);
        retryableError = classified.retryable;
        rejectWaiters(lastError);
        publish({ state: 'error', stage: 'draft', ...classified });
        return;
      }
    }
  }

  function startWorker(): void {
    if (stopped || finalized || worker || !latest || savedSequence >= latestSequence) return;
    worker = runWorker().finally(() => {
      worker = null;
      if (!stopped && !finalized && savedSequence < latestSequence && status.state !== 'error') startWorker();
    });
  }

  function acceptSnapshot(content: unknown): void {
    if (stopped || finalized || finalizing) return;
    // Snapshot to break references to mutable editor/UI objects while preserving all text bytes.
    let copy: unknown;
    try {
      copy = copyPlainJson(content);
    } catch {
      const preserveBlockingError = status.state === 'error' && status.stage === 'draft' && status.kind !== 'invalid' && !validationCanClearOnEdit;
      if (!preserveBlockingError) {
        lastError = new Error('This draft could not be saved in its current form.');
        retryableError = false;
      }
      invalidLatestSnapshot = true;
      latestSequence += 1;
      latest = null;
      if (!preserveBlockingError) {
        publish({ state: 'error', stage: 'draft', kind: 'invalid', message: lastError!.message, retryable: false });
      }
      rejectWaiters(lastError ?? new Error('This draft could not be saved in its current form.'));
      return;
    }
    const clearsInvalidSnapshotError = invalidLatestSnapshot && status.state === 'error' && status.kind === 'invalid';
    const clearsRecordError = status.state === 'error' && status.stage === 'record';
    const hadError = status.state === 'error' && status.stage === 'draft' && !validationCanClearOnEdit && !clearsInvalidSnapshotError;
    latestSequence += 1;
    latest = { sequence: latestSequence, content: copy };
    if (validationCanClearOnEdit || clearsInvalidSnapshotError || clearsRecordError) {
      validationCanClearOnEdit = false;
      lastError = null;
      retryableError = false;
      finalizationAttempt = null;
      publish({ state: 'idle' });
    }
    invalidLatestSnapshot = false;
    if (!hadError) {
      lastError = null;
      retryableError = false;
      startWorker();
    }
  }

  function flush(): Promise<void> {
    if (stopped) return Promise.reject(new Error('Private draft autosave has stopped.'));
    if (finalized) return Promise.resolve();
    if (invalidLatestSnapshot) return Promise.reject(lastError ?? new Error('This draft could not be saved in its current form.'));
    if (savedSequence >= latestSequence) return Promise.resolve();
    if (status.state === 'error') return Promise.reject(lastError ?? new Error(status.message));
    const sequence = latestSequence;
    const promise = new Promise<void>((resolve, reject) => waiters.push({ sequence, resolve, reject }));
    startWorker();
    return promise;
  }

  async function retry(): Promise<void> {
    if (stopped) throw new Error('Private draft autosave has stopped.');
    if (finalized) return;
    if (status.state === 'error' && status.stage === 'record') throw new Error('Retry saving the private record instead of the draft.');
    if (invalidLatestSnapshot) throw lastError ?? new Error('This draft could not be saved in its current form.');
    if (savedSequence >= latestSequence) return;
    if (status.state === 'error' && !retryableError) throw lastError ?? new Error(status.message);
    lastError = null;
    retryableError = false;
    status = { state: 'idle', draftId, version: expectedVersion };
    const pending = new Promise<void>((resolve, reject) => waiters.push({ sequence: latestSequence, resolve, reject }));
    startWorker();
    await pending;
  }

  async function finalize(finalizeOptions: PrivateDraftFinalizeOptions = {}): Promise<LocalVaultRevision> {
    if (stopped) throw new Error('Private draft autosave has stopped.');
    if (finalized) throw new Error('This private draft has already been finalized.');
    if (finalizing) throw new Error('Private draft finalization is already in progress.');
    // Freeze caller overrides and stable identities before flush yields to storage.
    const requestedRecordId = finalizeOptions.recordId;
    const requestedRevisionId = finalizeOptions.revisionId;
    const targetAtRequest = target ? { ...target } : undefined;
    const stableRecordId = requestedRecordId ?? targetAtRequest?.recordId ?? draftId;
    finalizing = true;
    try {
      await flush();
      if (stopped) throw new Error('Private draft autosave has stopped.');
      const content = latest?.content as { body?: unknown } | undefined;
      if (!content || typeof content.body !== 'string' || !content.body.trim()) {
        finalizing = false;
        const validationError = new Error('Write some text before saving this private record.');
        validationError.name = 'PrivateDraftValidationError';
        validationCanClearOnEdit = true;
        throw validationError;
      }
      if (expectedVersion === null) throw new Error('The private draft has not been saved yet.');
      publish({ state: 'finalizing' });
      const currentSnapshot = latest;
      if (!currentSnapshot) throw new Error('The private draft has no saved snapshot.');
      const contentSnapshot = copyPlainJson(currentSnapshot.content);
      finalizationAttempt ??= {
        recordId: stableRecordId,
        revisionId: requestedRevisionId ?? (targetAtRequest ? `${draftId}:v${expectedVersion}` : draftId),
        expectedVersion,
        content: contentSnapshot,
        kind: targetAtRequest ? 'derived' : 'original',
        parentRevisionId: targetAtRequest?.parentRevisionId ?? null,
      };
      const attempt = finalizationAttempt;
      let revision: LocalVaultRevision;
      try {
        revision = await vault.finalizeDraft({
          draftId,
          expectedVersion: attempt.expectedVersion,
          recordId: attempt.recordId,
          revisionId: attempt.revisionId,
        });
      } catch (writeError) {
        if (stopped) throw new Error('Private draft autosave has stopped.');
        let existing: LocalVaultRevision | null = null;
        if (vault.getRevision) {
          try { existing = await vault.getRevision(attempt.recordId, attempt.revisionId); }
          catch (lookupError) {
            if (lookupError instanceof Error && lookupError.name === 'LocalVaultLockedError') throw lookupError;
          }
        }
        if (stopped) throw new Error('Private draft autosave has stopped.');
        if (!existing || !matchesFinalization(existing, attempt, expectedOwnerId)) throw writeError;
        revision = existing;
      }
      if (stopped) throw new Error('Private draft autosave has stopped.');
      finalized = true;
      latest = null;
      target = undefined;
      finalizationAttempt = null;
      lastError = null;
      validationCanClearOnEdit = false;
      publish({ state: 'finalized' });
      return revision;
    } catch (error) {
      const generationLocked = error instanceof Error && error.name === 'LocalVaultLockedError';
      if (!stopped && !generationLocked && !finalized) {
        finalizing = false;
        if (status.state !== 'error' || status.stage === 'record') {
          const classified = safeError(error);
          lastError = new Error(classified.message);
          retryableError = classified.retryable;
          publish({ state: 'error', stage: 'record', ...classified });
        }
      }
      if (stopped) throw new Error('Private draft autosave has stopped.');
      if (generationLocked) throw error;
      if (error instanceof Error && error.name === 'PrivateDraftValidationError') throw error;
      if (status.state === 'error' && status.stage === 'draft') throw lastError ?? new Error(status.message);
      throw new Error(safeError(error).message);
    }
  }

  function stop(): void {
    if (stopped) return;
    stopped = true;
    latest = null;
    target = undefined;
    finalizationAttempt = null;
    lastError = null;
    observer = null;
    rejectWaiters(new Error('Private draft autosave has stopped.'));
    waiters = [];
    status = { state: 'stopped', draftId, version: expectedVersion };
  }

  if (options.initialContent !== undefined) {
    if (expectedVersion === null) throw new TypeError('Existing private draft content requires its saved version.');
    let copy: unknown;
    try { copy = copyPlainJson(options.initialContent); }
    catch { throw new TypeError('Existing private draft content is invalid.'); }
    latest = { sequence: 0, content: copy };
    latestSequence = 0;
    savedSequence = 0;
    status = { state: 'saved', draftId, version: expectedVersion };
  }

  return {
    acceptSnapshot,
    flush,
    retry,
    finalize,
    stop,
    get status() { return status; },
  };
}

