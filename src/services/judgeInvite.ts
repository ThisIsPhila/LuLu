const storageKey = 'lulu.pending-judge-invitation.v1';
const reusableStorageKey = 'lulu.reusable-judge-invitation.v1';
const tokenPattern = /^[A-Za-z0-9_-]{43}$/;
let fallbackPendingToken = '';
let fallbackReusableToken = '';

/** URL fragments never reach the web server; remove the token from the visible URL immediately. */
export function captureJudgeInvitation(): void {
  const params = new URLSearchParams(window.location.hash.slice(1));
  if (!params.has('judge')) return;
  const token = params.get('judge') ?? '';
  params.delete('judge');
  const remaining = params.toString();
  window.history.replaceState(window.history.state, '', `${window.location.pathname}${window.location.search}${remaining ? `#${remaining}` : ''}`);
  if (!tokenPattern.test(token)) { clearJudgeInvitation(); return; }
  fallbackPendingToken = fallbackReusableToken = token;
  try { sessionStorage.setItem(storageKey, token); } catch { /* Keep it in this tab's memory. */ }
  try { sessionStorage.setItem(reusableStorageKey, token); } catch { /* Keep the refill link in memory if storage is unavailable. */ }
}

export function pendingJudgeInvitation(): string {
  try {
    const token = sessionStorage.getItem(storageKey) ?? fallbackPendingToken;
    return tokenPattern.test(token) ? token : '';
  } catch { return tokenPattern.test(fallbackPendingToken) ? fallbackPendingToken : ''; }
}

/** Keep the shared invite for this tab so a judge can request a refill later. */
export function reusableJudgeInvitation(): string {
  try {
    const token=sessionStorage.getItem(reusableStorageKey)??fallbackReusableToken;
    return tokenPattern.test(token)?token:'';
  } catch { return tokenPattern.test(fallbackReusableToken)?fallbackReusableToken:''; }
}

/** Clear only the sign-in prompt state; keep the reusable refill link. */
export function clearJudgeInvitation(): void {
  fallbackPendingToken = '';
  try { sessionStorage.removeItem(storageKey); } catch { /* Nothing else to clear. */ }
}

export function forgetReusableJudgeInvitation(): void {
  fallbackReusableToken='';
  try { sessionStorage.removeItem(reusableStorageKey); } catch { /* Nothing else to clear. */ }
}
