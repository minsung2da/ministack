---
phase: 03-s3-lambda-services
plan: 05
subsystem: s3
tags: [s3, upload, download, object-detail, delete, splitpanel, flashbar]
requirements: [S3-03, S3-04]
dependency-graph:
  requires:
    - 03-04 (ObjectBrowserPage navigation + table)
    - 03-02 (useObjectMetadata, useObjectTags, useDeleteObject(s))
    - 03-01 (uploadClient, downloadClient, encodeS3Key)
  provides:
    - DropZone (drag-drop wrapper, Pitfall 2 counter)
    - UploadFlashItem / DownloadFlashItem (pure-presentational lifecycle items)
    - ObjectDetail (SplitPanel Properties/Metadata/Tags)
    - DeleteObjectModal (single + bulk type-to-confirm)
    - ObjectBrowserPage with full upload / download / detail / delete wiring
  affects:
    - web/src/services/s3/components/ObjectTable.tsx (adds optional onDownloadSelected prop)
tech-stack:
  added: []
  patterns:
    - "Concurrency-3 upload pool using async workers pulling from a shared queue; Pitfall 6 once-per-batch invalidation via ref guard."
    - "Pure-presentational Flashbar item factories (UploadFlashItem/DownloadFlashItem return FlashbarProps.MessageDefinition)."
    - "Hidden <input type='file' multiple> ref'd from the Upload button — simplest UI-SPEC resolution for Open Question #3."
    - "SplitPanel open on row click with ObjectDetail, which itself triggers DeleteObjectModal via onRequestDelete callback."
key-files:
  created:
    - web/src/services/s3/components/DropZone.tsx
    - web/src/services/s3/components/DropZone.css
    - web/src/services/s3/components/UploadFlashItem.tsx
    - web/src/services/s3/components/DownloadFlashItem.tsx
    - web/src/services/s3/components/ObjectDetail.tsx
    - web/src/services/s3/components/DeleteObjectModal.tsx
  modified:
    - web/src/services/s3/ObjectBrowserPage.tsx
    - web/src/services/s3/components/ObjectTable.tsx
    - web/src/services/s3/components/DropZone.test.tsx
decisions:
  - "Use a direct async worker pool (UPLOAD_CONCURRENCY=3) in ObjectBrowserPage instead of calling uploadBatch, because the UI needs to thread progress + cancel handles through React state per file; uploadBatch's BatchResult summary loses intermediate progress fidelity."
  - "Guard batch-invalidation with invalidatedBatchesRef (Set of batchIds) inside finalizeBatchIfDone so React 19 re-renders cannot fire invalidateQueries twice (Pitfall 6)."
  - "Flashbar is assembled by concatenating [general flash, upload items, download items] each render — the pure-presentational factories mean we never duplicate Cloudscape state."
metrics:
  duration: "prior sessions + ~1 wall-clock session for Task 3 wiring"
  tasks_completed: 3
  human_verify_pending: 1
---

# Phase 03 Plan 05: S3 Upload / Download / Detail / Delete Summary

JWT-style one-liner is wrong here; actual: concurrency-3 drag-and-drop uploads with per-file Flashbar progress, sequential Blob downloads, SplitPanel object detail with Properties/Metadata/Tags tabs, and single+bulk type-to-confirm deletes wired end-to-end into ObjectBrowserPage.

## Scope Delivered

Tasks 1–3 complete. Task 4 (human UAT) is pending — see "Human UAT Pending" below.

| Task | Name | Status | Commit |
|------|------|--------|--------|
| 1 | DropZone + UploadFlashItem + DownloadFlashItem primitives | DONE | `a8da580` |
| 2 | ObjectDetail SplitPanel tabs + DeleteObjectModal | DONE | `97ea139` |
| 3 | Wire everything into ObjectBrowserPage | DONE | `13be79f` |
| 4 | Human end-to-end verification against live :4566 | PENDING (see below) | — |

## Task-Level Evidence

### Task 1 — DropZone + Upload/DownloadFlashItem primitives (commit `a8da580`)

