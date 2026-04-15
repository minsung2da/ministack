---
phase: 02-ec2-dashboard-crud-patterns
plan: 05
subsystem: ui
tags: [react, cloudscape, tanstack-query, typescript, ec2, key-pairs, volumes, snapshots, xml-parsing]

# Dependency graph
requires:
  - phase: 02-ec2-dashboard-crud-patterns
    provides: ec2Client, xml helpers, ResourceTable, CreateModal, DeleteModal, SplitPanelDetail, StatusBadge, FlashNotifications, useSplitPanel, Ec2KeyPair/Volume/Snapshot types

provides:
  - useKeyPairs, useCreateKeyPair, useDeleteKeyPair hooks (keyPairs.ts)
  - useVolumes, useCreateVolume, useDeleteVolume hooks (volumes.ts)
  - useSnapshots, useCreateSnapshot, useDeleteSnapshot hooks (snapshots.ts)
  - KeyPairsTab — full CRUD page with one-time private key modal (T-02-13)
  - VolumesTab — full CRUD page with size validation 1-16384 GiB (T-02-14)
  - SnapshotsTab — full CRUD page with volume dropdown from API
  - routes.tsx — key-pairs/volumes/snapshots routes wired to real tabs

affects:
  - future ec2 plans that add more resource types
  - Phase 3+ if it extends EC2 resources or adds cross-service linking

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "One-time private key display: show keyMaterial in Modal with copy button, never persist to state/localStorage (T-02-13)"
    - "Volume size validation: client-side integer 1-16384 check before mutation (T-02-14)"
    - "Snapshot volume dropdown: useVolumes() feeds Select options, statusType shows loading state"
    - "XML parser pattern: parseXml + getText + getItems + getNameTag (shared/api/xml) consistently applied"
    - "9 hooks pattern: 3 query + 6 mutation hooks per resource file"

key-files:
  created:
    - web/src/services/ec2/api/keyPairs.ts
    - web/src/services/ec2/api/volumes.ts
    - web/src/services/ec2/api/snapshots.ts
    - web/src/services/ec2/pages/KeyPairsTab.tsx
    - web/src/services/ec2/pages/VolumesTab.tsx
    - web/src/services/ec2/pages/SnapshotsTab.tsx
  modified:
    - web/src/app/routes.tsx

key-decisions:
  - "T-02-13: Private key (keyMaterial) shown once in Modal with copy button, never stored in localStorage or state beyond create response"
  - "T-02-14: Volume size validated client-side as integer 1-16384 before submitting mutation"
  - "Snapshot create: volume dropdown populated from useVolumes() API call with statusType=loading when volumes empty"
  - "Volume CreateTags called post-CreateVolume when nameTag provided (separate API call pattern matching existing plan)"

patterns-established:
  - "Plan 05: Three-resource pattern: api hooks + page components in matching pairs"
  - "Plan 05: Security-sensitive response field (keyMaterial) gets dedicated one-time display modal"

requirements-completed:
  - EC2-03
  - EC2-04
  - CRUD-01
  - CRUD-02
  - CRUD-03
  - CRUD-04
  - CRUD-06

# Metrics
duration: ~15min
completed: 2026-04-15
---

# Phase 02 Plan 05: Key Pairs, Volumes, Snapshots — Full CRUD Tabs Summary

**Nine TanStack Query hooks (3 query + 6 mutation) and three Cloudscape CRUD tab pages for Key Pairs, EBS Volumes, and Snapshots, with one-time private key display (T-02-13) and client-side volume size validation (T-02-14)**

## Performance

- **Duration:** ~15 min
- **Started:** 2026-04-15T13:00:00Z
- **Completed:** 2026-04-15T13:30:16Z
- **Tasks:** 2 (Task 1 committed prior session; Task 2 committed this session)
- **Files modified:** 7

## Accomplishments

