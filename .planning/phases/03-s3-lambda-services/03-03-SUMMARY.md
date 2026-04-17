---
phase: 03-s3-lambda-services
plan: 03
subsystem: web/services/s3
status: complete
completed: 2026-04-17
tags: [s3, bucket-crud, cloudscape, routing, modals, split-panel, tdd]
dependency_graph:
  requires:
    - phase 3 plan 02 (useBuckets, useCreateBucket, useDeleteBucket + BucketNotEmptyError)
    - phase 3 plan 01 (validateBucketName, S3Bucket type)
    - phase 3 plan 00 (MSW s3Handlers, component test.todo stubs)
    - phase 2 (SplitPanelContext, useFlashNotifications, SplitPanelDetail)
  provides:
    - "GET /services/s3 → interactive bucket list (list/create/delete, type-to-confirm, Flashbar, SplitPanel)"
    - "GET /services/s3/:bucketName → ObjectBrowserPage stub (Plan 04 replaces)"
    - "BUCKET_COLUMNS + BUCKET_VISIBLE_CONTENT (re-used by Plan 04 for object detail context)"
    - "copy.s3 namespace (~130 entries, UI-SPEC verbatim) for Plans 04-05 to consume"
    - "s3BucketPageSize + s3ObjectPageSize uiStore slots"
  affects:
    - "web/src/app/routes.tsx — S3 routes inserted BEFORE services/:serviceKey (Pitfall 5)"
    - "web/src/shared/copy.ts — copy.s3.* added"
    - "web/src/stores/uiStore.ts — persisted preferences extended"
tech-stack:
  added: []
  patterns:
    - "Cloudscape useCollection({ filtering, pagination, sorting, selection }) with per-page-size persisted to Zustand via useUiStore hook"
    - "SplitPanelContext.setPanel(panel, header) / closePanel() — existing Phase 2 API, NOT the plan-draft's setContent/setOpen"
    - "useFlashNotifications addSuccess/addError — existing Phase 2 API, NOT pushSuccess/pushError"
    - "Modal form pattern: validate-on-change + touched flag, ky HTTPError surfaced via Alert at top of Form"
    - "DeleteBucketModal sequential mutateAsync with per-bucket try/catch collects BucketNotEmptyError into typed result aggregate"
key-files:
  created:
    - web/src/services/s3/S3Layout.tsx
    - web/src/services/s3/BucketListPage.tsx
    - web/src/services/s3/ObjectBrowserPage.tsx
    - web/src/services/s3/components/BucketTable.tsx
    - web/src/services/s3/components/BucketDetail.tsx
    - web/src/services/s3/components/CreateBucketModal.tsx
    - web/src/services/s3/components/DeleteBucketModal.tsx
    - web/src/services/s3/components/columns.ts
  modified:
    - web/src/app/routes.tsx
    - web/src/shared/copy.ts
    - web/src/stores/uiStore.ts
    - web/src/services/s3/components/BucketTable.test.tsx
    - web/src/services/s3/components/CreateBucketModal.test.tsx
    - web/src/services/s3/components/DeleteBucketModal.test.tsx
decisions:
  - "Used existing SplitPanelContext API (setPanel / closePanel) + useFlashNotifications API (addSuccess / addError) rather than the plan draft's setContent/setOpen + pushSuccess/pushError. The plan's <interfaces> block sketched wishful names; the Phase 2 implementations in the repo use the names we adopted. Contract (what flows through those hooks) is identical."
  - "BucketTable onSelectionChange passes only the FIRST selected bucket to the parent (via a derived null-or-bucket arg). Parent (BucketListPage) maintains selectedItems state so bulk-delete still has the full selection, while the SplitPanel only ever renders the first bucket — matches UI-SPEC 'single click opens SplitPanel, multi-select drives bulk delete'."
  - "columns.ts kept as .ts (per plan spec); uses React.createElement for the Link cell so no JSX needed — file stays importable from both .ts and .tsx call sites."
  - "DeleteBucketModal owns the per-bucket mutateAsync loop instead of delegating to the parent. Keeps error aggregation (BucketNotEmptyError → UI-SPEC copy) collocated with the modal's type-to-confirm gate."
