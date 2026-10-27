import { initializeApp } from 'firebase/app';
import { browserLocalPersistence, getAuth, indexedDBLocalPersistence, initializeAuth, inMemoryPersistence, setPersistence } from 'firebase/auth';
import { getFirestore } from 'firebase/firestore';
import { getPlatform, isNativePlatform } from '../../platform/runtime.ts';

// Public application identifiers, never server credentials.
const app = initializeApp({
  projectId: 'khora-lulu-2026',
  appId: '1:687182197240:web:c4068518eef4197621660d',
  apiKey: 'AIzaSyBtU_gaCzLeiDODfUlww5wkC8LH_VGP1F4',
  // The app and hosted native-auth bridge run on web.app. Keep Firebase's
  // redirect helper on this same Hosting origin to follow the established
  // Capacitor redirect pattern and avoid cross-site browser storage.
  authDomain: 'khora-lulu-2026.web.app',
});
const native = isNativePlatform();
// Explicit native initialization avoids the browser popup/redirect iframe.
// WKWebView's IndexedDB auth-persistence probe can stall before the first auth
// state arrives. Use localStorage on iOS, as in the Confessions native shell.
// This stores Firebase's session in WebView storage; it is not Keychain storage
// and does not change the separate encrypted journal/draft stores.
export const auth = native ? initializeAuth(app, {
  persistence: [getPlatform() === 'ios' ? browserLocalPersistence : indexedDBLocalPersistence, inMemoryPersistence],
}) : getAuth(app);
// Web auth survives reloads on this origin so the app can validate and restore
// an existing LuLu session. Native persistence remains platform-specific above.
export const authReady = native ? auth.authStateReady() : setPersistence(auth, browserLocalPersistence);
export const database = getFirestore(app); // Memory cache; private records never use disk cache.
