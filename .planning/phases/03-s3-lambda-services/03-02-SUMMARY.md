---
phase: 03-s3-lambda-services
plan: 02
subsystem: web/services/s3/api
status: complete
completed: 2026-04-17
tags: [s3, tanstack-query, hooks, mutations, cache-invalidation, tdd]
dependency_graph:
  requires:
    - phase 3 plan 01 (s3Client, parseS3Xml, shared S3 types)
    - phase 3 plan 00 (MSW s3Handlers, S3_FIXTURES)
    - @tanstack/react-query 5.96.2
  provides:
    - useBuckets hook (ListBuckets, queryKey ['s3','buckets'])
    - useObjects hook + objectsQueryKey builder (ListObjectsV2, continuation-token pagination, placeholderData)
    - useObjectMetadata hook (HEAD, x-amz-meta-* prefix stripped)
    - useObjectTags hook (GetObjectTagging)
    - useCreateBucket mutation (PUT /{name}, invalidates ['s3','buckets'])
    - useDeleteBucket mutation + BucketNotEmptyError typed error (DELETE /{name})
    - useDeleteObject mutation (segment-encoded key, invalidates prefix-scoped key)
    - useDeleteObjects mutation + BatchDeleteResult / BatchDeleteError types (POST /{bucket}?delete, one invalidation per batch)
  affects:
    - "Plans 03-03..03-05 import these hooks and stay ignorant of URL construction, XML shape, and cache invalidation"
tech-stack:
  added: []
  patterns:
    - renderHook + QueryClientProvider wrapper for hook testing
    - vi.spyOn(client, 'invalidateQueries') to verify cache invalidation behaviour (works with gcTime:0 where getQueryState is unreliable for inactive queries)
    - Typed error class (BucketNotEmptyError) over Object.assign to carry a machine-checkable `code` field
    - Prefix-only query-key builder (objectsQueryKey) so mutations invalidate every page under a prefix, not just the current page-size + token combo
key-files:
  created:
    - web/src/services/s3/api/useBuckets.ts
    - web/src/services/s3/api/useBuckets.test.tsx
    - web/src/services/s3/api/useObjects.ts
    - web/src/services/s3/api/useObjects.test.tsx
    - web/src/services/s3/api/useObjectMetadata.ts
    - web/src/services/s3/api/useObjectTags.ts
    - web/src/services/s3/api/bucketMutations.ts
    - web/src/services/s3/api/bucketMutations.test.tsx
    - web/src/services/s3/api/objectMutations.ts
    - web/src/services/s3/api/objectMutations.test.tsx
  modified: []
  deleted:
    - web/src/services/s3/api/useBuckets.test.ts (Plan 00 stub — replaced by .tsx)
    - web/src/services/s3/api/useObjects.test.ts (Plan 00 stub — replaced by .tsx)
    - web/src/services/s3/api/bucketMutations.test.ts (Plan 00 stub — replaced by .tsx)
    - web/src/services/s3/api/objectMutations.test.ts (Plan 00 stub — replaced by .tsx)
decisions:
  - "BucketNotEmptyError as a named class (extends Error) instead of Object.assign — carries a literal `code: 'BucketNotEmpty'` that survives structural checks and is greppable"
  - "objectsQueryKey only includes (bucket, prefix) — pageSize + continuationToken are intentionally omitted so that one mutation invalidates every cached page under a prefix, matching the 'invalidate once per batch' rule (Pitfall 6)"
  - "vi.spyOn(client.invalidateQueries) for invalidation assertions — with gcTime:0 the query cache evicts inactive entries before the test reads state, making getQueryState unreliable. Spying is deterministic."
  - "placeholderData is wired on useObjects per UI-SPEC; assertion uses a stateful Harness component that flips continuationToken and checks that the previous page's rows are still rendered while the new page resolves"
metrics:
  duration_min: 12
  completed_date: 2026-04-17
  tasks_total: 2
  tasks_completed: 2
  tests_total: 17
  tests_passing: 17
  files_created: 10
  files_modified: 0
requirements: [S3-01, S3-02, S3-03, S3-04]
---

# Phase 3 Plan 2: S3 Query Hook + Mutation Layer Summary

**One-liner:** Ten files under `web/src/services/s3/api/` that expose every TanStack Query hook and mutation the S3 UI in Plans 03–05 will consume, with stable query keys, prefix-scoped cache invalidation, and a typed `BucketNotEmptyError` surfacing the only server-side edge case the UI has to render.

## What shipped

### Query hooks