metrics:
  duration_min: 18
  completed_date: 2026-04-17
  tasks_total: 2
  tasks_completed: 2
  tests_total: 10
  tests_passing: 10
  files_created: 8
  files_modified: 6
requirements: [S3-01]
---

# Phase 3 Plan 3: S3 Bucket List UI Summary

**One-liner:** A fully interactive `/services/s3` bucket list — Cloudscape Table with multi-select + pagination + preferences, Create/Delete modals with live validation and type-to-confirm, BucketNotEmpty error surfaced as UI-SPEC-verbatim Flashbar, and a SplitPanel that opens on row click. Satisfies S3-01 end-to-end.

## What shipped

### Routes, copy, persisted preferences (Task 1)

- `/services/s3` → `S3Layout` > `BucketListPage`
- `/services/s3/:bucketName` → `S3Layout` > `ObjectBrowserPage` (stub, Plan 04 replaces)
- Both lazy-imported + wrapped in `withSuspense`, inserted BEFORE `services/:serviceKey` in `routes.tsx` (Pitfall 5 — grep confirms line 107 < line 118)
- `copy.s3` namespace with ~130 entries covering every UI-SPEC §"Copywriting Contract" row verbatim (Page-Level, Bucket List, Create/Delete Bucket, Object Browser, Upload, Download, Object Detail, Object Delete, Miscellaneous). Function entries for dynamic strings (e.g. `deleteBucketBody(bucketName)`, `bulkDeleteBucketsHeader(count)`).
- `useUiStore` extended with `s3BucketPageSize` (default 10) + `s3ObjectPageSize` (default 50), persisted under existing `ministack:console` storage key.
- `columns.ts` exports `BUCKET_COLUMNS` (Name → Link, Creation date, Region) + `BUCKET_VISIBLE_CONTENT`.

### Interactive UI (Task 2)

| Component | Responsibility |
|-----------|----------------|
| `BucketTable.tsx` | Cloudscape Table, `useCollection` with filter+pagination+sorting+selection, multi-select, Header with Refresh icon-button + Actions ButtonDropdown (Delete) + Create bucket primary button, empty-state CTA, load-error Alert+Retry, name cell renders React Router `<Link>` |
| `BucketDetail.tsx` | SplitPanel content — `SplitPanelDetail` key-value pairs (Name, Region, Creation date) |
| `CreateBucketModal.tsx` | Modal + Form + FormField; live validation via `validateBucketName` (errorText gated by `touched`); submit disabled while invalid or pending; ky HTTPError rendered via `<Alert type="error">` inside Form; `onCreated(name)` callback on success, then auto-dismiss |
| `DeleteBucketModal.tsx` | Single (type bucket name) + bulk (type "delete") modes; sequential `mutateAsync` per bucket; `BucketNotEmptyError` caught and surfaced via `copy.s3.deleteBucketNotEmpty(bucketName)` in aggregate result; `onDeleted({ deleted, errors })` aggregate fires once after the loop |
| `BucketListPage.tsx` | Wires `useBuckets` + `useFlashNotifications` + `useSplitPanel`, renders `FlashNotifications` + Header + BucketTable + both modals. Dispatches success/error Flashbar messages per UI-SPEC §"Flashbar Notification Contract" |

## Tests

10 real component tests across 3 files (all Plan 00 `test.todo` stubs replaced).

| File | Tests | Focus |
|------|-------|-------|
| `BucketTable.test.tsx` | 4 | name column is Router Link with correct href; empty-state copy matches UI-SPEC; load-error Alert + Retry button fires onRefresh; row-checkbox selection fires onSelectionChange with first bucket |
| `CreateBucketModal.test.tsx` | 3 | submit disabled until validation passes (empty → 2-char → valid sequence); ky HTTPError rendered inline in Alert; successful PUT invokes onCreated + onDismiss |
| `DeleteBucketModal.test.tsx` | 3 | single-delete Delete button gated on exact bucket-name match; bulk-delete gated on literal "delete" (not "DELETE"); BucketNotEmptyError (bucket=`not-empty` via s3Handlers) surfaces with UI-SPEC copy via `onDeleted` aggregate |

```
Test Files  3 passed (3)
     Tests  10 passed (10)
```

