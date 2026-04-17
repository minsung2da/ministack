---
phase: 3
slug: s3-lambda-services
status: ready
nyquist_compliant: true
wave_0_complete: false
created: 2026-04-17
---

# Phase 3 — Validation Strategy

> Per-phase validation contract for feedback sampling during execution. Source: 03-RESEARCH.md §Validation Architecture + per-plan `<verify><automated>` blocks (03-00..03-05).

---

## Test Infrastructure

| Property | Value |
|----------|-------|
| **Framework** | vitest 3.2.4 + Testing Library (unit/component); Playwright (e2e) |
| **Config file** | `web/vitest.config.ts`, `web/playwright.config.ts` (established Phase 1) |
| **Quick run command** | `cd web && npm run test -- src/services/s3 --run` |
| **Full suite command** | `cd web && npm test -- --run && npm run typecheck` |
| **E2E command** | `cd web && npm run test:e2e -- s3-flow.spec.ts` |
| **Estimated runtime** | ~3s unit quick · ~12s full · ~20s e2e |

---

## Sampling Rate

- **After every task commit:** `cd web && npm run test -- src/services/s3 --run`
- **After every plan wave:** `cd web && npm test -- --run && npm run typecheck`
- **Before `/gsd-verify-work`:** Full unit suite green + Playwright `s3-flow.spec.ts` smoke
- **Max feedback latency:** 3 seconds for quick run

---

## Per-Task Verification Map

| Task ID | Plan | Wave | Requirement | Threat Ref | Secure Behavior | Test Type | Automated Command | File Exists | Status |
|---------|------|------|-------------|------------|-----------------|-----------|-------------------|-------------|--------|
| 3-00-01 | 00 | 0 | S3-01..04 | — | N/A (scaffolding) | infra | `cd web && ls src/test/fixtures/s3/ && test -f src/test/s3Handlers.ts` | ❌ W0 | ⬜ pending |
| 3-00-02 | 00 | 0 | S3-01..04 | — | N/A (test stubs) | infra | `cd web && npm run test -- src/services/s3 --run --reporter=verbose` | ❌ W0 | ⬜ pending |
| 3-01-01 | 01 | 1 | S3-01..04 | T-3-01 (input-validation) | bucket-name regex client-side | unit | `cd web && npm run test -- src/services/s3/api/s3Client.test.ts --run` | ❌ W0 | ⬜ pending |
| 3-01-02 | 01 | 1 | S3-03, S3-04 | T-3-02 (upload/download) | XHR progress + revokeObjectURL | unit | `cd web && npm run test -- src/services/s3/api/uploadClient.test.ts src/services/s3/api/downloadClient.test.ts --run` | ❌ W0 | ⬜ pending |
| 3-02-01 | 02 | 2 | S3-01, S3-02 | — | N/A (query hooks) | unit | `cd web && npm run test -- src/services/s3/api/useBuckets.test.ts src/services/s3/api/useObjects.test.ts --run` | ❌ W0 | ⬜ pending |
| 3-02-02 | 02 | 2 | S3-01..04 | — | invalidation correctness | unit | `cd web && npm run test -- src/services/s3/api/bucketMutations.test.ts src/services/s3/api/objectMutations.test.ts --run` | ❌ W0 | ⬜ pending |
| 3-03-01 | 03 | 3 | S3-01 | T-3-01 | bucket-name validation matrix | component | `cd web && npm run test -- src/services/s3/components/BucketTable.test.tsx src/services/s3/components/CreateBucketModal.test.tsx --run` | ❌ W0 | ⬜ pending |
| 3-03-02 | 03 | 3 | S3-01 | T-3-03 (confirm) | type-to-confirm + BucketNotEmpty | component | `cd web && npm run test -- src/services/s3/components/DeleteBucketModal.test.tsx --run` | ❌ W0 | ⬜ pending |
| 3-04-01 | 04 | 4 | S3-02 | — | prefix URL encoding | component | `cd web && npm run test -- src/services/s3/components/ObjectTable.test.tsx src/services/s3/components/PrefixBreadcrumb.test.tsx --run` | ❌ W0 | ⬜ pending |
| 3-04-02 | 04 | 4 | S3-02 | — | continuation-token stack reset on prefix change | component | `cd web && npm run test -- src/services/s3/pages/ObjectBrowserPage.test.tsx --run` | ❌ W0 | ⬜ pending |
| 3-05-01 | 05 | 5 | S3-03 | T-3-02, T-3-04 (drag-drop JS URL) | DataTransfer.files only, no text/uri-list | component | `cd web && npm run test -- src/services/s3/components/DropZone.test.tsx src/services/s3/components/UploadFlashItem.test.tsx --run` | ❌ W0 | ⬜ pending |
| 3-05-02 | 05 | 5 | S3-04 | T-3-05 (XSS via metadata) | React auto-escape of x-amz-meta values | component | `cd web && npm run test -- src/services/s3/components/ObjectDetail.test.tsx src/services/s3/components/DeleteObjectModal.test.tsx --run` | ❌ W0 | ⬜ pending |
| 3-05-03 | 05 | 5 | S3-03, S3-04 | — | wire-up integration | integration | `cd web && npm run test -- src/services/s3 --run` | ❌ W0 | ⬜ pending |
| 3-05-04 | 05 | 5 | S3-01..04 | — | human UAT checkpoint | manual | Playwright `cd web && npm run test:e2e -- s3-flow.spec.ts` + manual 28-step UAT | ❌ W0 | ⬜ pending |