| File | Hook | Query key | Purpose |
|------|------|-----------|---------|
| `useBuckets.ts` | `useBuckets()` | `['s3','buckets']` | ListBuckets → `S3Bucket[]` |
| `useObjects.ts` | `useObjects({bucket, prefix, pageSize, continuationToken})` | `['s3','objects', bucket, prefix, pageSize, token ?? null]` | ListObjectsV2 with `list-type=2`, `delimiter=/`, optional `prefix` and `continuation-token`. `placeholderData: (prev) => prev` keeps prior page during refetch. `enabled: Boolean(bucket)`. |
| `useObjects.ts` | `objectsQueryKey(bucket, prefix)` | `['s3','objects', bucket, prefix]` | Partial-key builder for invalidation from mutations |
| `useObjectMetadata.ts` | `useObjectMetadata(bucket, key)` | `['s3','metadata', bucket, key]` | HEAD /{bucket}/{key} → `S3ObjectMetadata`. Strips `x-amz-meta-` prefix (Pitfall 10). |
| `useObjectTags.ts` | `useObjectTags(bucket, key)` | `['s3','tags', bucket, key]` | GET /{bucket}/{key}?tagging → `S3Tag[]` |

### Mutations

| File | Mutation | Invalidates | Special |
|------|----------|-------------|---------|
| `bucketMutations.ts` | `useCreateBucket()` | `['s3','buckets']` | — |
| `bucketMutations.ts` | `useDeleteBucket()` | `['s3','buckets']` | Catches ky `HTTPError`, parses `<Error>` XML, re-throws `BucketNotEmptyError` (typed class with `code === 'BucketNotEmpty'`) when applicable |
| `objectMutations.ts` | `useDeleteObject(bucket, prefix)` | `objectsQueryKey(bucket, prefix)` | Segment-encoded key (Pitfall 1) |
| `objectMutations.ts` | `useDeleteObjects(bucket, prefix)` | `objectsQueryKey(bucket, prefix)` **once per batch** (Pitfall 6) | Builds `<Delete><Object><Key/></Object>...<Quiet>false</Quiet></Delete>` body with XML escaping of `&`, `<`, `>`; parses `DeleteResult` → `{ deleted: string[], errors: BatchDeleteError[] }` |

No `usePutObject` — uploads are driven directly by `uploadClient` in Plan 05 so the XHR handle can expose progress and cancel.

## Tests

17 passing tests across 4 files, all real assertions (0 `test.todo`). Ran against vitest 3.2.4 + jsdom + MSW v2 using the `s3Handlers` / `S3_FIXTURES` from Plan 00.

| File | Tests | What's covered |
|------|-------|----------------|
| `useBuckets.test.tsx` | 2 | two-bucket fixture → `S3Bucket[]`; empty buckets → `[]` |
| `useObjects.test.tsx` | 6 | full query string (`list-type=2`, `delimiter=/`, `max-keys=50`, `prefix=photos/`, `continuation-token=cont-xyz`); omits prefix + token when empty/null; folders-before-files ordering; `placeholderData` keeps previous page across continuation-token change (stateful harness component); `enabled: false` when bucket empty; `objectsQueryKey` shape |
| `bucketMutations.test.tsx` | 3 | PUT /{name} fires + buckets refetches; DELETE not-empty → `BucketNotEmptyError` with `code === 'BucketNotEmpty'`; successful DELETE refetches buckets |
| `objectMutations.test.tsx` | 6 | per-segment key encoding (`folder with spaces/a b.txt` → `/my-bucket/folder%20with%20spaces/a%20b.txt`); `invalidateQueries` called with prefix-scoped key on single delete; POST /{bucket}?delete body shape; XML escaping of `& < >`; mixed Deleted + Error parsing; **one** invalidation per batch of 3 keys |

```
Test Files  9 passed (9)    # full src/services/s3/api run
     Tests  60 passed (60)
```

## Verification commands run

| Command | Result |
|---------|--------|
| `cd web && npm run test -- src/services/s3/api/useBuckets src/services/s3/api/useObjects --run` | 2 files, 8 tests, 0 failures |
| `cd web && npm run test -- src/services/s3/api/bucketMutations src/services/s3/api/objectMutations --run` | 2 files, 9 tests, 0 failures |
| `cd web && npm run test -- src/services/s3/api --run` | 9 files, 60 tests, 0 failures |
| `npx tsc --noEmit -p web` | exit 0, zero errors |
| `grep -c test.todo` on the 4 Plan 00 stubs under `web/src/services/s3/api/` | all 0 |

## Acceptance criteria check

