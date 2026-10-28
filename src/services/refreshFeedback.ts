let audio: HTMLAudioElement | null = null;
export function prepareRefreshFeedback() {
  try { audio ??= new Audio('/sounds/refresh-complete.wav'); audio.load(); } catch { /* Audio is optional when unsupported. */ }
}
export async function playRefreshFeedback() {
  try { if (audio) {audio.currentTime = 0; await audio.play();} } catch { /* The browser may require sound permission. */ }
  navigator.vibrate?.(25);
}
