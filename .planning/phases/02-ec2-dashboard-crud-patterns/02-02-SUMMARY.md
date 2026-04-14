---
phase: 02-ec2-dashboard-crud-patterns
plan: 02
subsystem: frontend/ec2-ui
tags: [cloudscape, react, zustand, split-panel, routing, table, modal]
dependency_graph:
  requires: [02-01]
  provides: [CRUD-components, SplitPanelContext, Ec2Dashboard, EC2-routes]
  affects: [02-03, 02-04, 02-05, 02-06, 02-07]
tech_stack:
  added:
    - "@cloudscape-design/collection-hooks (useCollection hook)"
  patterns:
    - "SplitPanelContext: provider+hook pattern for child-to-parent panel wiring"
    - "ResourceTable split into two variants (text/property) to satisfy useCollection type constraints"
    - "EC2 routes placed before :serviceKey wildcard to avoid route shadowing"
key_files:
  created:
    - web/src/contexts/SplitPanelContext.tsx
    - web/src/services/ec2/components/ResourceTable.tsx
    - web/src/services/ec2/components/StatusBadge.tsx
    - web/src/services/ec2/components/DeleteModal.tsx
    - web/src/services/ec2/components/CreateModal.tsx
    - web/src/services/ec2/components/SplitPanelDetail.tsx
    - web/src/services/ec2/components/FlashNotifications.tsx
    - web/src/services/ec2/pages/Ec2Dashboard.tsx
    - web/src/services/ec2/pages/Ec2TabPlaceholder.tsx
  modified:
    - web/src/app/ConsoleShell.tsx
    - web/src/stores/uiStore.ts
    - web/src/app/routes.tsx
decisions:
  - "ResourceTable split into ResourceTableText and ResourceTableProperty sub-components because useCollection returns different hook result shapes (filterProps vs propertyFilterProps) depending on options — cannot be unified in one useCollection call"
  - "PropertyFilter i18nStrings defined as module-level constant to avoid recreation on each render"
  - "Ec2Dashboard renders Tabs with null content (content rendered via Outlet below) to avoid double-rendering"
metrics:
  duration: "~7 minutes"
  completed_date: "2026-04-14"
  tasks: 2
  files_created: 9
  files_modified: 3
---

# Phase 02 Plan 02: CRUD Components and EC2 Dashboard Shell Summary

Reusable CRUD UI building blocks (ResourceTable with useCollection, StatusBadge, DeleteModal with type-to-confirm, CreateModal, SplitPanelDetail, FlashNotifications with auto-dismiss) plus SplitPanel context wiring through ConsoleShell and a 12-tab EC2 Dashboard synced with URL routing.

## Tasks Completed

| Task | Name | Commit | Key Files |
|------|------|--------|-----------|
| 1 | SplitPanel context, Flashbar, CRUD components | d9ae34e | SplitPanelContext.tsx, ConsoleShell.tsx, uiStore.ts, ResourceTable.tsx, StatusBadge.tsx, DeleteModal.tsx, CreateModal.tsx, SplitPanelDetail.tsx, FlashNotifications.tsx |
| 2 | EC2 Dashboard tab controller and route wiring | 92790ba | Ec2Dashboard.tsx, Ec2TabPlaceholder.tsx, routes.tsx |

## What Was Built

### SplitPanelContext (`web/src/contexts/SplitPanelContext.tsx`)
- `SplitPanelProvider` manages panel/header/isOpen state
- `useSplitPanel()` hook throws if used outside provider (fail-fast)
- ConsoleShell wraps shell in provider; `ConsoleShellInner` reads context and passes `splitPanel` slot to AppLayout
- Split panel locked to `bottom` position per D-06

### Zustand uiStore extensions
- `ec2PageSize` (default 10) and `splitPanelSize` (default 280) added and persisted

### StatusBadge (`StatusBadge.tsx`)
- Maps 14 EC2 state strings to Cloudscape `StatusIndicator` types
- Exports `EC2_STATE_MAP` for reuse in other components

