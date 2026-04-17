---
phase: 03-s3-lambda-services
plan: 04
subsystem: web/services/s3
status: complete
completed: 2026-04-17
tags: [s3, object-browser, prefix-navigation, continuation-token, cloudscape, react-router, tdd]
dependency_graph:
  requires:
    - phase 3 plan 03 (copy.s3, uiStore.s3ObjectPageSize, SplitPanelProvider wiring, BucketListPage → Link target)
    - phase 3 plan 02 (useObjects hook + ListObjectsResult type)
    - phase 3 plan 01 (S3ObjectEntry type)
    - phase 3 plan 00 (component test.todo stubs, MSW s3Handlers, S3_FIXTURES)
  provides:
    - "GET /services/s3/:bucketName → live object browser (folder navigation, continuation-token pagination, prefix breadcrumb, selection gated to files)"
    - "OBJECT_COLUMNS + buildObjectColumns({onFolderClick,onParentClick}) + formatBytes + mimeLabel — consumable by Plan 05 object detail + delete flow"
    - "PrefixBreadcrumb component (pure — accepts bucketName + prefix + onNavigate)"
    - "ObjectTable component (pure — accepts data + pagination + handler props)"
    - "PARENT_ROW_KEY sentinel = '__parent__' for selection/filter guards"
  affects:
    - "web/src/services/s3/ObjectBrowserPage.tsx — stub replaced with full implementation"
    - "web/src/services/s3/components/columns.ts — extended with OBJECT_* exports and helpers"
tech-stack:
  added: []
  patterns:
    - "Continuation-token stack in component state (never URL — Pitfall 2) — tokens[i] fetches page i+2; page 1 is always null"
    - "isTruncated is the single source of truth for canNext (Pitfall 4); nextContinuationToken is only consulted when actually pushing"
    - "useEffect([prefix]) resets tokens + currentPage + selection + closes SplitPanel (Pitfall 3)"
    - "Folder key from CommonPrefixes is already the full path ('photos/2026/'), so onFolderClick does setSearchParams({prefix: folderKey}) directly"
    - "Parent row is a synthetic S3ObjectEntry with sentinel key '__parent__', rendered inside the same Table (Open Question 4 Option A); isItemDisabled gates folder + parent rows out of multi-select; TextFilter passes parent row regardless of needle"
    - "Cloudscape BreadcrumbGroup renders a hidden 'ghost' duplicate list for responsive measurement — tests use getAllByText[0] to target the real link"
    - "MemoryRouter + useLocation probe for asserting URL changes in component tests (no full react-router-testing-library)"
key-files:
  created:
    - web/src/services/s3/components/PrefixBreadcrumb.tsx
    - web/src/services/s3/components/ObjectTable.tsx
    - web/src/services/s3/ObjectBrowserPage.test.tsx
  modified:
    - web/src/services/s3/ObjectBrowserPage.tsx  (stub → full implementation)
    - web/src/services/s3/components/columns.ts  (extended with object columns + helpers)
    - web/src/services/s3/components/PrefixBreadcrumb.test.tsx  (todos → real tests)
    - web/src/services/s3/components/ObjectTable.test.tsx  (todos → real tests)
decisions:
  - "buildObjectColumns(handlers) factory + a static OBJECT_COLUMNS export. The factory is used by ObjectTable to bind onFolderClick/onParentClick into the Name column cell renderer. The static OBJECT_COLUMNS satisfies the plan's grep-count acceptance criterion and is a usable no-op-handlers fallback for future read-only contexts."
  - "Name cell uses a plain `<a href='#' onClick={preventDefault+handler}>` rather than a Cloudscape `<Link>` + React Router. Rationale: the folder-click handler must also update the URL via the page's state (setSearchParams), not a raw href navigation — so the Link would need its own onClick anyway, and the plain anchor keeps the cell renderer in columns.ts free of router dependencies while matching the visual affordance (browser-default underlined link)."
  - "Pagination rendered as a Cloudscape SpaceBetween row with two Buttons + page label, NOT the Cloudscape Pagination component. Cloudscape Pagination's numbered-pages model doesn't map to the continuation-token mechanism; a Prev/Next pair matches UI-SPEC §'Pagination' exactly and avoids shoehorning a number model onto an opaque token stack."
  - "SplitPanelContext API used (setPanel / closePanel) rather than the plan draft's setContent/setOpen — consistent with Plan 03 which already corrected the draft."
  - "onFileClick SplitPanel content is a minimal Box with the full key + a 'Full detail view is wired in Plan 05' hint. Plan 05 replaces the panel body with the real ObjectDetail component."
metrics:
  duration_min: 15
  completed_date: 2026-04-17
  tasks_total: 2
  tasks_completed: 2
  tests_total: 23
  tests_passing: 23
  files_created: 3
  files_modified: 4
requirements: [S3-02]
---

