import { auth, authReady } from '../backend/firebase';
import { backendEndpoint } from '../backend/request';
import { createReviewedTextRequest, parseCloudProcessingCapability, parseCloudUnderstandingResult, type CloudProcessingCapability, type CloudUnderstandingResult } from './cloudProcessingContracts';
import { parsePatternAssessment, type PatternAssessment } from './patternIntelligenceContracts';
export type { CloudProcessingCapability, CloudUnderstandingResult } from './cloudProcessingContracts';

function errorMessage(body: unknown, fallback: string): string {
  if (body && typeof body === 'object' && 'error' in body && typeof body.error === 'string') return body.error;
  return fallback;
}

async function authenticatedRequest<T>(path: string, body: unknown, signal?: AbortSignal, authorityStillActive?: () => boolean): Promise<T> {
  await authReady;
  if (signal?.aborted) throw new DOMException('Cloud request was cancelled.', 'AbortError');
  const user = auth.currentUser;
  if (!user) throw new Error('Sign in to LuLu before using cloud interpretation.');
  const token = await user.getIdToken();
  if (signal?.aborted) throw new DOMException('Cloud request was cancelled.', 'AbortError');
  if (auth.currentUser?.uid !== user.uid || (authorityStillActive && !authorityStillActive())) {
    throw new Error('Private processing or account session changed before the cloud request. Unlock and review again.');
  }
  const controller = new AbortController();
  let timedOut = false;
  const onAbort = () => controller.abort(signal?.reason);
  if (signal?.aborted) onAbort();
  else signal?.addEventListener('abort', onAbort, { once: true });
  const timeout = window.setTimeout(() => { timedOut = true; controller.abort(); }, 30_000);
  try {
    const response = await fetch(`${backendEndpoint}${path}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
      body: JSON.stringify(body),
      cache: 'no-store',
      signal: controller.signal,
    });
    const result: unknown = await response.json().catch(() => ({}));
    if (signal?.aborted) throw new DOMException('Cloud request was cancelled.', 'AbortError');
    if (auth.currentUser?.uid !== user.uid || (authorityStillActive && !authorityStillActive())) {
      throw new Error('Private processing or account session ended before the result arrived. No result was shown.');
    }
    if (!response.ok) throw new Error(errorMessage(result, `Cloud request failed (${response.status}).`));
    return result as T;
  } catch (error) {
    if (timedOut) throw new Error('Cloud interpretation timed out. Your reviewed text was not saved by LuLu; check the service and try again.');
    throw error;
  } finally {
    window.clearTimeout(timeout);
    signal?.removeEventListener('abort', onAbort);
  }
}

export function getCloudProcessingCapability(signal?: AbortSignal): Promise<CloudProcessingCapability> {
  return authenticatedRequest<unknown>('/privacy/capability', {}, signal).then(parseCloudProcessingCapability);
}

async function sha256Hex(value: string): Promise<string> {
  if (!globalThis.crypto?.subtle) throw new Error('This browser cannot securely prepare the reviewed text for cloud interpretation.');
  const bytes = new TextEncoder().encode(value);
  const digest = await globalThis.crypto.subtle.digest('SHA-256', bytes);
  return [...new Uint8Array(digest)].map(byte => byte.toString(16).padStart(2, '0')).join('');
}

export async function understandReviewedText(input: {
  text: string;
  revision: string;
  purpose: string;
  isPrivateSessionActive: () => boolean;
  signal?: AbortSignal;
}): Promise<CloudUnderstandingResult> {
  if (!input.isPrivateSessionActive()) throw new Error('Unlock private processing with your passkey before using cloud interpretation.');
  if (!input.text.trim() || input.revision.length < 1 || input.revision.length > 128 || !input.purpose.trim() || input.purpose.length > 200) {
    throw new Error('Review text, revision and purpose do not meet the cloud request limits.');
  }
  const capability = await getCloudProcessingCapability(input.signal);
  if (!input.isPrivateSessionActive()) throw new Error('Private processing locked before the cloud request. Unlock again to continue.');
  if (!capability.enabled || (capability.provider !== 'openai_responses' && capability.provider !== 'openai_decisions')) {
    throw new Error('Cloud interpretation is not configured for this LuLu service.');
  }
  if (input.text.length > capability.maxCharacters) {
    throw new Error(`Reviewed text exceeds the ${capability.maxCharacters.toLocaleString()} character cloud limit.`);
  }
  const sha256 = await sha256Hex(input.text);
  if (input.signal?.aborted) throw new DOMException('Cloud request was cancelled.', 'AbortError');
  if (!input.isPrivateSessionActive()) throw new Error('Private processing locked before the cloud request. Unlock again to continue.');
  const result = await authenticatedRequest<unknown>('/privacy/understand', createReviewedTextRequest({
    text: input.text,
    revision: input.revision,
    sha256,
    purpose: input.purpose,
  }), input.signal, input.isPrivateSessionActive);
  return parseCloudUnderstandingResult(result, { revision: input.revision, sha256, purpose: input.purpose });
}

export async function assessReviewedPatterns(input: {
  text: string;
  revision: string;
  purpose: string;
  isAccountSessionActive: () => boolean;
  signal?: AbortSignal;
}): Promise<PatternAssessment> {
  if (!input.isAccountSessionActive()) throw new Error('Sign in to LuLu before assessing patterns.');
  if (!input.text.trim() || input.text.length > 4_000 || input.revision.length < 1 || input.revision.length > 128 || !input.purpose.trim() || input.purpose.length > 200) {
    throw new Error('Reviewed text, revision and purpose do not meet the assessment limits.');
  }
  const capability = await getCloudProcessingCapability(input.signal);
  if (!input.isAccountSessionActive()) throw new Error('Your LuLu account session ended before the request. Sign in again to continue.');
  if (!capability.enabled || capability.provider !== 'openai_decisions') {
    throw new Error('Pattern understanding is not configured for OpenAI Decisions.');
  }
  if (input.text.length > capability.maxCharacters) throw new Error(`Reviewed text exceeds the ${capability.maxCharacters.toLocaleString()} character limit.`);
  const sha256 = await sha256Hex(input.text);
  if (input.signal?.aborted) throw new DOMException('Cloud request was cancelled.', 'AbortError');
  if (!input.isAccountSessionActive()) throw new Error('Your LuLu account session ended before the request. Sign in again to continue.');
  const result = await authenticatedRequest<unknown>('/privacy/patterns', createReviewedTextRequest({text:input.text,revision:input.revision,sha256,purpose:input.purpose}), input.signal, input.isAccountSessionActive);
  return parsePatternAssessment(result,{revision:input.revision,sha256,purpose:input.purpose});
}
