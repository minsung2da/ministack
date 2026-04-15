---
phase: 02-ec2-dashboard-crud-patterns
plan: 08
subsystem: frontend/ec2
tags: [ec2, route-tables, network-interfaces, list-only, read-only, tabs]
dependency_graph:
  requires: [02-01, 02-02, 02-03, 02-04, 02-05, 02-06, 02-07]
  provides: [route-tables-tab, network-interfaces-tab, all-12-ec2-tabs-complete]
  affects: [web/src/app/routes.tsx]
tech_stack:
  added: []
  patterns: [list-only-tab-pattern, useTextFilter, TanStack-Query-staleTime-30s]
key_files:
  created:
    - web/src/services/ec2/api/routeTables.ts
    - web/src/services/ec2/api/networkInterfaces.ts
    - web/src/services/ec2/pages/RouteTablesTab.tsx
    - web/src/services/ec2/pages/NetworkInterfacesTab.tsx
  modified:
    - web/src/app/routes.tsx
  deleted:
    - web/src/services/ec2/pages/Ec2TabPlaceholder.tsx
decisions:
  - Route Tables and Network Interfaces are list-only per D-12 — no mutation hooks added
  - Both tabs use TextFilter (not PropertyFilter) per UI-SPEC for list-only resources
  - selectionType="none" on both tabs since no row-selection actions exist
  - Ec2TabPlaceholder deleted once all 12 tabs have real implementations
metrics:
  duration: 12m
  completed_date: "2026-04-15"
  tasks_completed: 2
  files_changed: 6
---

# Phase 2 Plan 8: Route Tables and Network Interfaces Summary

Route Tables and Network Interfaces list-only tabs with TextFilter, completing all 12 EC2 resource types with no placeholder components remaining.

## Tasks Completed

| Task | Description | Commit | Files |
|------|-------------|--------|-------|
| 1 | Route Tables + Network Interfaces API + list-only tabs | 572738c | routeTables.ts, networkInterfaces.ts, RouteTablesTab.tsx, NetworkInterfacesTab.tsx, routes.tsx, Ec2TabPlaceholder.tsx (deleted) |
| 2 | Checkpoint: full EC2 Dashboard verification | auto-approved | — |

## What Was Built

### Route Tables API (`web/src/services/ec2/api/routeTables.ts`)
- `parseRouteTables(xml)` — parses DescribeRouteTables XML; `isMain` detected via `<associationSet><item><main>true</main>`; `routeCount` from `<routeSet>` item count
- `useRouteTables()` — queryKey `['ec2', 'route-tables']`, staleTime 30,000ms
- No create/delete mutations (D-12: list-only)

### Network Interfaces API (`web/src/services/ec2/api/networkInterfaces.ts`)
- `parseNetworkInterfaces(xml)` — parses DescribeNetworkInterfaces XML from `<networkInterfaceSet><item>`
- `useNetworkInterfaces()` — queryKey `['ec2', 'network-interfaces']`, staleTime 30,000ms
- No create/delete mutations (D-12: list-only)

### RouteTablesTab (`web/src/services/ec2/pages/RouteTablesTab.tsx`)
- Columns: Name, Route Table ID, VPC ID, Main (Yes/No with Badge), Routes (count)
- `useTextFilter={true}` — TextFilter, not PropertyFilter
- `selectionType="none"` — no selection needed (no actions)
- Only action: Refresh button
- Row click → SplitPanel with 5 key-value pairs

### NetworkInterfacesTab (`web/src/services/ec2/pages/NetworkInterfacesTab.tsx`)
- Columns: Name, Network Interface ID, Status (StatusBadge), VPC ID, Subnet ID, Primary private IP
- `useTextFilter={true}` — TextFilter, not PropertyFilter
- `selectionType="none"` — no selection needed (no actions)
- Only action: Refresh button
- Row click → SplitPanel with 6 key-value pairs

### Routes (`web/src/app/routes.tsx`)
- Replaced `Ec2TabPlaceholder` lazy imports with `RouteTablesTab` and `NetworkInterfacesTab`
- All 12 EC2 tab routes now use real components
- `Ec2TabPlaceholder.tsx` deleted — no longer referenced

## Verification Results

| Check | Result |
|-------|--------|
| `npx tsc --noEmit` | Exit 0 — no type errors |
| `npx vitest run` | 16 passed, 73 todo (existing), 12 skipped (existing) — exit 0 |
| `npx vite build` | Exit 0 — built in 76s |
| No Ec2TabPlaceholder references | Confirmed — grep returns NONE |
| All 12 EC2 tabs use real components | Confirmed |

## Task 2: Checkpoint Auto-Approved

Auto-approved per orchestrator instructions. The following verification items were confirmed by automated checks:

- TypeScript compiles with 0 errors
- Full test suite passes (16/16 active tests)
- Vite production build succeeds
- No placeholder components remain in codebase
- All 12 EC2 route paths wired to real lazy-loaded components

Human verification (start MiniStack, navigate to `http://localhost:4566/_console/services/ec2`, spot-check Route Tables and Network Interfaces tabs) is deferred to the phase-level verification gate.

## Deviations from Plan

None — plan executed exactly as written.

## Known Stubs

None. Both new tabs make live API calls (`DescribeRouteTables`, `DescribeNetworkInterfaces`) against the MiniStack emulator. No hardcoded data or placeholder values.

## Threat Flags

None. Both tabs are list-only with no mutation surface. All data originates from localhost emulator (T-02-17 accepted per threat register).

## Self-Check: PASSED

- `web/src/services/ec2/api/routeTables.ts` — FOUND
- `web/src/services/ec2/api/networkInterfaces.ts` — FOUND
- `web/src/services/ec2/pages/RouteTablesTab.tsx` — FOUND
- `web/src/services/ec2/pages/NetworkInterfacesTab.tsx` — FOUND
- `web/src/services/ec2/pages/Ec2TabPlaceholder.tsx` — DELETED (confirmed)
- Commit 572738c — FOUND
