---
phase: 02-ec2-dashboard-crud-patterns
plan: "03"
subsystem: ec2-instances-tab
tags: [ec2, instances, crud, tanstack-query, cloudscape, xml-parsing]
dependency_graph:
  requires: [02-02]
  provides: [instances-tab, instance-api-hooks]
  affects: [web/src/app/routes.tsx]
tech_stack:
  added: []
  patterns:
    - TanStack Query mutation hooks with onSuccess invalidation
    - Scoped XML traversal (reservation → instancesSet → item) to avoid cross-nesting pitfall
    - State-aware action guards (canStart/canStop/canReboot/canTerminate)
    - SplitPanel detail with 5 tabbed sections via useSplitPanel context
key_files:
  created:
    - web/src/services/ec2/api/instances.ts
    - web/src/services/ec2/pages/InstancesTab.tsx
  modified:
    - web/src/app/routes.tsx
decisions:
  - "Used propertyLabel (not label) for PropertyFilterProps.FilteringProperty — matches collection-hooks interface"
  - "SplitPanelContext is at src/contexts/ not src/services/ec2/contexts/ — fixed import path"
  - "Scoped instancesSet traversal uses element.children filtered by tagName=item, not getElementsByTagName, to stay within each reservation boundary"
metrics:
  duration: ~6 min
  completed_date: "2026-04-14"
  tasks: 2
  files_created: 2
  files_modified: 1
---

# Phase 2 Plan 3: Instances Tab — Full CRUD UI Summary

EC2 InstancesTab with complete list/detail/action CRUD using TanStack Query hooks, PropertyFilter, state-aware ButtonDropdown, type-to-confirm termination modal, and 5-tabbed SplitPanel detail.

## Tasks Completed

| Task | Name | Commit | Files |
|------|------|--------|-------|
| 1 | Instance API hooks and XML parser | 472dd33 | web/src/services/ec2/api/instances.ts |
| 2 | InstancesTab page + route wiring | abe4809 | web/src/services/ec2/pages/InstancesTab.tsx, web/src/app/routes.tsx |

## What Was Built

### Task 1: instances.ts

- `parseInstances(xml)` — scoped XML traversal: iterates `reservationSet > item`, then within each finds `instancesSet > item` children. Avoids the getElementsByTagName cross-nesting pitfall documented in the plan. Extracts all Ec2Instance fields including nested state, securityGroups, blockDeviceMappings, placement/AZ, monitoring, and IAM profile.
- `useInstances()` — TanStack Query with `queryKey: ['ec2', 'instances']`, `staleTime: 30_000`
- `useStartInstances()`, `useStopInstances()`, `useTerminateInstances()`, `useRebootInstances()` — mutation hooks using `addMemberList` for EC2 Query protocol member lists, all invalidate `['ec2', 'instances']` on success.

### Task 2: InstancesTab.tsx

- 8 columns per UI-SPEC D-02: Name, Instance ID, Instance state (StatusBadge), Instance type, AZ, Public IPv4, Private IPv4, Launch time
- 5 PropertyFilter tokens: state, instanceType, availabilityZone, instanceId, nameTag
- State-aware action guards: `canStart` (only stopped), `canStop` (only running), `canReboot` (only running), `canTerminate` (running or stopped)
- ButtonDropdown: Start/Stop/Reboot + divider + Terminate. Disabled when selection is empty, mutating, or action invalid.
- Terminate opens DeleteModal with type-to-confirm (single: type instanceId; bulk: type "terminate")
- Row click opens SplitPanel via `useSplitPanel().setPanel()` with `InstanceDetailPanel` containing 5 tabs: Details, Networking, Storage, Security, Tags
- Flashbar via `useFlashNotifications()` at top of page for all action results
- Manual refresh Button with `iconName="refresh"` calls `queryClient.invalidateQueries(['ec2', 'instances'])`
- Routes: `instances` path replaced from `Ec2TabPlaceholder` to lazy-loaded `InstancesTab`

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 1 - Bug] Wrong import path for SplitPanelContext**
- **Found during:** Task 2 TypeScript compile
- **Issue:** Plan referenced `../contexts/SplitPanelContext` but the file is at `src/contexts/SplitPanelContext.tsx`
- **Fix:** Changed import to `../../../contexts/SplitPanelContext`
- **Files modified:** web/src/services/ec2/pages/InstancesTab.tsx

**2. [Rule 1 - Bug] PropertyFilterProps.FilteringProperty uses `propertyLabel` not `label`**
- **Found during:** Task 2 TypeScript compile (5 errors)
- **Issue:** Plan interface description used `label` but the `PropertyFilterProperty` interface from `@cloudscape-design/collection-hooks` requires `propertyLabel`
- **Fix:** Renamed all 5 `label` fields to `propertyLabel` in FILTERING_PROPERTIES
- **Files modified:** web/src/services/ec2/pages/InstancesTab.tsx

## Known Stubs

None — all data flows from live API hooks. No placeholder text or hardcoded empty values that reach the UI.

## Threat Flags

No new network endpoints, auth paths, or file access patterns introduced beyond what the plan's threat model covers (T-02-08: type-to-confirm modal implemented).

## Verification

- TypeScript: `npx tsc --noEmit` — exit 0
- Tests: `npx vitest run` — 16 passed, 73 todo, 0 failures
- Routes: instances path now uses real InstancesTab (lazy import)

## Self-Check: PASSED

- `web/src/services/ec2/api/instances.ts` — FOUND
- `web/src/services/ec2/pages/InstancesTab.tsx` — FOUND
- Commit 472dd33 — FOUND
- Commit abe4809 — FOUND