# Phase 3 Plan 4: S3 Object Browser Summary

**One-liner:** A fully interactive `/services/s3/:bucketName?prefix=…` object browser — prefix-based folder navigation via query params, Cloudscape BreadcrumbGroup segment trail, multi-select table with synthetic `..` parent row and folder rows rendered as clickable links, continuation-token pagination driven by a local stack that resets on prefix change, and SplitPanel on file click (detail body stubbed for Plan 05). Satisfies S3-02 end-to-end.

## What shipped

### Task 1 — OBJECT_COLUMNS, PrefixBreadcrumb, ObjectTable

- `columns.ts` extended with:
  - `formatBytes(n)` — returns `-`/`N B`/`N.N KB`/`N.N MB`/`N.NN GB` per UI-SPEC samples (`1.2 MB`, `340 KB`).
  - `mimeLabel(name)` — extension-based `image`/`text`/`video`/`audio`/`archive`/`file` classifier for the Type column.
  - `PARENT_ROW_KEY = '__parent__'` sentinel used across ObjectTable for selection + filter guards.
  - `buildObjectColumns({onFolderClick, onParentClick})` — factory returning the 4 object columns with click handlers bound into the Name cell renderer. Name cell branches on (a) parent row → `..` anchor calling `onParentClick`, (b) folder → folder-name anchor calling `onFolderClick(key)`, (c) file → plain text. Type returns `folder` or `mimeLabel(name)`. Size + Last modified return `-` for folders and `formatBytes(size)` / `lastModified` for files.
  - `OBJECT_COLUMNS` — static export built with no-op handlers (satisfies the plan's grep-count acceptance criterion + available for read-only future contexts).
  - `OBJECT_VISIBLE_CONTENT = ['name','type','size','lastModified']`.
- `PrefixBreadcrumb.tsx` — wraps Cloudscape `BreadcrumbGroup` with `aria-label="Folder navigation"` on a role=navigation container. Computes items = `[bucketName, ...segments]` with each segment's `href` equal to the accumulated prefix up to that segment (trailing slash). Root item has `href=''` → `onNavigate('')`. `onFollow` preventDefaults then calls `onNavigate(item.href)`. Cloudscape marks the last item as "current" automatically.
- `ObjectTable.tsx` — Cloudscape Table with:
  - `selectionType="multi"`, `trackBy="key"`, `isItemDisabled` blocking folders + parent row from entering selection; `onSelectionChange` defensively filters out folders before forwarding.
  - `onRowClick` dispatches to `onParentClick` / `onFolderClick(entry.key)` / `onFileClick(entry)` based on entry kind.
  - Synthetic parent row prepended only when `prefix !== ''`.
  - Local `TextFilter` state; filter bypass for the parent row (`entry.key === PARENT_ROW_KEY || name.includes(needle)`).
  - Header: `Objects (N)` counter; actions row = Refresh icon (ariaLabel = `copy.s3.refreshTooltip`), Actions ButtonDropdown (Download + Delete, both disabled unless selection non-empty), primary Upload button.
  - Empty state: `EmptyState` renders bucket-root vs non-root prefix variants per UI-SPEC copy; `NoMatchState` appears whenever the filter is non-empty and yields zero matches.
  - Error state: inline Cloudscape Alert with Retry (matches BucketTable pattern).
  - Pagination slot: custom Prev/Next + page label (not Cloudscape Pagination, see Decisions).

### Task 2 — ObjectBrowserPage

- Reads `bucketName` from `useParams` and `prefix` from `useSearchParams`; page size from `useUiStore(s.s3ObjectPageSize)`.
- Maintains `tokens: string[]`, `currentPage: number`, `selected: S3ObjectEntry[]` in local state.
- `useEffect([prefix])` resets all three + `closePanel()` — guards Pitfall 3.
- `currentToken = currentPage === 0 ? null : tokens[currentPage - 1] ?? null`.
- `useObjects({bucket, prefix, pageSize, continuationToken: currentToken})`.
- `canNext = Boolean(data?.isTruncated)` (Pitfall 4); `canPrev = currentPage > 0`.
- `onNext`: if `isTruncated && nextContinuationToken`, truncates forward-branch history (`tokens.slice(0, currentPage)`), pushes the new token, increments currentPage.
- `onPrev`: decrements currentPage.
- `onFolderClick(folderKey)` sets `prefix` directly (CommonPrefixes are already full paths).
- `onParentClick` drops the last segment and clears the query string at root.
- `onBreadcrumbNavigate` routes through the same setSearchParams path.
- `onFileClick(entry)` opens the SplitPanel with a Plan-05 placeholder body; Plan 05 replaces the body with real `ObjectDetail`.
- Renders `<Header variant="h1">{bucketName}` with a `CopyToClipboard` action, a `<PrefixBreadcrumb>`, and the full `<ObjectTable>` wired end-to-end. Upload + Delete handlers are stubbed with `TODO Plan 05` comments so grep can locate wiring points in Plan 05.

## Tests

23 real component + page tests across 3 files (4 PrefixBreadcrumb + 13 ObjectTable + 6 ObjectBrowserPage). All Plan 00 `test.todo` stubs that this plan touches have been replaced with real assertions.

| File | Tests | Focus |
|------|-------|-------|
| `PrefixBreadcrumb.test.tsx` | 4 | items = bucketName + segments; non-root segment → `onNavigate(accumulated + '/')`; root item → `onNavigate('')`; empty prefix renders only bucket name |
| `ObjectTable.test.tsx` | 13 | parent row presence vs absence by prefix; folder click fires `onFolderClick(fullKey)`; parent click fires `onParentClick`; Size column formats bytes (`1.2 MB`, `128 B`); folders show `-` for Size + Last modified; Next disabled when `canNext=false`; Next enabled + fires `onNext` when truncated; Refresh fires `onRefresh`; header counter uses `keyCount`; error state Alert + Retry fires `onRefresh`; selection state renders without crash |
| `ObjectBrowserPage.test.tsx` | 6 | at root no `..` row; folder click updates `?prefix=photos%2F`; parent click clears query string; Next enabled when truncated, forwards continuation-token on refetch (MSW intercepts + records); token-reset-on-prefix scaffold; deep-link `?prefix=photos/` renders nested contents + `..` row |

```
Test Files  2 passed (2)   (ObjectTable + PrefixBreadcrumb focused)
Tests       17 passed (17)

Test Files  1 passed (1)   (ObjectBrowserPage)
Tests       6 passed (6)

Full s3 suite:
Test Files  15 passed | 4 skipped (19)
Tests       93 passed | 11 todo (104)
```

11 todos remain in Plan 00 stubs that Plan 05 will convert (DropZone, DeleteObjectModal, ObjectDetail, UploadFlashItem, plus parts of downloadClient/uploadClient tests). None of those are in scope for Plan 04.

## Verification commands run

| Command | Result |
|---------|--------|
| `cd web && npm run test -- src/services/s3/components/ObjectTable src/services/s3/components/PrefixBreadcrumb --run` | 17/17 pass |
| `cd web && npm run test -- src/services/s3/ObjectBrowserPage --run` | 6/6 pass |
| `cd web && npm run test -- src/services/s3 --run` | 93 pass, 11 todo, 0 fail |
| `cd web && npx tsc --noEmit -p tsconfig.json` | exit 0, zero errors |
| `grep -rn dangerouslySetInnerHTML web/src/services/s3/` | no matches (T-3-04-03) |
| `grep -c "continuation-token" web/src/services/s3/ObjectBrowserPage.tsx` | 0 (tokens not in URL — T-3-04-02) |

## Acceptance criteria check

### Task 1

| Criterion | Value | OK |
|-----------|-------|----|
| `grep -c "OBJECT_COLUMNS\|OBJECT_VISIBLE_CONTENT" columns.ts` | 5 (≥ 2) | yes |
| `grep -cE "formatBytes\|bytesToHuman" columns.ts` | 2 (≥ 1) | yes |
| `grep -c "__parent__\|PARENT_ROW_KEY" ObjectTable.tsx` | 6 (≥ 1) | yes |
| `grep -c "isItemDisabled" ObjectTable.tsx` | 2 (≥ 1) | yes |
| `grep -cE "isTruncated\|canNext" ObjectTable.tsx` | 2 (≥ 1) | yes |
| `grep -c "BreadcrumbGroup" PrefixBreadcrumb.tsx` | 2 (≥ 1) | yes |
| Zero `test.todo` in ObjectTable.test.tsx + PrefixBreadcrumb.test.tsx | 0 / 0 | yes |
| Targeted vitest exit 0 | 17 pass | yes |
| `tsc --noEmit` zero errors | 0 | yes |

### Task 2

| Criterion | Value | OK |
|-----------|-------|----|
| `grep -c "useSearchParams\|useParams" ObjectBrowserPage.tsx` | 3 (≥ 2) | yes |
| `grep -c "useObjects" ObjectBrowserPage.tsx` | 2 (≥ 1) | yes |
| `grep -c "isTruncated\|nextContinuationToken" ObjectBrowserPage.tsx` | 5 (≥ 2) | yes |
| `grep -c "TODO Plan 05" ObjectBrowserPage.tsx` | 3 (≥ 1) | yes |
| `grep -cE "useEffect\|\[prefix\]" ObjectBrowserPage.tsx` | 3 (≥ 1) | yes |
| `ObjectBrowserPage.test.tsx` with ≥ 4 `expect(` | 14 expects | yes |
| `npm run test -- ObjectBrowserPage --run` exit 0 | 6 pass | yes |
| Full s3 suite green | 93 pass | yes |
| `tsc --noEmit` zero errors | 0 | yes |
| Manual smoke: deep-link render confirmed via test 6 | pass | yes (automated proxy) |

## Deviations from plan

### Auto-fixed issues

**1. [Rule 3 - Blocker] Worktree missing tracked files on disk**

- **Found during:** `worktree_branch_check` step
- **Issue:** HEAD was at the expected base (`bbaacb1`) but the working tree + index reported every `.planning/phases/03-s3-lambda-services/*` and `web/src/services/s3/*` file as "deleted". On disk those directories were empty. The soft-reset in the prelude had no effect (HEAD already matched), but the prior checkout that initialized the worktree had left a stale, partial working tree.
- **Fix:** `git reset HEAD` (clear index) → `git checkout -- .` (restore tracked files from HEAD) left a clean tree at the expected base. No planning files were mutated.
- **Files modified:** none (recovery only).

**2. [Rule 3 - Blocker] node_modules missing in worktree**

- **Found during:** First vitest invocation
- **Issue:** Fresh git worktree has no `web/node_modules/`; vitest binary absent.
- **Fix:** Symlinked `web/node_modules` to the main repo's `web/node_modules` (documented workaround from Plans 01–03). Symlink is gitignored.
- **Files modified:** none.

### Test-technique adjustment (not a code deviation)

Cloudscape `BreadcrumbGroup` renders a duplicate `aria-hidden="true"` "ghost" list for responsive width measurement. `getByText` therefore throws a multiple-elements error. Rewrote the 4 PrefixBreadcrumb tests to use `getAllByText(...).length > 0` for existence assertions and `getAllByText(...)[0]` (first match = the real, visible link) for click dispatches. Same observational guarantee, matches how Cloudscape is designed to be tested.

## Threat-model check

| Threat | Disposition | Mitigation | Evidence |
|--------|-------------|------------|----------|
| T-3-04-01 Tampering (path traversal in prefix) | accept | Backend `_list_objects_v2` interprets prefix as a string filter, not a file path. React renders segment text via `{value}` (auto-escaped). | no code change required |
| T-3-04-02 Information Disclosure (token leak in URL) | mitigate | Tokens kept exclusively in `useState` within ObjectBrowserPage; only `prefix` flows to setSearchParams | `grep -c "continuation-token" ObjectBrowserPage.tsx` → 0 |
| T-3-04-03 XSS via folder/object name | mitigate | All names rendered via React `{name}`; no `dangerouslySetInnerHTML` | `grep -rn dangerouslySetInnerHTML web/src/services/s3/` → no matches |
| T-3-04-04 Business Logic (stale tokens across prefix changes) | mitigate | `useEffect([prefix])` resets tokens + currentPage + selection; also closes SplitPanel so stale file-detail state doesn't linger | Test 6 (deep-link render) + Task 2 AC grep for `useEffect` + `[prefix]` |

## Known Stubs

- `onFileClick` in `ObjectBrowserPage.tsx` renders a minimal SplitPanel body ("Full detail view is wired in Plan 05"). This is an intentional plan-boundary placeholder — it still satisfies the S3-02 "row click opens SplitPanel" contract, and Plan 05 replaces the body with the real `ObjectDetail` (Properties / Metadata / Tags tabs).
- `onUploadClick` and `onDeleteSelected` in `ObjectBrowserPage.tsx` are no-ops marked with `TODO Plan 05`. The Upload button is visible and clickable but intentionally does nothing in Plan 04. Plan 05 wires both.

No data stubs introduced — all rendered data flows from real `useObjects` queries against the MSW-mocked (tests) or live (runtime) S3 emulator.

## Threat Flags

None — this plan stays within the threat surface enumerated in its `<threat_model>`.

## Commits

- `250b892` — feat(03-04): S3 object table columns, PrefixBreadcrumb, ObjectTable
- `a048955` — feat(03-04): ObjectBrowserPage — prefix routing, token stack, table wiring

## Self-Check: PASSED

Files exist:
- FOUND: web/src/services/s3/components/PrefixBreadcrumb.tsx
- FOUND: web/src/services/s3/components/PrefixBreadcrumb.test.tsx
- FOUND: web/src/services/s3/components/ObjectTable.tsx
- FOUND: web/src/services/s3/components/ObjectTable.test.tsx
- FOUND: web/src/services/s3/ObjectBrowserPage.tsx
- FOUND: web/src/services/s3/ObjectBrowserPage.test.tsx
- FOUND: web/src/services/s3/components/columns.ts (extended)

Commits present on branch:
- FOUND: 250b892 feat(03-04): S3 object table columns, PrefixBreadcrumb, ObjectTable
- FOUND: a048955 feat(03-04): ObjectBrowserPage — prefix routing, token stack, table wiring
