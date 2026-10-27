export const browserOrigins = new Set(['https://khora-lulu-2026.web.app', 'https://khora-lulu-2026.firebaseapp.com', 'https://lulu.thisisphila.co.za', 'http://localhost:5173', 'http://127.0.0.1:5173']);
export const nativeOrigins = new Set(['capacitor://localhost', 'https://localhost']);

// Native shells redeem a hosted authentication result, then use authenticated
// session routes. WebAuthn ceremonies must still originate in the hosted browser.
const nativeRoutes = new Set([
  '/auth/provider/session', '/session', '/auth/lock', '/auth/logout', '/owner/account-activity', '/lu/scrub', '/lu/chat',
  '/native/exchange/create', '/native/exchange/redeem', '/native/exchange/cancel',
]);

export function isAllowedApiOrigin(origin: string, route: string): boolean {
  return browserOrigins.has(origin) || (nativeOrigins.has(origin) && nativeRoutes.has(route));
}