Full s3 suite:

```
Test Files  12 passed | 6 skipped (18)
     Tests  70 passed | 19 todo (89)
```

(19 todos remain in Plan 00 stubs for Plans 04-05 — out of this plan's scope.)

## Verification commands run

| Command | Result |
|---------|--------|
| `cd web && npm run test -- src/services/s3/components/BucketTable src/services/s3/components/CreateBucketModal src/services/s3/components/DeleteBucketModal --run` | 3 files, 10 tests, 0 failures |
| `cd web && npm run test -- src/services/s3 --run` | 12 files, 70 passed, 19 todo, 0 failures |
| `cd web && npx tsc --noEmit -p tsconfig.json` | exit 0, zero errors |
| `grep -rn dangerouslySetInnerHTML web/src/services/s3/` | no matches (T-3-03-03) |

## Acceptance criteria check

### Task 1

| Criterion | Value | OK |
|-----------|-------|----|
| `grep -c "services/s3" web/src/app/routes.tsx` ≥ 2 | 4 | yes |
| S3 path line < services/:serviceKey line | 107 < 118 | yes |
| `grep -c "s3BucketPageSize\|s3ObjectPageSize" web/src/stores/uiStore.ts` ≥ 4 | 6 | yes |
| `grep -c "s3:" web/src/shared/copy.ts` ≥ 1 | 1 | yes |
| `grep -cE "(serviceHeading\|bucketsEmptyHeading\|createBucketButton\|uploadButton\|deleteBucketHeader)" web/src/shared/copy.ts` ≥ 5 | 5 | yes |
| All 4 new files exist | yes | yes |
| `grep -c "BUCKET_COLUMNS\|BUCKET_VISIBLE_CONTENT" web/src/services/s3/components/columns.ts` == 2 | 2 | yes |
| `tsc --noEmit` zero errors | 0 | yes |

### Task 2

| Criterion | Value | OK |
|-----------|-------|----|
| `grep -c "useCollection" BucketTable.tsx` ≥ 1 | 2 | yes |
| `grep -cE 'selectionType="multi"' BucketTable.tsx` ≥ 1 | 1 | yes |
| `grep -c "validateBucketName" CreateBucketModal.tsx` ≥ 1 | 2 | yes |
| `grep -c "useCreateBucket" CreateBucketModal.tsx` ≥ 1 | 2 | yes |
| `grep -c "useDeleteBucket" DeleteBucketModal.tsx` ≥ 1 | 2 | yes |
| `grep -cE "BucketNotEmpty\|bucket is not empty" DeleteBucketModal.tsx BucketListPage.tsx` ≥ 1 | 6 (5 in modal + 1 in page) | yes |
| `grep -c "useSplitPanel" BucketListPage.tsx` ≥ 1 | 2 | yes |
| `grep -c "useFlashNotifications" BucketListPage.tsx` ≥ 1 | 2 | yes |
| Zero `test.todo` in 3 component tests | 0 / 0 / 0 | yes |
| Targeted vitest exit 0 | yes | yes |
| `tsc --noEmit` zero errors | 0 | yes |

## Deviations from plan

### Auto-fixed issues

**1. [Rule 3 - Blocker] Plan's `<interfaces>` block named hooks that don't exist in the repo**

- **Found during:** Task 2 BucketListPage wiring
- **Issue:** The plan sketch said `useSplitPanel()` returns `{setContent, setOpen}` and `useFlashNotifications()` returns `{pushSuccess, pushError}`. The actual Phase 2 implementations expose `{setPanel, closePanel, panel, header, isOpen}` and `{addSuccess, addError, clearAll, items}` respectively.
- **Fix:** Used the actual Phase 2 APIs. `setPanel(<BucketDetail .../>, bucket.name)` replaces the sketched `setContent(...)`+`setOpen(true)` sequence (cleaner — single call with both panel body and header). `addSuccess(message)` replaces `pushSuccess(message)`. Behavior contract identical.
- **Files modified:** `BucketListPage.tsx`
- **Commit:** `9bf9509`

**2. [Rule 3 - Blocker] node_modules missing in worktree**

- **Found during:** First vitest invocation
- **Issue:** Fresh git worktree had no `web/node_modules/`, vitest binary absent.
- **Fix:** Symlinked `web/node_modules` to the main repo's `web/node_modules` (same workaround Plan 01 documented). Symlink is gitignored.
- **Files modified:** none

**3. [Rule 3 - Blocker] Worktree started at wrong base commit**

- **Found during:** `worktree_branch_check` step
- **Issue:** HEAD was 88570e9 (post-plan-03-04 experimental state) rather than 25d4bdf (the expected base, end of plan 03-02). The soft-reset in the instructions then cleared the working tree because those "extra" files weren't present in HEAD's tree.
- **Fix:** `git reset --soft 25d4bdf` per instructions, then `git reset HEAD` to clear the index, then `git checkout HEAD -- .` to restore working tree from HEAD. Left a clean tree at the expected base.
- **Files modified:** none (housekeeping only)

**4. [Rule 2 - Missing critical functionality] CreateBucketModal didn't reset state between opens**

- **Found during:** Self-review
- **Issue:** Plan didn't specify reset semantics. Without a reset, re-opening the modal after a failed create shows stale `name` + `touched=true` + stale mutation error, which is broken UX (user sees the error for a bucket they didn't try to create this time).
- **Fix:** Added `useEffect` watching `visible` to reset `name`, `touched`, and `mutation.reset()` whenever the modal opens.