*Status: ⬜ pending · ✅ green · ❌ red · ⚠️ flaky · ❌ W0 = test file to be created by Wave 0 (Plan 03-00)*

---

## Wave 0 Requirements

Plan 03-00 creates all test stubs and fixtures before any downstream plan executes.

- [ ] `web/src/test/fixtures/s3/` — sample XML responses (ListBuckets, ListObjectsV2, GetObjectTagging)
- [ ] `web/src/test/s3Handlers.ts` — MSW handlers (ListBuckets, ListObjectsV2, PutObject, GetObject, HeadObject, DeleteObject, DeleteObjects, GetObjectTagging)
- [ ] `web/src/services/s3/api/s3Client.test.ts`
- [ ] `web/src/services/s3/api/parseS3Xml.test.ts`
- [ ] `web/src/services/s3/api/uploadClient.test.ts`
- [ ] `web/src/services/s3/api/downloadClient.test.ts`
- [ ] `web/src/services/s3/api/useBuckets.test.ts`
- [ ] `web/src/services/s3/api/useObjects.test.ts`
- [ ] `web/src/services/s3/api/bucketMutations.test.ts`
- [ ] `web/src/services/s3/api/objectMutations.test.ts`
- [ ] `web/src/services/s3/components/BucketTable.test.tsx`
- [ ] `web/src/services/s3/components/CreateBucketModal.test.tsx`
- [ ] `web/src/services/s3/components/DeleteBucketModal.test.tsx`
- [ ] `web/src/services/s3/components/ObjectTable.test.tsx`
- [ ] `web/src/services/s3/components/PrefixBreadcrumb.test.tsx`
- [ ] `web/src/services/s3/components/DropZone.test.tsx`
- [ ] `web/src/services/s3/components/UploadFlashItem.test.tsx`
- [ ] `web/src/services/s3/components/ObjectDetail.test.tsx`
- [ ] `web/src/services/s3/components/DeleteObjectModal.test.tsx`
- [ ] `web/src/services/s3/pages/ObjectBrowserPage.test.tsx`
- [ ] `web/e2e/s3-flow.spec.ts` — Playwright smoke (upload → list → download → delete)

Framework install: **None required** — vitest, Testing Library, MSW, Playwright present from Phase 1.

---

## Manual-Only Verifications

| Behavior | Requirement | Why Manual | Test Instructions |
|----------|-------------|------------|-------------------|
| Drag-and-drop upload visual feedback (highlight on drag-over, progress bar animation) | S3-03 | Pointer events + CSS animation behavior not reliably testable in jsdom | Task 3-05-04 checklist steps 12-17: drag file over bucket page, confirm drop-zone highlights, release, observe progress flash |
| Download triggers browser "Save as" prompt | S3-03 | Cross-browser anchor-click behavior varies; jsdom cannot fire native download | Task 3-05-04 steps 21-23: click Download on object row, confirm browser prompts for save location |
| Bucket name already-exists server rejection surfaces inline | S3-01 | Requires live :4566 backend state | Task 3-05-04 step 4: create "my-test-bucket", retry, observe BucketAlreadyExists error flash |

---

## Validation Sign-Off

- [x] All tasks have `<automated>` verify or Wave 0 dependencies
- [x] Sampling continuity: no 3 consecutive tasks without automated verify
- [x] Wave 0 covers all MISSING references (21 Wave 0 artifacts enumerated above)
- [x] No watch-mode flags (all commands use `--run`)
- [x] Feedback latency < 3s for per-task quick run
- [x] `nyquist_compliant: true` set in frontmatter

**Approval:** approved 2026-04-17