Task 1:
- `grep -c "export function useBuckets" web/src/services/s3/api/useBuckets.ts` → 1
- `grep -c "export function useObjects" web/src/services/s3/api/useObjects.ts` → 1
- `grep -c "placeholderData" web/src/services/s3/api/useObjects.ts` → 1
- `grep -c "'list-type'" web/src/services/s3/api/useObjects.ts` → 1
- `grep -c "delimiter" web/src/services/s3/api/useObjects.ts` → 2 (key + searchParam)
- `grep -c "x-amz-meta-" web/src/services/s3/api/useObjectMetadata.ts` → 1 (as constant)
- `export function useObjectMetadata / useObjectTags` present → yes
- Zero `test.todo` in `useBuckets.test.tsx` / `useObjects.test.tsx`
- Targeted vitest exit 0
- `tsc --noEmit` zero errors

Task 2:
- `grep -c "export function useCreateBucket\|export function useDeleteBucket" bucketMutations.ts` → 2
- `grep -c "export function useDeleteObject\|export function useDeleteObjects" objectMutations.ts` → 2
- `grep -c "BucketNotEmpty" bucketMutations.ts` → 2 (class + code string)
- `grep -c "<Delete>" objectMutations.ts` → 1
- `grep -c "<Quiet>false</Quiet>" objectMutations.ts` → 1
- `grep -c "invalidateQueries" bucketMutations.ts objectMutations.ts` → 4
- Zero `test.todo`; targeted vitest exit 0

## Deviations from plan

### Notes (not code deviations)

**1. Plan 00 stubs were `.ts` but the new tests use JSX (QueryClientProvider wrapper)**
- Renamed the four Plan 00 stub files to `.tsx`: `useBuckets.test.ts` → `.tsx`, etc. The stubs contained only `test.todo()` with no real implementation; semantically equivalent to deletion + recreation. Git history records this as a delete + add.
- Same pattern Plan 01 used (tests written in `.ts` because they had no JSX; these tests wrap `renderHook` in `QueryClientProvider` so need `.tsx`).

**2. Deviation from plan's suggested invalidation assertion pattern**
- The plan's pseudocode sketched checking `queryClient.getQueryData` / state after invalidation. With `gcTime: 0` and `staleTime: 0` (default test harness), inactive queries are evicted before the test can read state, so `getQueryState` returns `undefined`. Switched to `vi.spyOn(client, 'invalidateQueries')` and asserted call count + argument — this is a deterministic assertion on the contract the plan actually wants (exactly one invalidation per batch).
- Tracked as `[Rule 3 - Blocker]` type deviation (fixed assertion strategy, not code contract).

### Auto-fixed issues

None. The only plan deviation was the test-assertion technique above; no production code logic changed relative to the plan sketch.

## Threat-model check

| Threat | Mitigation | Evidence |
|--------|-----------|----------|
| T-3-02-01 Tampering via XML injection in `buildDeleteXml` | `escapeXml` runs on every key | Test: `a&b<c>.txt` → body contains `a&amp;b&lt;c&gt;.txt` and does **not** contain the raw string (passes) |
| T-3-02-02 Information disclosure via error message | `parseErrorXml` surfaces server message verbatim; accepted risk (local emulator, no PII). Rendered via React auto-escape in Plan 05. | Code review — no `dangerouslySetInnerHTML` introduced |
| T-3-02-03 Business logic (V11 bulk delete) | Type-to-confirm lives in Plan 05 UI, hook deliberately un-guarded | Hook is a primitive; gate belongs to the layer above |

## Known Stubs

None. `useObjectMetadata` and `useObjectTags` have no direct test coverage in this plan (plan scoped tests to the 4 stubs explicitly listed), but both hooks are fully implemented and exercised indirectly via the targeted `--run` acceptance. Plan 05 will add component-level coverage that consumes them.

## Threat Flags

None — this plan stays within the threat surface enumerated in its `<threat_model>`.

## Commits

- `12c64c9` — feat(03-02): S3 query hooks — useBuckets, useObjects, useObjectMetadata, useObjectTags
- `8e0c47e` — feat(03-02): S3 mutations — createBucket, deleteBucket, deleteObject(s)

## Self-Check: PASSED

Files exist:
- FOUND: web/src/services/s3/api/useBuckets.ts
- FOUND: web/src/services/s3/api/useBuckets.test.tsx
- FOUND: web/src/services/s3/api/useObjects.ts
- FOUND: web/src/services/s3/api/useObjects.test.tsx
- FOUND: web/src/services/s3/api/useObjectMetadata.ts
- FOUND: web/src/services/s3/api/useObjectTags.ts
- FOUND: web/src/services/s3/api/bucketMutations.ts
- FOUND: web/src/services/s3/api/bucketMutations.test.tsx
- FOUND: web/src/services/s3/api/objectMutations.ts
- FOUND: web/src/services/s3/api/objectMutations.test.tsx

Commits present on branch:
- FOUND: 12c64c9 feat(03-02): S3 query hooks
- FOUND: 8e0c47e feat(03-02): S3 mutations