- `DropZone.tsx`: dragDepth counter (increment on dragEnter, decrement on dragLeave) defeats Pitfall 2's child-to-child flicker. Reads only `dataTransfer.files`; never `getData('text/uri-list')` → T-3-05-04 mitigation.
- `DropZone.css`: all styling via `--awsui-*` design-token CSS vars — no hex or px literals.
- `UploadFlashItem.tsx`: pure `FlashbarProps.MessageDefinition` factory for the 5 lifecycle states (`queued | in-progress | success | failure | cancelled`). ProgressBar in-progress; 5s auto-dismiss on success (once-per-id via module-scoped Set); Retry link in failure; Cancel button in in-progress.
- `DownloadFlashItem.tsx`: 3-state factory (`in-progress | success | failure`) — downloads have no progress because `fetch→Blob` doesn't expose byte counters.

### Task 2 — ObjectDetail + DeleteObjectModal (commit `97ea139`)

- `ObjectDetail.tsx`: Cloudscape Tabs (Properties / Metadata / Tags). Properties KeyValuePairs. Metadata renders `useObjectMetadata` output with `x-amz-meta-` already stripped by the hook (T-3-05-03 safe because React auto-escapes `{value}`). Tags renders `useObjectTags`. Header actions: CopyToClipboard ×2, Download (primary), Delete (delegates to `onRequestDelete`).
- `DeleteObjectModal.tsx`: Type-to-confirm — single mode requires the full object key; bulk mode requires `"delete"`. Uses `useDeleteObject(bucket, prefix)` or `useDeleteObjects(bucket, prefix)` which invalidate `objectsQueryKey(bucket, prefix)` on success. Resolves `BatchDeleteResult` for both modes (uniform caller contract).

### Task 3 — ObjectBrowserPage wiring (commit `13be79f`)

Changes:
1. Removed both `TODO Plan 05` markers.
2. Added a hidden `<input type="file" multiple ref={fileInputRef}>`; the Upload button triggers `fileInputRef.current?.click()`. `onChange` resets the input value so picking the same file twice re-fires.
3. Wrapped `ObjectTable` in `<DropZone onDrop={startUploads} currentPrefix={prefix} />`.
4. `startUploads(files)` — for each file builds `key = prefix + file.name` (basename only; T-3-05-01 compliance; never `webkitRelativePath`), pushes `UploadItem` with status `queued`, then drains the queue via 3 async workers. Each worker awaits its item's terminal transition before pulling the next, guaranteeing at most 3 uploads in-flight.
5. `finalizeBatchIfDone(batchId)` — called from the `.finally` of each upload promise; walks the current uploads list for that batch; if all terminal AND at least one success, invalidates `objectsQueryKey(bucket, prefix)` exactly once (guarded by `invalidatedBatchesRef: Set<string>` — Pitfall 6).
6. Extended `ObjectTable` with optional `onDownloadSelected` prop; dropdown's `onItemClick` routes `download` → `onDownloadSelected()`, `delete` → `onDeleteSelected()`.
7. `runDownloadsSequentially(entries)` — iterates selected files, creates a `DownloadFlashItem`, awaits `downloadObject(bucket, key)`, transitions to `success` (5s auto-dismiss) or `failure`.
8. `onFileClick(entry)` now opens SplitPanel with `<ObjectDetail bucket={…} entry={entry} onRequestDelete={() => setDeleteKeys([entry.key])} />`.
9. `<DeleteObjectModal>` rendered conditionally when `deleteKeys !== null`. `onDeleted` pushes the correct success copy (single / bulk) and iterates errors into individual Flash items.
10. Flashbar assembled per render by concatenating `[flash, uploadFlashItems, downloadFlashItems]` — the pure-presentational factories mean Cloudscape owns no duplicated state.

### Verification Evidence

```
cd web && npx tsc --noEmit -p tsconfig.json
# exit 0, zero errors

cd web && npm run test -- src/services/s3 --run
#  Test Files  19 passed (19)
#  Tests       113 passed (113)

cd web && npm run test -- src/services/s3/ObjectBrowserPage src/services/s3/components/UploadFlashItem --run
#  Test Files  2 passed (2)
#  Tests       13 passed (13)
```

### Acceptance Criteria (Task 3)

