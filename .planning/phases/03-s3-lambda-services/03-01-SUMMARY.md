---
phase: 03-s3-lambda-services
plan: 01
subsystem: web/services/s3/api
status: complete
completed: 2026-04-17
tags: [s3, api, xml-parser, upload, download, validation, tdd]
dependency_graph:
  requires:
    - phase 1 (shared/api/client.ts, shared/api/xml.ts, ky 1.14.3, vitest 3.2.4)
    - phase 2 (EC2 test harness pattern, MSW setup)
  provides:
    - s3Client (path-style REST: s3Get, s3Put, s3Delete, s3PostDelete, s3GetResponse, s3Head, encodeS3Key, AUTHORIZATION)
    - parseS3Xml (parseBuckets, parseObjects, parseTagging, parseErrorXml)
    - validateBucketName (sync 7-rule validator)
    - uploadClient (uploadObject + uploadBatch with concurrency cap 3)
    - downloadClient (downloadObject with Blob + 60s revoke)
    - S3 shared types (S3Bucket, S3ObjectEntry, ListObjectsResult, S3ObjectMetadata, S3Tag)
  affects:
    - web/src/shared/types.ts (extended with 5 S3 types)
tech-stack:
  added: []
  patterns:
    - XHR-wrapped uploads for progress + cancel (fetch can't be trusted cross-browser)
    - FakeXHR test double for deterministic lifecycle assertions
    - Per-segment encodeURIComponent to preserve slashes in object keys
    - Fake timers to verify delayed cleanup (60s revokeObjectURL)
key-files:
  created:
    - web/src/services/s3/api/s3Client.ts
    - web/src/services/s3/api/s3Client.test.ts
    - web/src/services/s3/api/parseS3Xml.ts
    - web/src/services/s3/api/parseS3Xml.test.ts
    - web/src/services/s3/api/validateBucketName.ts
    - web/src/services/s3/api/validateBucketName.test.ts
    - web/src/services/s3/api/uploadClient.ts
    - web/src/services/s3/api/uploadClient.test.ts
    - web/src/services/s3/api/downloadClient.ts
    - web/src/services/s3/api/downloadClient.test.ts
    - web/src/services/s3/__tests__/fixtures.ts
  modified:
    - web/src/shared/types.ts
decisions:
  - "FakeXHR class over vi.stubGlobal + partial mock — gives fine-grained control over progress/load/abort order and mirrors how real XHR wiring is tested in other projects"
  - "uploadBatch uses a worker-pool pattern (N workers pull from a shared queue) rather than Promise.all with a semaphore — simpler to reason about, fewer moving parts, preserves input order in results[] by index assignment"
  - "parseErrorXml returns null when Code/Message both absent so callers can distinguish 'this is an Error XML' from 'this is an unrelated error-shaped document'"
metrics:
  duration_min: 10
  completed_date: 2026-04-17
  tasks_total: 2
  tasks_completed: 2
  tests_total: 43
  tests_passing: 43
  files_created: 11
  files_modified: 1
requirements: [S3-01, S3-02, S3-03, S3-04]
---

# Phase 3 Plan 1: S3 API Primitives Summary

**One-liner:** Path-style S3 REST client + XML parsers + 7-rule bucket-name validator + XHR-based upload pool + Blob-based download, all built on browser-native APIs with zero new npm dependencies.

## What shipped

Lowest-layer S3 stack — every higher plan (02 bucket CRUD, 03 object browser, 04 upload UX, 05 detail panel) imports from these modules.

### `s3Client.ts`
Path-style HTTP helpers over the shared `apiClient` (ky). Injects a dummy SigV4 `Authorization` header (MiniStack doesn't verify signatures; presence is sometimes required). Exports:

- `s3Get(path, searchParams?) → Promise<string>` — XML responses
- `s3GetResponse(path, searchParams?) → Promise<Response>` — raw Response for binary / header inspection
- `s3Head(path) → Promise<Response>` — uses native `fetch` (HEAD via ky is flaky)
- `s3Put(path, body?, headers?) → Promise<void>`
- `s3Delete(path, searchParams?) → Promise<void>` — supports `?tagging`, `?delete`
- `s3PostDelete(path, xml) → Promise<string>` — DeleteObjects batch endpoint
- `encodeS3Key(key)` — splits on `/`, `encodeURIComponent` each segment, rejoins (Pitfall 1)
- `AUTHORIZATION` constant

URL resolution resolves against `window.location.origin` so ky/undici in jsdom doesn't reject bare `/` paths (same pattern as `ec2Client.ts`).

### `parseS3Xml.ts`
- `parseBuckets(xml) → S3Bucket[]` — `ListAllMyBucketsResult`
- `parseObjects(xml) → ListObjectsResult` — folders (CommonPrefixes) come FIRST in `entries`, then files (Contents). Surfaces `isTruncated`, `nextContinuationToken`, `keyCount` per D-03, Pitfall 4.
- `parseTagging(xml) → S3Tag[]`
- `parseErrorXml(xml) → { code, message } | null` — used to surface BucketNotEmpty (D-12, Pitfall 12)

### `validateBucketName.ts`
Synchronous 7-rule validator. Returns `null` on valid, or the exact user-facing error copy from UI-SPEC §"Create Bucket Modal Copy". Rules checked in fixed order: length min → length max → uppercase → invalid chars → hyphen edges → consecutive dots → IP-shape.

### `uploadClient.ts`
- `uploadObject(params) → UploadHandle` — raw XHR with `upload.addEventListener('progress')`, rejects with `{ cancelled: true }` on abort, rejects with status+body on non-2xx, rejects with "Network error" on transport failure. Fallback Content-Type to `application/octet-stream` when `file.type` is empty.
- `uploadBatch(items, onItemStart?, concurrency=3) → Promise<BatchResult[]>` — worker-pool (N workers pulling from a shared cursor), preserves input order in `results[]`. Never throws; each item yields success / failure / cancelled.

### `downloadClient.ts`
- `downloadObject(bucket, key) → Promise<void>` — fetch → Blob → synthetic `<a download>` click → schedule `URL.revokeObjectURL` 60s later (Pitfall 7). Throws on non-2xx. Per-segment key encoding.

### `shared/types.ts` (extended)
Added `S3Bucket`, `S3ObjectEntry` (discriminated union `folder | file`), `ListObjectsResult`, `S3ObjectMetadata`, `S3Tag`.

### `__tests__/fixtures.ts`
`S3_FIXTURES` with 8 XML strings: `listBucketsEmpty`, `listBucketsTwo`, `listObjectsRoot`, `listObjectsNested`, `listObjectsTruncated`, `taggingEmpty`, `taggingWithTags`, `errorBucketNotEmpty`. All include the canonical `xmlns="http://s3.amazonaws.com/doc/2006-03-01/"` namespace.

## Tests

43 real tests across 5 files. All green under vitest 3.2.4 + jsdom.

| File | Tests | Focus |
|------|-------|-------|
| validateBucketName.test.ts | 8 | All 7 failure rules + valid cases |
| parseS3Xml.test.ts | 10 | Folders-before-files ordering, truncation, empty TagSet, error docs |
| s3Client.test.ts | 12 | URL resolution, Authorization header, searchParams, encodeS3Key, HTTP verbs, ?delete POST |
| uploadClient.test.ts | 8 | Progress events, cancel → cancelled=true, 500 error surfacing, concurrency cap 3, mixed results |
| downloadClient.test.ts | 5 | Basename download attr, 60000ms revoke via fake timers, non-2xx throws, per-segment encoding |

```
Test Files  5 passed (5)
     Tests  43 passed (43)
```

## Verification commands run

| Command | Result |
|---------|--------|
| `cd web && npm run test -- src/services/s3/api --run` | 5 files, 43 tests, 0 failures |
| `npx tsc --noEmit -p web` | 0 errors |
| `grep -rn dangerouslySetInnerHTML web/src/services/s3/` | no matches (T-3-01-05) |

## Deviations from Plan

### Auto-fixed issues

**1. [Rule 3 - Blocker] Plan 00 stub files were not applied to this worktree branch**
- **Found during:** Pre-Task 1 scan
- **Issue:** Plan 01 text says "replace `test.todo()` entries in Plan 00 stubs". The worktree base (792afc9) did not include Plan 00 commits, so no stubs existed. Plan 00 was documented in 03-00-PLAN.md but never executed on any branch.
- **Fix:** Created test files directly as real tests (not as stubs first then converted). Also created a minimal `web/src/services/s3/__tests__/fixtures.ts` with the subset of `S3_FIXTURES` keys that Plan 01 tests reference (`listBucketsEmpty`, `listBucketsTwo`, `listObjectsRoot`, `listObjectsNested`, `listObjectsTruncated`, `taggingEmpty`, `taggingWithTags`, `errorBucketNotEmpty`). Plan 00 can extend this file later with the additional fixtures it needs (e.g. `deleteObjectsSuccess`, `deleteObjectsPartial`).
- **Files modified:** `web/src/services/s3/__tests__/fixtures.ts` (created)
- **Commit:** `d2b62cc`
- **Acceptance criterion impact:** The criterion "`grep -c test\.todo` in three test files returns 0 total" is satisfied — all tests are real assertions, no todos remain.

**2. [Rule 3 - Blocker] node_modules missing in worktree**
- **Found during:** First vitest invocation
- **Issue:** Fresh git worktree had no `web/node_modules/`, so `vitest` binary wasn't on PATH.
- **Fix:** Symlinked `web/node_modules` to the main repo's `web/node_modules`. Symlink is gitignored and was removed before final commit — no impact on tree state.
- **Files modified:** none (symlink, then removed)

### Tool-level adjustments, not plan deviations

- Used `export async function uploadBatch` (not `export function`). The acceptance-criteria grep `export function uploadBatch|export const uploadBatch` matches 0 because `async` is between `export` and `function`. The function is exported and works — this is a regex wording nit, not a missing export.

## Threat model check

Disposition `mitigate` items from `<threat_model>` implemented:

- **T-3-01-01** (Tampering / validation): 8 tests cover every named rule + valid cases.
- **T-3-01-02** (Tampering / key encoding): per-segment encoding tested with space + unicode in both upload and download clients.
- **T-3-01-03** (Info Disclosure / Blob URL): 60_000ms revoke timer verified with fake timers (exactly at 60_000ms, not 59_999ms).
- **T-3-01-04** (Self-DoS / concurrency): worker-pool test asserts `maxInFlight <= 3` with 6 items.
- **T-3-01-05** (XSS via error): no `dangerouslySetInnerHTML` introduced — grep verified.

## Known Stubs

None. Every exported function is fully implemented. `s3GetResponse` and `s3Head` are exposed for Plans 02/05 consumers (HEAD metadata fetch, binary body access) but are already functional.

## Threat Flags

None — Plan 01 stays within the threat surface enumerated in its `<threat_model>`.

## Self-Check: PASSED

Files exist:
- `FOUND: web/src/services/s3/api/s3Client.ts`
- `FOUND: web/src/services/s3/api/parseS3Xml.ts`
- `FOUND: web/src/services/s3/api/validateBucketName.ts`
- `FOUND: web/src/services/s3/api/uploadClient.ts`
- `FOUND: web/src/services/s3/api/downloadClient.ts`
- `FOUND: web/src/services/s3/__tests__/fixtures.ts`
- `FOUND: web/src/shared/types.ts` (extended)

Commits exist on branch:
- `FOUND: d2b62cc feat(03-01): S3 REST client, XML parsers, bucket-name validator`
- `FOUND: e227118 feat(03-01): S3 XHR upload client + Blob download client`
