# Local journal core integration

The root app's domain and service APIs provide a local-only journal foundation. The independent demo has not changed.

## API

- `loadJournal()` in `src/domain/journal.ts` returns a discriminated `{ ok, value | error }` result. The snapshot is `{ version: 1, entries, entities }`.
- `loadEntries()` and `persistEntries(entries)` remain compatible with existing imports. The latter now returns the storage result; callers should check `ok` before showing success. It preserves the stored entity catalogue.
- `readJournal(storage, defaults)` / `writeJournal(storage, snapshot)` in `src/services/journalStorage.ts` accept an injectable synchronous storage port. The app key remains `lulu.app.entries.v1`; old arrays load and migrate on the next explicit write. An empty array is valid. Unknown versions, invalid records and inaccessible storage return errors and block overwriting.
- `useJournal()` retains `entries`, `error`, `save`, `remove`, and `favorite`; it additionally returns `entities`, `correctAlias`, and `search`. Mutations return a boolean and commit in-memory state only after storage succeeds. Keep drafts open when false is returned.
- `correctAlias(snapshot, entityId, alias)` is pure. It updates the stable catalogue ID and regenerates affected protected bodies from `originalBody`, retaining that original. Ordinary entries and protected entries without a source stay unchanged. Aliases and corrections persist together with entries in one write when used through the hook. This is a global representation correction, not an identity merge or per-mention reassignment.
- `searchJournal(snapshot, query, { protectedAccess, entityId })` and the hook's `search` support text plus stable entity-ID filters. Original text participates only with explicit protected access. The flag expresses UI state; it is not an authentication boundary. Query text is not persisted or logged.

## App wiring for the UI owner

`src/App.tsx` currently owns separate entries/entities state, auto-persists entries in an effect, and announces save success without checking storage. Replace that state and persistence effect with `useJournal()` when coordinating the shell integration. Route entry saves, deletion and favourites through its boolean-returning methods. Render `error` visibly and leave the editor open after failed saves. Route alias updates through `correctAlias`; pass `entities` to existing component props. Use `search(query, { protectedAccess: protectedMode, entityId })` for the library rather than its current hard-coded person/source filter. Clear original-result and selected-entry state on protected exit.

Custom entity creation still requires a coordinated hook method and editor wiring; do not maintain a second unsaved catalogue in App. Source titles are not captured by today's Entry shape, so corrections only regenerate bodies. Use source title plus explicit revision/mention contracts in the next slice rather than guessing original titles from aliases.

The default `npm test` command still targets the original transform test file. Run all core tests with `node --experimental-strip-types --test src/domain/*.test.ts`; updating the package script is a coordinated manifest edit.

## Limits

Storage is plaintext browser localStorage, including source text and mappings; it is not encrypted or suitable as production protected storage. Passkey UI remains simulated. No provider, backend, cloud sync, recovery or AI integration was added. Session flags do not enforce cryptographic access control. Reading corrupt storage returns no records in the legacy `loadEntries` facade, but saving cannot overwrite the corrupt bytes; use `loadJournal` or the hook to surface the error.

The synchronous snapshot supports one active editing instance. Multiple tabs or hook instances can overwrite stale snapshots; cross-tab conflict handling is next work. There is no immutable revision/audit history, evidence authenticity guarantee or per-mention correction. Corrections regenerate deterministic text, not a previously handcrafted narrative. The recogniser is still a finite catalogue with Unicode word boundaries and longest-match overlap resolution, not contextual AI. The existing limited pronoun heuristic remains.
