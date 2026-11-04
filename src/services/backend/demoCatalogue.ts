import { doc, getDoc, onSnapshot, runTransaction, serverTimestamp, type Firestore, type Unsubscribe, writeBatch } from 'firebase/firestore';
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
  if (manifest.version !== 2 || typeof manifest.label !== 'string' || manifest.label.length < 1 || manifest.label.length > 80 || !Array.isArray(manifest.entryIds) ||
      manifest.entryIds.length > 20 || manifest.entryIds.some(id => typeof id !== 'string' || !/^demo-[a-z0-9-]{1,80}$/.test(id)) ||
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

// Old v1 starter entry IDs that need cleanup
const OLD_V1_ENTRY_IDS = [
  'starter-johannesburg-v1-quiet-start',
  'starter-johannesburg-v1-small-win',
  'starter-johannesburg-v1-saturday-market',
  'starter-johannesburg-v1-room-to-think',
  'starter-johannesburg-v1-end-of-week',
  'starter-johannesburg-v1-juniper-01',
  'starter-johannesburg-v1-juniper-02',
  'starter-johannesburg-v1-juniper-03',
  'starter-johannesburg-v1-lantern-01',
  'starter-johannesburg-v1-lantern-02',
  'starter-johannesburg-v1-river-01',
  'starter-johannesburg-v1-river-02',
  'starter-johannesburg-v1-river-03',
];

/**
 * Copy the shared fictional catalogue into an account's ordinary journal once.
 * The transaction marker makes retries and concurrent sign-ins safe.
 * Handles v1->v2 migration: deletes old v1 entries and seeds new v2 entries.
 * Also cleans up any lingering old v1 entries even if no marker exists.
 */
export async function ensureStarterEntries(uid: string, firestore: Firestore = database): Promise<number> {
  if (typeof uid !== 'string' || !uid.trim() || uid.length > 128 || uid.includes('/')) {
    throw new Error('A valid account is required to load starter entries.');
  }

  const markerRef = doc(firestore, 'users', uid, STARTER_MARKER_COLLECTION, DEMO_CATALOGUE_ID);
  const manifestRef = doc(firestore, 'demoCatalogues', DEMO_CATALOGUE_ID);

  // Pre-transaction: clean up old v1 entries outside the transaction if they exist
  // (Firestore transactions require all reads before all writes)
  const oldEntriesToDelete: string[] = [];
  for (const oldId of OLD_V1_ENTRY_IDS) {
    const oldRef = doc(firestore, 'users', uid, 'entries', oldId);
    const oldSnap = await getDoc(oldRef);
    if (oldSnap.exists()) {
      oldEntriesToDelete.push(oldId);
    }
  }

  return runTransaction(firestore, async transaction => {
    // Firestore requires all reads before all writes in a transaction.
    const markerSnapshot = await transaction.get(markerRef);
    const manifestSnapshot = await transaction.get(manifestRef);
    if (!manifestSnapshot.exists()) throw new Error('The starter catalogue is not available yet.');

    const manifest = parseManifest(manifestSnapshot.data());

    let oldEntryIdsToDelete: string[] = [...oldEntriesToDelete];

    if (markerSnapshot.exists()) {
      const marker = markerSnapshot.data() as Record<string, unknown>;
      const isOldStarterMarker = marker.catalogueId === DEMO_CATALOGUE_ID && marker.version === 1 &&
        Array.isArray(marker.entryIds) && marker.entryIds.length <= 20 &&
        marker.entryIds.every((id: unknown) => typeof id === 'string' && /^starter-johannesburg-v1-[a-z0-9-]{1,80}$/.test(id)) &&
        new Set(marker.entryIds).size === marker.entryIds.length;
      if (isOldStarterMarker) {
        oldEntryIdsToDelete = [...new Set([...oldEntryIdsToDelete, ...(marker.entryIds as string[])])];
      } else if (marker.catalogueId === DEMO_CATALOGUE_ID && marker.version === 2) {
        // Already migrated to v2 — check if ALL new entries actually exist
        const expectedIds = manifest.entryIds.map((id: string) => starterEntryId(id));
        const checkRefs = expectedIds.map((id: string) => doc(firestore, 'users', uid, 'entries', id));
        const checkSnaps = await Promise.all(checkRefs.map(ref => transaction.get(ref)));
        const allExist = checkSnaps.every(snap => snap.exists());
        if (allExist) {
          // All entries present — but still clean up any old v1 entries
          for (const id of oldEntryIdsToDelete) {
            transaction.delete(doc(firestore, 'users', uid, 'entries', id));
          }
          return 0; // Already fully migrated
        }
        // Some entries missing — fall through to re-seed
      } else {
        throw new Error('The starter-entry migration marker is invalid.');
      }
    }
    const sourceRefs = manifest.entryIds.map(id => doc(firestore, 'demoCatalogues', DEMO_CATALOGUE_ID, 'entries', id));
    const sourceSnapshots = await Promise.all(sourceRefs.map(ref => transaction.get(ref)));
    const sourceEntries = sourceSnapshots.map((snapshot, index) => {
      if (!snapshot.exists()) throw new Error('A starter entry listed in the catalogue is missing.');
      const record = snapshot.data() as DemoRecord;
      const mapped = mapDemoRecord(snapshot.id, record);
      return { mapped, targetId: starterEntryId(manifest.entryIds[index]) };
    });
    const targetRefs = sourceEntries.map(entry => doc(firestore, 'users', uid, 'entries', entry.targetId));
    const targetSnapshots = await Promise.all(targetRefs.map(ref => transaction.get(ref)));

    // ALL WRITES AFTER ALL READS
    // Delete old starter entries (v1 -> v2 migration + any lingering old entries)
    for (const id of oldEntryIdsToDelete) {
      transaction.delete(doc(firestore, 'users', uid, 'entries', id));
    }

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
        ...(source.mapped.curatedDeck ? { curatedDeck: source.mapped.curatedDeck } : {}),
        ...(source.mapped.entitiesRecognized?.length ? { entitiesRecognized: source.mapped.entitiesRecognized } : {}),
        ...(source.mapped.demoGuide ? { demoGuide: source.mapped.demoGuide } : {}),
        tags: source.mapped.tags,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      });
      createdCount += 1;
    }
    transaction.set(markerRef, {
      catalogueId: DEMO_CATALOGUE_ID,
      version: 2,
      entryIds,
      completedAt: serverTimestamp(),
    });
    return createdCount;
  });
}