---
phase: 02-ec2-dashboard-crud-patterns
plan: "04"
subsystem: frontend/ec2
tags: [ec2, vpc, subnet, security-group, crud, tanstack-query, cloudscape]
dependency_graph:
  requires: [02-02]
  provides: [vpcs-tab, subnets-tab, security-groups-tab]
  affects: [routes.tsx]
tech_stack:
  added: []
  patterns:
    - TanStack Query useQuery/useMutation hooks for EC2 resource types
    - XML parser functions using parseXml/getText/getItems/getNameTag from shared xml.ts
    - CreateModal + DeleteModal reusable components wired per resource
    - SplitPanelDetail with tabbed layout (VPC, SG) and flat layout (Subnet)
    - CIDR regex client-side validation (T-02-11 mitigation)
key_files:
  created:
    - web/src/services/ec2/api/vpcs.ts
    - web/src/services/ec2/api/subnets.ts
    - web/src/services/ec2/api/securityGroups.ts
    - web/src/services/ec2/pages/VpcsTab.tsx
    - web/src/services/ec2/pages/SubnetsTab.tsx
    - web/src/services/ec2/pages/SecurityGroupsTab.tsx
  modified:
    - web/src/app/routes.tsx
decisions:
  - CIDR validation applied at form submission with regex before mutation fires (T-02-11)
  - AZ select uses hardcoded us-east-1{a,b,c,d} options matching emulator single-region setup
  - SecurityGroup inbound/outbound rule tables embedded in SplitPanel tabs using nested Cloudscape Table
metrics:
  duration: ~25m
  completed: "2026-04-14T23:32:00Z"
  tasks_completed: 2
  files_changed: 7
---

# Phase 02 Plan 04: VPC, Subnet, Security Group CRUD Tabs Summary

**One-liner:** Three networking resource tabs (VPC, Subnet, SG) with full CRUD — list, create modal with validation, type-to-confirm delete, and SplitPanel detail — proving the reusable component pattern across 3 resource types.

## What Was Built

### Task 1: API hooks and XML parsers (commit 3a5809d)

**`vpcs.ts`** — `parseVpcs` handles `vpcSet > item` nesting with `cidrBlockAssociationSet` sub-items. `useVpcs` (staleTime 30s), `useCreateVpc` (CreateVpc + optional CreateTags for Name), `useDeleteVpc`.

**`subnets.ts`** — `parseSubnets` handles `subnetSet > item`, parses `availableIpAddressCount` as number. `useSubnets`, `useCreateSubnet` (CreateSubnet + optional Name tag), `useDeleteSubnet`.

**`securityGroups.ts`** — `parseSecurityGroups` handles `securityGroupInfo > item` with inbound (`ipPermissions`) and outbound (`ipPermissionsEgress`) rule parsing. Protocol, port range (handles `-1` → "All"), source/destination from `ipRanges` or `groups`. `useSecurityGroups`, `useCreateSecurityGroup`, `useDeleteSecurityGroup`.

All 9 query/mutation hooks and 3 XML parsers compile clean (tsc --noEmit exit 0).

### Task 2: Tab pages and route wiring (commit 832d503)

**`VpcsTab.tsx`** — 5 columns (Name, VPC ID, State, IPv4 CIDR, Is default). Create modal validates CIDR with regex `^(\d{1,3}\.){3}\d{1,3}\/\d{1,2}$` before firing mutation (T-02-11 mitigated). SplitPanel has Details / CIDR blocks / Tags tabs. Delete with type-to-confirm.

**`SubnetsTab.tsx`** — 7 columns (Name, Subnet ID, State, VPC ID, IPv4 CIDR, AZ, Available IPs). Create modal with VPC Select (populated from useVpcs), AZ Select (us-east-1a–d), CIDR validation. Flat SplitPanel detail with 8 key-value pairs.

**`SecurityGroupsTab.tsx`** — 6 columns (Name, SG ID, VPC ID, Description, Inbound rules count, Outbound rules count). Create modal requires Name + Description + VPC. SplitPanel has Details / Inbound rules / Outbound rules / Tags tabs; rule tabs use nested Cloudscape Table for protocol/port/source/description display.

**`routes.tsx`** — Replaced `Ec2TabPlaceholder` lazy imports for `vpcs`, `subnets`, `security-groups` routes with real tab components.

## Verification Evidence

```
npx tsc --noEmit     → exit 0 (0 errors)
npx vitest run       → 16 passed | 0 failures | 73 todo
```

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 1 - Bug] Unused import `KeyValuePairs` in SubnetsTab.tsx**
- **Found during:** Task 2 tsc check
- **Issue:** SubnetDetailPanel uses `SplitPanelDetail` with `keyValueItems` prop instead of direct KeyValuePairs; initial file included the import redundantly.
- **Fix:** Removed unused import.
- **Files modified:** `web/src/services/ec2/pages/SubnetsTab.tsx`
- **Commit:** 832d503

## Known Stubs

None — all three tabs are fully wired to live API hooks. Data flows from real EC2 Query protocol calls through XML parsers to Cloudscape table rows.

## Threat Flags

None — no new network endpoints or auth paths introduced. All API calls go through the existing `ec2Query` helper to `/_ministack/ec2`.

## Self-Check: PASSED

- `web/src/services/ec2/api/vpcs.ts` — FOUND
- `web/src/services/ec2/api/subnets.ts` — FOUND
- `web/src/services/ec2/api/securityGroups.ts` — FOUND
- `web/src/services/ec2/pages/VpcsTab.tsx` — FOUND
- `web/src/services/ec2/pages/SubnetsTab.tsx` — FOUND
- `web/src/services/ec2/pages/SecurityGroupsTab.tsx` — FOUND
- commit 3a5809d — FOUND
- commit 832d503 — FOUND
- tsc exit 0 — VERIFIED
- vitest 16 passed 0 failures — VERIFIED
