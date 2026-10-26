import { initializeApp } from 'firebase/app';
import { getAuth, indexedDBLocalPersistence, inMemoryPersistence, setPersistence } from 'firebase/auth';
import { getFirestore } from 'firebase/firestore';
import { isNativePlatform } from '../../platform/runtime';

// Public application identifiers, never server credentials.
const app = initializeApp({
  projectId: 'khora-lulu-2026',
  appId: '1:687182197240:web:c4068518eef4197621660d',
  apiKey: 'AIzaSyBtU_gaCzLeiDODfUlww5wkC8LH_VGP1F4',
  authDomain: 'khora-lulu-2026.firebaseapp.com',
});
export const auth = getAuth(app);
// The native shell must retain the verified Firebase session across a process
// restart so the owner can reopen their account-owned Firestore journal.
// Keep the web application's existing in-memory behavior unchanged.
export const authReady = setPersistence(auth, isNativePlatform() ? indexedDBLocalPersistence : inMemoryPersistence)
  .catch(() => setPersistence(auth, inMemoryPersistence));
export const database = getFirestore(app); // Memory cache; private records never use disk cache.