### DeleteModal (`DeleteModal.tsx`)
- Single delete: type-to-confirm with resourceId; `===` strict equality (threat T-02-05)
- Bulk delete: type "delete" or "terminate" (instance-aware)
- Delete button disabled until confirmed; `variant="primary"`

### CreateModal (`CreateModal.tsx`)
- Generic modal wrapper; `children` slot for form fields
- Optional `error` prop renders Alert type="error" above form
- `size` prop: 'small' (480px) or 'medium' (default 600px)

### SplitPanelDetail (`SplitPanelDetail.tsx`)
- Renders Cloudscape Tabs when `tabs` prop provided
- Renders KeyValuePairs in 2-column ColumnLayout when `keyValueItems` provided

### FlashNotifications (`FlashNotifications.tsx`)
- `useFlashNotifications()` hook: manages `FlashbarProps.MessageDefinition[]` state
- `addSuccess`: auto-dismiss after 5000ms via setTimeout; max 3 items (oldest evicted)
- `addError`: manual dismiss only; max 3 items enforced
- Error messages show backend error string but never stack traces (threat T-02-03)

### ResourceTable (`ResourceTable.tsx`)
- Generic `ResourceTable<T>` dispatches to `ResourceTableText` or `ResourceTableProperty` based on `useTextFilter` prop
- `useCollection` from `@cloudscape-design/collection-hooks` provides sorting, filtering, pagination, selection
- Page size from `useUiStore.ec2PageSize`; CollectionPreferences persists choice (10/25/50)
- PropertyFilter with full i18nStrings; TextFilter for list-only resources
- Empty state and no-match state use copy.ts entries

### Ec2Dashboard (`Ec2Dashboard.tsx`)
- 12 tabs defined as const array; active tab derived from URL pathname last segment
- `onChange` navigates via React Router `navigate(id, { replace: true })`
- Renders `<Outlet />` below Tabs for child routes

### Routes (`routes.tsx`)
- `services/ec2` route with 12 child paths inserted before `services/:serviceKey`
- Index redirects to `instances` via `<Navigate to="instances" replace />`
- All 12 tab paths use lazy-loaded `Ec2TabPlaceholder`

## Verification

- `npx tsc --noEmit`: 0 errors
- `npx vitest run`: 16 passed, 0 failed (73 todos from plan stubs, all expected)

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 1 - Bug] useCollection type mismatch for filter props**
- **Found during:** Task 1
- **Issue:** `useCollection` returns `filterProps` for text filtering and `propertyFilterProps` for property filtering — different shapes that cannot be unified in a single call with conditional spreading
- **Fix:** Split `ResourceTable` into two internal sub-components (`ResourceTableText`, `ResourceTableProperty`), each calling `useCollection` with the appropriate options. The exported `ResourceTable` dispatches based on `useTextFilter` prop.
- **Files modified:** `web/src/services/ec2/components/ResourceTable.tsx`
- **Commit:** d9ae34e

**2. [Rule 1 - Bug] PropertyFilter i18nStrings had invalid keys**
- **Found during:** Task 1 TypeScript check
- **Issue:** `filteringLoadingText`, `filteringErrorText`, `filteringFinishedText` are top-level PropertyFilter props, not i18nStrings fields; also `filteringFinishedText` callback typed as `(count: number) => string` but `count` had implicit `any`
- **Fix:** Removed invalid keys from i18nStrings; moved to module-level typed constant
- **Files modified:** `web/src/services/ec2/components/ResourceTable.tsx`
- **Commit:** d9ae34e

## Known Stubs

- `web/src/services/ec2/pages/Ec2TabPlaceholder.tsx`: All 12 tab routes render placeholder text. Intentional — each tab will be wired in plans 02-03 through 02-07.

## Threat Flags

None — all surface introduced matches the plan's threat model entries (T-02-03, T-02-05 both mitigated inline).

## Self-Check: PASSED

- All 12 files confirmed present on disk
- Commits d9ae34e and 92790ba confirmed in git log
- TypeScript: 0 errors
- Vitest: 16/16 passed, 0 failures