- Nine API hooks and three XML parsers for Key Pairs, EBS Volumes, and Snapshots
- KeyPairsTab with 4-column table, create modal (Name + Type), one-time private key material modal with copy button
- VolumesTab with 7-column table, StatusBadge state, create modal with size validation 1-16384 GiB and AZ select
- SnapshotsTab with 6-column table, create modal with volume dropdown populated from useVolumes API, description field
- All three routes wired in routes.tsx replacing Ec2TabPlaceholder

## Task Commits

Each task was committed atomically:

1. **Task 1: Key Pairs, Volumes, Snapshots API hooks and XML parsers** - `6a6bb27` (feat)
2. **Task 2: KeyPairsTab, VolumesTab, SnapshotsTab pages and route wiring** - `12a8268` (feat)

## Files Created/Modified

- `web/src/services/ec2/api/keyPairs.ts` — parseKeyPairs, useKeyPairs, useCreateKeyPair (returns keyMaterial), useDeleteKeyPair
- `web/src/services/ec2/api/volumes.ts` — parseVolumes (with attachmentSet), useVolumes, useCreateVolume (+ optional CreateTags), useDeleteVolume
- `web/src/services/ec2/api/snapshots.ts` — parseSnapshots, useSnapshots (Owner=self), useCreateSnapshot, useDeleteSnapshot
- `web/src/services/ec2/pages/KeyPairsTab.tsx` — 4-col table, PrivateKeyModal one-time display, DeleteModal
- `web/src/services/ec2/pages/VolumesTab.tsx` — 7-col table with StatusBadge, size validation, AZ select
- `web/src/services/ec2/pages/SnapshotsTab.tsx` — 6-col table with StatusBadge, volume dropdown from API
- `web/src/app/routes.tsx` — replaced Ec2TabPlaceholder with real tab imports and route elements

## Decisions Made

- T-02-13: keyMaterial shown in a dedicated PrivateKeyModal with copy button and warning alert. Never stored in localStorage, component state is cleared on modal close.
- T-02-14: Volume size validated on submit as `parseInt(value) in [1, 16384]` before calling mutation. Error shown inline.
- Snapshot volume dropdown uses `statusType="loading"` when volumes array is empty to show loading state while API fetch is in-flight.
- useSnapshots uses `Owner.1=self` filter to limit to local emulator-owned snapshots only.

## Deviations from Plan

None — plan executed exactly as written.

## Issues Encountered

None.

## User Setup Required

None — no external service configuration required.

## Next Phase Readiness

- EC2 service has complete CRUD for: Instances, VPCs, Subnets, Security Groups, Key Pairs, EBS Volumes, Snapshots
- Remaining EC2 resources (Elastic IPs, Internet Gateways, NAT Gateways, Route Tables, Network Interfaces) still use Ec2TabPlaceholder
- All mutation hooks follow consistent queryKey invalidation pattern — ready for Phase 3 services
- TypeScript: 0 errors. Tests: 2 passed, 5 skipped (DeleteModal tests skipped by design)

## Self-Check

- [x] `web/src/services/ec2/api/keyPairs.ts` — exists (created Task 1)
- [x] `web/src/services/ec2/api/volumes.ts` — exists (created Task 1)
- [x] `web/src/services/ec2/api/snapshots.ts` — exists (created Task 1)
- [x] `web/src/services/ec2/pages/KeyPairsTab.tsx` — exists (created Task 2)
- [x] `web/src/services/ec2/pages/VolumesTab.tsx` — exists (created Task 2)
- [x] `web/src/services/ec2/pages/SnapshotsTab.tsx` — exists (created Task 2)
- [x] `web/src/app/routes.tsx` — updated (Task 2)
- [x] Task 1 commit `6a6bb27` — verified in git log
- [x] Task 2 commit `12a8268` — verified in git log
- [x] `npx tsc --noEmit` — exit 0
- [x] `npx vitest run` — exit 0 (2 passed, 5 skipped)

## Self-Check: PASSED

---
*Phase: 02-ec2-dashboard-crud-patterns*
*Completed: 2026-04-15*
