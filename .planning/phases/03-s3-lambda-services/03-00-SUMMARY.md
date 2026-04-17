---
phase: 03-s3-lambda-services
plan: 00
subsystem: s3
tags: [s3, test-scaffolding, msw, wave-0]
dependency_graph:
  requires: []
  provides:
    - "web/src/services/s3/__tests__/fixtures.ts (S3_FIXTURES)"
    - "web/src/services/s3/__tests__/msw-handlers.ts (s3Handlers)"
    - "18 S3 todo test stub files (9 api + 9 components)"
  affects:
    - "Plans 03-01..03-05 reference these stubs in their <verify> blocks"
tech_stack:
  added: []
  patterns:
    - "MSW v2 path-style REST handlers (S3 uses REST, unlike EC2 Query protocol)"
    - "Vitest test.todo() stubs for Nyquist-compliant verify commands"
key_files:
  created:
    - "web/src/services/s3/__tests__/fixtures.ts"
    - "web/src/services/s3/__tests__/msw-handlers.ts"
    - "web/src/services/s3/api/s3Client.test.ts"
    - "web/src/services/s3/api/parseS3Xml.test.ts"
    - "web/src/services/s3/api/uploadClient.test.ts"
    - "web/src/services/s3/api/downloadClient.test.ts"
    - "web/src/services/s3/api/useBuckets.test.ts"
    - "web/src/services/s3/api/useObjects.test.ts"
    - "web/src/services/s3/api/bucketMutations.test.ts"
    - "web/src/services/s3/api/objectMutations.test.ts"
    - "web/src/services/s3/api/validateBucketName.test.ts"
    - "web/src/services/s3/components/BucketTable.test.tsx"
    - "web/src/services/s3/components/CreateBucketModal.test.tsx"
    - "web/src/services/s3/components/DeleteBucketModal.test.tsx"
    - "web/src/services/s3/components/ObjectTable.test.tsx"
    - "web/src/services/s3/components/ObjectDetail.test.tsx"
    - "web/src/services/s3/components/DeleteObjectModal.test.tsx"
    - "web/src/services/s3/components/DropZone.test.tsx"
    - "web/src/services/s3/components/UploadFlashItem.test.tsx"
    - "web/src/services/s3/components/PrefixBreadcrumb.test.tsx"
  modified: []
decisions: []
metrics:
  duration: ~6m
  completed: 2026-04-17
  tasks: 2
  files: 20
requirements: [S3-01, S3-02, S3-03, S3-04]
---

# Phase 03 Plan 00: Wave 0 S3 Test Scaffolding Summary

**One-liner:** MSW handlers for all 10 S3 REST endpoints plus 63 todo test stubs across 18 files, unblocking every downstream `<verify>` command in Plans 01–05.

## What Was Built

Wave 0 test infrastructure for Phase 3 S3:

1. **`fixtures.ts`** — `S3_FIXTURES` with 9 XML strings covering all response shapes the UI parses:
   - `listBucketsEmpty`, `listBucketsTwo` (ListAllMyBucketsResult)
   - `listObjectsRoot` (2 CommonPrefixes + 2 Contents, IsTruncated=false)
   - `listObjectsTruncated` (IsTruncated=true, NextContinuationToken=next-token-abc)
   - `listObjectsNested` (prefix=photos/, 1 CommonPrefix + 1 Content)
   - `taggingEmpty`, `taggingWithTags` (env=prod, owner=alice)
   - `deleteObjectsSuccess`, `deleteObjectsPartial` (1 Deleted + 1 Error NoSuchKey)

   All fixtures carry the authoritative `xmlns="http://s3.amazonaws.com/doc/2006-03-01/"` namespace.

2. **`msw-handlers.ts`** — `s3Handlers: HttpHandler[]` with 9 path-style routes:
   - `GET /` → ListBuckets (returns only when `list-type` query absent)
   - `GET /:bucket?list-type=2` → ListObjectsV2 (root or nested based on `prefix`)
   - `POST /:bucket?delete` → DeleteObjects (returns only when `delete` param present)
   - `PUT /:bucket` → CreateBucket (200 empty body)
   - `DELETE /:bucket` → DeleteBucket (204; 409 BucketNotEmpty for `bucket === 'not-empty'`)
   - `PUT /:bucket/*` → PutObject (ETag header)
   - `GET /:bucket/*` → GetObject or GetObjectTagging (based on `?tagging`)
   - `HEAD /:bucket/*` → HeadObject (incl. `x-amz-meta-author`, `x-amz-meta-project`)
   - `DELETE /:bucket/*` → DeleteObject (204)

   Query-string disambiguation uses `return undefined` to fall through to downstream handlers per MSW v2 semantics.

3. **18 stub test files** under `web/src/services/s3/api/` (9) and `web/src/services/s3/components/` (9), containing 63 `test.todo()` entries total spanning requirements S3-01, S3-02, S3-03, S3-04 — every label called out verbatim in the plan is present and greppable.

## Verification Evidence

- `grep -c "export const S3_FIXTURES" fixtures.ts` → **1**
- `grep -c "export const s3Handlers" msw-handlers.ts` → **1**
- Keyword scan (`ListAllMyBucketsResult|ListBucketResult|CommonPrefixes|NextContinuationToken|IsTruncated|x-amz-meta-`) → **23 matches** (required ≥ 10)
- `grep -E "http\.(get|put|post|delete|head)"` in handlers → **9** (required ≥ 9)
- Test files: **9 api + 9 components = 18** (required)
- `grep -rc "test\.todo" web/src/services/s3` → **63** (required ≥ 55)
- `grep "expect(" web/src/services/s3` → **0** (required 0)
- `npx tsc --noEmit -p web/tsconfig.json` → **exit 0, zero errors**
- `npm run test -- src/services/s3 --run` → **18 files, 63 todo, 0 passed, 0 failed** (vitest run completed in 85s)

## Decisions Made

None requiring project-level tracking. Implementation followed Phase 2 `ec2Handlers` structural pattern, adapted for path-style REST instead of Query protocol.

## Deviations from Plan

None — plan executed exactly as written. Dependencies (`node_modules`) were not present in the worktree at start; they were installed via `npm ci` (not code, just toolchain setup — no source deviation).

## Known Stubs

None that affect correctness. By design, this plan produces test stubs only (`test.todo()` entries); production code is out of scope and arrives in Plans 03-01..03-05.

## Commits

- `6a47fbc` — test(03-00): add S3 XML fixtures and MSW handlers
- `ccc502e` — test(03-00): add 18 S3 todo test stubs for Wave 0 scaffolding

## Self-Check: PASSED

- Verified `web/src/services/s3/__tests__/fixtures.ts` exists
- Verified `web/src/services/s3/__tests__/msw-handlers.ts` exists
- Verified all 18 stub files exist (9 api + 9 components)
- Verified commits `6a47fbc` and `ccc502e` present in `git log`
- Verified `tsc --noEmit` exit 0
- Verified vitest reports 63 todo / 0 passed / 0 failed
