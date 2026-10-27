const storageKey = 'lulu.pending-judge-invitation.v1';
const tokenPattern = /^[A-Za-z0-9_-]{43}$/;
let fallbackToken = '';

/** URL fragments never reach the web server; remove the token from the visible URL immediately. */
export function captureJudgeInvitation(): void {
  const params = new URLSearchParams(window.location.hash.slice(1));
  if (!params.has('judge')) return;
  const token = params.get('judge') ?? '';
  params.delete('judge');
  const remaining = params.toString();
  window.history.replaceState(window.history.state, '', `${window.location.pathname}${window.location.search}${remaining ? `#${remaining}` : ''}`);
  if (!tokenPattern.test(token)) { clearJudgeInvitation(); return; }
  fallbackToken = token;
  try { sessionStorage.setItem(storageKey, token); } catch { /* Keep it in this tab's memory. */ }
}

export function pendingJudgeInvitation(): string {
  try {
    const token = sessionStorage.getItem(storageKey) ?? fallbackToken;
    return tokenPattern.test(token) ? token : '';
  } catch { return tokenPattern.test(fallbackToken) ? fallbackToken : ''; }
}

export function clearJudgeInvitation(): void {
  fallbackToken = '';
  try { sessionStorage.removeItem(storageKey); } catch { /* Nothing else to clear. */ }
}
