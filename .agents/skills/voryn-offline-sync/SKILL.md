---
name: voryn-offline-sync
description: Diagnose or change Voryn offline workout and health records, pending queues, reconnection, account isolation, or local/remote merge conflicts. Use when records disappear, duplicate, remain pending, or cross account boundaries.
---

# Voryn offline records

Trace the affected record from UI to local storage, queue, authenticated request, database policy, and merge. Inspect only the relevant subsystem; a health-queue fix does not justify rewriting workout persistence.

## Code map

- Workout queue and flush: `offlineSyncService`, `workoutLogService.create`, and `syncPendingWorkouts` in `src/services/index.js`; startup/reconnection in `src/components/layout/AppShell.jsx`.
- Health queue: `src/services/healthOffline.js`; manual CRUD/merge in `src/services/healthRecords.js`; refresh and lifecycle in `src/hooks/useHealthData.js`.
- Session and user changes: `src/context/AuthContext.jsx`.
- Calendar keys: `localDateKey()` and `localDateStart()` in `src/utils/helpers.js`.

## Invariants to preserve

- Health storage is scoped by user; workout queue entries carry `userId`. Only flush records belonging to the authenticated owner. Test switching accounts while an operation is in flight.
- A successful old request must not acknowledge a newer edit. Health pending entries use operation tokens, and remote merging uses a revision to protect changes made during a read.
- Pending deletions must not be resurrected by stale remote data. Retry operations without creating duplicate records; preserve stable record identifiers where the storage contract requires them.
- Local persistence failure must not be reported as a saved record. Inspect quota/corrupted JSON and queue-cap behavior if the symptom involves lost entries; do not silently clear all storage to fix it.
- Offline display requires an accessible session/cache. Do not promise that initial login or profile recovery works without network merely because a queue works offline.
- Use the user's local calendar for daily records; do not derive a day with UTC `toISOString().split('T')[0]`.

## Validation by failure mode

Reproduce with synthetic records and controlled network failures. Cover the boundary implicated by the change: create/edit/delete offline, reload, reconnect, expired session, rejected write, failed request retry, edit during flush, or account switch. Distinguish `navigator.onLine` from a successful authenticated request.

Relevant existing tests: `src/__tests__/offlineSync.test.js`, `healthOffline.test.js`, `healthRecords.test.js`, `authLoading.test.jsx`, and `helpers.test.js`. Run focused Vitest tests using the project's installed version. For UI/service-worker behavior, exercise a browser flow and inspect the pending state; mocks alone do not prove device persistence.

Report what remained local, what synchronized, and any unverified server-policy or device behavior. Avoid production data changes or destructive storage resets unless specifically authorized.