| Criterion | Result |
|-----------|--------|
| `TODO Plan 05` count == 0 | 0 |
| `<DropZone` count >= 1 | 1 |
| `uploadObject\|uploadBatch` count >= 1 | 2 |
| `invalidateQueries` count >= 1 | 2 |
| `<ObjectDetail\|<DeleteObjectModal` count >= 2 | 3 |
| `downloadObject` count >= 1 | 2 |
| `fileInputRef\|type="file"` count >= 1 | 5 |
| zero `test.todo` under web/src/services/s3 | confirmed empty |
| full S3 test suite green | 113/113 |
| `tsc --noEmit` | exit 0 |

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 1 — Bug] Fix TS2783 in DropZone.test.tsx mockDataTransfer**
- **Found during:** Task 3 `tsc --noEmit` (pre-committed from Task 1 a8da580).
- **Issue:** `{ length: files.length, item: …, ...files }` — the spread after `length` re-writes the key, so TypeScript 5.7 reports `'length' is specified more than once`.
- **Fix:** Reordered keys so the spread comes first, then `length` + `item` assert the final values.
- **Files modified:** `web/src/services/s3/components/DropZone.test.tsx`
- **Commit:** `13be79f`

**2. [Rule 2 — Missing critical functionality] `ObjectTable.onDownloadSelected` prop**
- **Found during:** Task 3 — Plan 04 left the Actions dropdown `download` item wired only to `onDeleteSelected` (download had no handler). Required to satisfy S3-03 "bulk download".
- **Fix:** Added an optional `onDownloadSelected?: () => void` prop to `ObjectTable`; `onItemClick` routes `download` → that prop. ObjectBrowserPage wires the sequential download orchestration. Existing tests unaffected because the prop is optional.
- **Files modified:** `web/src/services/s3/components/ObjectTable.tsx`, `web/src/services/s3/ObjectBrowserPage.tsx`
- **Commit:** `13be79f`

No other deviations.

## Known Stubs

None. All wired data is live (`useObjects`, `useObjectMetadata`, `useObjectTags`, real upload XHR, real fetch download, real DeleteObject(s)).

## Threat Model Mitigations

| Threat | Disposition | Evidence in code |
|--------|-------------|------------------|
| T-3-05-01 (webkitRelativePath tamper) | mitigate | `startUploads` uses `file.name` basename only; inline comment `D-08: basename only. NEVER webkitRelativePath`. |
| T-3-05-02 (Blob URL leak) | mitigate | `downloadClient.downloadObject` schedules `URL.revokeObjectURL` after 60s. |
| T-3-05-03 (XSS via metadata) | mitigate | ObjectDetail renders values via `{value}` (auto-escaped). `grep dangerouslySetInnerHTML web/src/services/s3` returns zero. |
| T-3-05-04 (uri-list text drag) | mitigate | DropZone reads only `dataTransfer.files`; never `getData`. |
| T-3-05-05 (accidental bulk delete) | mitigate | DeleteObjectModal requires exact-match type-to-confirm (full key single / literal `"delete"` bulk). Button disabled until match. |
| T-3-05-06 (self-DoS many files) | mitigate | `UPLOAD_CONCURRENCY = 3`; per-file Cancel button. |
| T-3-05-07 (URL-encoding) | mitigate | `encodeS3Key` (Plan 01) used by upload/download/delete paths; per-segment `encodeURIComponent`. |

## Human UAT Pending

Task 4 of the plan is a `checkpoint:human-verify` gate. Verification has not been performed in this agent session and must be completed by the human operator against a live MiniStack at `localhost:4566` before the plan is considered fully closed.

**Prerequisite:** MiniStack running on `localhost:4566` with the frontend built and served by the console. If backend + frontend are not currently running: run `make dev` (or the equivalent project command) to start the backend + Vite dev server; visit `http://localhost:4566/_console/` and confirm the console shell appears.

Perform all 28 steps below in order. Respond with **`approved`** once all pass; otherwise describe the failure and which step.

### Bucket list (S3-01)
1. Click "S3" in the left sidebar → URL becomes `/_console/services/s3`; page heading reads "S3".
2. Click "Create bucket" → modal opens. Type `TEST-BAD` → error "Bucket name cannot contain uppercase letters." appears. Clear. Type `ab` → error "Bucket name must be at least 3 characters." Clear. Type `ministack-e2e-$(date +%s)` (lowercase) → Create button enables. Submit → modal closes, Flashbar success "Bucket {name} created successfully.", new bucket appears in table.
3. Click the created bucket row (NOT the name link) → SplitPanel opens at bottom showing Name / Region / Creation date.
4. Click the bucket NAME link → URL becomes `/_console/services/s3/{name}`; page heading shows bucket name.