### Test-assertion technique adjustment (not a code deviation)

The CreateBucketModal server-error test initially asserted `getByRole('alert')`, but Cloudscape's `Alert` component does not expose that ARIA role. Switched to asserting the visible error text (`getByText(/Request failed with status code 500/i)`) — same observational guarantee (the error message reaches the DOM and is readable by the user).

## Threat-model check

| Threat | Disposition | Mitigation | Evidence |
|--------|-------------|------------|----------|
| T-3-03-01 Tampering (V5 input validation) | mitigate | `validateBucketName()` on every change, submit disabled while invalid, server re-validates | `CreateBucketModal.test.tsx` test 1 verifies submit gating |
| T-3-03-02 Business logic (V11 destructive action) | mitigate | Type-to-confirm exact bucket name (single) or literal "delete" (bulk); Delete button disabled until match | `DeleteBucketModal.test.tsx` tests 1 + 2 |
| T-3-03-03 XSS via error message | mitigate | All server errors rendered via React auto-escape (`{error.message}`); no `dangerouslySetInnerHTML` | `grep -rn dangerouslySetInnerHTML web/src/services/s3/` → no matches |
| T-3-03-04 Route ordering | mitigate | S3 path inserted BEFORE `services/:serviceKey` wildcard | `grep -nE "services/s3\|services/:serviceKey" web/src/app/routes.tsx` — line 107 < line 118 |

## Known Stubs

- `web/src/services/s3/ObjectBrowserPage.tsx` — intentional placeholder per plan. Renders `{bucketName}` Header + "Object browser coming in Plan 04." box. This is NOT a data stub; it's a route placeholder that lets the bucket-name Link target compile and navigate. Plan 04 replaces the file entirely.

No other stubs introduced.

## Threat Flags

None — this plan stays within the threat surface enumerated in its `<threat_model>`.

## Commits

- `e6d6d04` — feat(03-03): S3 routes, copy catalog, uiStore, page shells
- `9bf9509` — feat(03-03): S3 bucket list UI — table, modals, SplitPanel wiring

## Self-Check: PASSED

Files exist:
- FOUND: web/src/services/s3/S3Layout.tsx
- FOUND: web/src/services/s3/BucketListPage.tsx
- FOUND: web/src/services/s3/ObjectBrowserPage.tsx
- FOUND: web/src/services/s3/components/BucketTable.tsx
- FOUND: web/src/services/s3/components/BucketDetail.tsx
- FOUND: web/src/services/s3/components/CreateBucketModal.tsx
- FOUND: web/src/services/s3/components/DeleteBucketModal.tsx
- FOUND: web/src/services/s3/components/columns.ts

Commits present on branch:
- FOUND: e6d6d04 feat(03-03): S3 routes, copy catalog, uiStore, page shells
- FOUND: 9bf9509 feat(03-03): S3 bucket list UI — table, modals, SplitPanel wiring
