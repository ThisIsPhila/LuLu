import { doc, getDoc, onSnapshot, runTransaction, serverTimestamp, type Firestore, type Unsubscribe } from 'firebase/firestore';
import type { Entry } from '../../domain/journal';
import { database } from './firebase.ts';
import { mapDemoRecord, type DemoRecord } from './demoCatalogueRecords.ts';

export const DEMO_CATALOGUE_ID = 'johannesburg-v1';

type DemoManifest = { version: number; label: string; entryIds: string[] };

const STARTER_MARKER_COLLECTION = 'starterCatalogues';

function starterEntryId(sourceId: string) {
  return `starter-${DEMO_CATALOGUE_ID}-${sourceId.slice('demo-'.length)}`;
}

function parseManifest(value: unknown): DemoManifest {
  if (!value || typeof value !== 'object') throw new Error('The sample catalogue manifest is invalid.');
  const manifest = value as Partial<DemoManifest>;
  if (manifest.version !== 1 || typeof manifest.label !== 'string' || manifest.label.length < 1 || manifest.label.length > 80 || !Array.isArray(manifest.entryIds) ||
      manifest.entryIds.length > 10 || manifest.entryIds.some(id => typeof id !== 'string' || !/^demo-[a-z0-9-]{1,80}$/.test(id)) ||
      new Set(manifest.entryIds).size !== manifest.entryIds.length) {
    throw new Error('The sample catalogue manifest is invalid.');
  }
  return manifest as DemoManifest;
}

/** Subscribe to the shared fictional catalogue. It is separate from users/{uid}/entries. */
export function watchDemoEntries(receive: (entries: Entry[]) => void, fail: (error: Error) => void): Unsubscribe {
  let closed = false;
  let generation = 0;
  const manifest = doc(database, 'demoCatalogues', DEMO_CATALOGUE_ID);
  const stop = onSnapshot(manifest, snapshot => {
    const currentGeneration = ++generation;
    try {
      if (!snapshot.exists()) throw new Error('The sample catalogue is not available yet.');
      const parsed = parseManifest(snapshot.data());
      void Promise.all(parsed.entryIds.map(async id => {
        const record = await getDoc(doc(database, 'demoCatalogues', DEMO_CATALOGUE_ID, 'entries', id));
        if (!record.exists()) throw new Error('A sample entry listed in the catalogue is missing.');
        return mapDemoRecord(record.id, record.data() as DemoRecord);
      })).then(entries => {
        if (!closed && currentGeneration === generation) receive(entries);
      }).catch(error => {
        if (!closed && currentGeneration === generation) fail(error instanceof Error ? error : new Error('The sample catalogue could not be read.'));
      });
    } catch (error) {
      fail(error instanceof Error ? error : new Error('The sample catalogue could not be read.'));
    }
  }, fail);
  return () => { closed = true; generation += 1; stop(); };
}

/**
 * Copy the shared fictional catalogue into an account's ordinary journal once.
 * The transaction marker makes retries and concurrent sign-ins safe: existing
 * user entries are never replaced, and later deletions are never reseeded.
 */
export async function ensureStarterEntries(uid: string, firestore: Firestore = database): Promise<number> {
  if (typeof uid !== 'string' || !uid.trim() || uid.length > 128 || uid.includes('/')) {
    throw new Error('A valid account is required to load starter entries.');
  }

  const markerRef = doc(firestore, 'users', uid, STARTER_MARKER_COLLECTION, DEMO_CATALOGUE_ID);
  const manifestRef = doc(firestore, 'demoCatalogues', DEMO_CATALOGUE_ID);

  return runTransaction(firestore, async transaction => {
    const markerSnapshot = await transaction.get(markerRef);
    if (markerSnapshot.exists()) {
      const marker = markerSnapshot.data();
      const markerKeys = Object.keys(marker).sort();
      const expectedKeys = ['catalogueId', 'completedAt', 'entryIds', 'version'];
      if (markerKeys.length !== expectedKeys.length || markerKeys.some((key, index) => key !== expectedKeys[index]) ||
          marker.catalogueId !== DEMO_CATALOGUE_ID || marker.version !== 1 ||
          !Array.isArray(marker.entryIds) || marker.entryIds.length > 10 ||
          marker.entryIds.some((id: unknown) => typeof id !== 'string' || !/^starter-johannesburg-v1-[a-z0-9-]{1,80}$/.test(id)) ||
          new Set(marker.entryIds).size !== marker.entryIds.length ||
          !(marker.completedAt?.toDate?.() instanceof Date)) {
        throw new Error('The starter-entry migration marker is invalid.');
      }
      return 0;
    }

    const manifestSnapshot = await transaction.get(manifestRef);
    if (!manifestSnapshot.exists()) throw new Error('The starter catalogue is not available yet.');
    const manifest = parseManifest(manifestSnapshot.data());
    const sourceRefs = manifest.entryIds.map(id => doc(firestore, 'demoCatalogues', DEMO_CATALOGUE_ID, 'entries', id));
    const sourceSnapshots = await Promise.all(sourceRefs.map(ref => transaction.get(ref)));
    const sourceEntries = sourceSnapshots.map((snapshot, index) => {
      if (!snapshot.exists()) throw new Error('A starter entry listed in the catalogue is missing.');
      const record = snapshot.data() as DemoRecord;
      // Reuse the strict public-catalogue validator before copying any fields.
      const mapped = mapDemoRecord(snapshot.id, record);
      return { mapped, targetId: starterEntryId(manifest.entryIds[index]) };
    });
    const targetRefs = sourceEntries.map(entry => doc(firestore, 'users', uid, 'entries', entry.targetId));
    const targetSnapshots = await Promise.all(targetRefs.map(ref => transaction.get(ref)));

    const entryIds: string[] = [];
    let createdCount = 0;
    for (let index = 0; index < sourceEntries.length; index += 1) {
      const source = sourceEntries[index];
      const target = targetSnapshots[index];
      entryIds.push(source.targetId);
      if (target.exists()) continue;
      transaction.set(targetRefs[index], {
        ownerId: uid,
        title: source.mapped.title,
        body: source.mapped.body,
        kind: source.mapped.kind,
        protected: false,
        perspective: source.mapped.perspective ?? 'first',
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      });
      createdCount += 1;
    }
    transaction.set(markerRef, {
      catalogueId: DEMO_CATALOGUE_ID,
      version: 1,
      entryIds,
      completedAt: serverTimestamp(),
    });
    return createdCount;
  });
}