### Object browser (S3-02 + S3-03)
5. See empty-bucket state "Empty bucket" with "Drag files here to upload, or use the Upload button above."
6. Click "Upload" button → native file picker opens. Select 3 files of varying size (>= 1 MB, ~500 KB, ~10 KB). Confirm.
7. Observe 3 Flashbar items: queued → in-progress with ProgressBar → success. Concurrency cap holds: if you select >3 files, only 3 are in-progress at a time.
8. After uploads finish: table auto-refreshes ONCE; all 3 files appear.
9. Drag-and-drop: drag one additional file from OS file manager onto the table area. Drop-zone shows dashed info-blue border with overlay "Drop files to upload to bucket root". Release → one upload Flashbar appears → succeeds → table refreshes with new file.
10. Filter: type part of a filename into TextFilter → table filters.
11. Create a folder by uploading a file with key-like semantics (not directly supported — instead, upload into a prefix after step 12).

### Prefix navigation (S3-02)
12. Use AWS CLI or another method to create a nested key (or upload a file with `/` in name via the drop zone — Phase 3 flattens to basename per D-08; so use CLI: `aws --endpoint-url http://localhost:4566 s3 cp test.txt s3://{bucket}/photos/2026/test.txt`).
13. Refresh the page → see folder row `photos/` with folder icon and size `-`.
14. Click `photos/` → URL becomes `?prefix=photos/`; breadcrumb shows `{bucket} > photos`; table shows folder `2026/` and synthetic `..` row.
15. Click `2026/` → URL `?prefix=photos/2026/`; table shows `test.txt`; `..` row present.
16. Click `..` → returns to `?prefix=photos/`. Click bucket name in breadcrumb → back to root.

### Object detail + download (S3-04 + S3-03)
17. Click on a file row (not the name, just anywhere on row) → SplitPanel opens with Properties / Metadata / Tags tabs.
18. Properties tab shows Key, Size, Content type, Last modified, ETag. Copy key button copies to clipboard.
19. Click Download in SplitPanel header → browser saves file. Check downloaded file content matches the uploaded file.
20. Metadata tab: if object was uploaded with `--metadata author=alice` via CLI, the tab shows `author: alice` (prefix stripped). Otherwise shows empty-state copy.
21. Tags tab: shows "No tags on this object." if none set.

### Delete flows
22. Bulk-select 2 files via checkboxes → Actions → Delete → modal "Delete 2 objects" requires typing "delete"; type it → click Delete → Flashbar "2 objects deleted successfully.", table refreshes.
23. Delete single: SplitPanel → Delete → type full key → success.
24. Delete bucket while not empty: go back to bucket list, select non-empty bucket, Actions → Delete → type bucket name → Delete → Flashbar ERROR "Cannot delete bucket {name}: bucket is not empty. Delete all objects first." Modal closed.
25. Empty the bucket via CLI (`aws s3 rm s3://{bucket} --recursive`), refresh, delete bucket → Flashbar success, bucket disappears.

### Error handling
26. Stop the backend. Refresh page → table shows Alert "Could not load buckets ... Retry". Restart backend, click Retry → list populates.

### Accessibility
27. Tab through the object table. Checkbox gets focus only on file rows — folder rows and `..` row are skipped for selection.
28. The Upload button is keyboard-reachable with visible focus ring.

### Resume signal

Respond with `approved` or describe issues step-by-step.

## Self-Check: PASSED

Verified claims:
- `web/src/services/s3/ObjectBrowserPage.tsx` — FOUND (modified in `13be79f`).
- `web/src/services/s3/components/ObjectTable.tsx` — FOUND (modified in `13be79f`).
- `web/src/services/s3/components/DropZone.test.tsx` — FOUND (modified in `13be79f`).
- Commit `13be79f` — FOUND via `git log --all`.
- Commit `97ea139` (Task 2) — FOUND.
- Commit `a8da580` (Task 1) — FOUND.
- `tsc --noEmit -p tsconfig.json` — exit 0.
- `npm run test -- src/services/s3 --run` — 19 files / 113 tests passed.
