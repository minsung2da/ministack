---
phase: 02-ec2-dashboard-crud-patterns
plan: "00"
subsystem: ec2-test-scaffolding
tags: [testing, msw, fixtures, tdd, ec2]
dependency_graph:
  requires: []
  provides:
    - ec2Handlers MSW handler array for all EC2 actions
    - EC2_FIXTURES shared XML response fixtures
    - 12 test stub files covering all phase requirements
  affects:
    - All subsequent Phase 2 plans (vitest infrastructure)
tech_stack:
  added: []
  patterns:
    - MSW single-handler dispatch on EC2 Query protocol Action parameter
    - test.todo() stubs for Nyquist compliance before production code
key_files:
  created:
    - web/src/services/ec2/__tests__/fixtures.ts
    - web/src/services/ec2/__tests__/msw-handlers.ts
    - web/src/services/ec2/__tests__/xml.test.ts
    - web/src/services/ec2/__tests__/InstancesTab.test.tsx
    - web/src/services/ec2/__tests__/VpcsTab.test.tsx
    - web/src/services/ec2/__tests__/SubnetsTab.test.tsx
    - web/src/services/ec2/__tests__/SecurityGroupsTab.test.tsx
    - web/src/services/ec2/__tests__/KeyPairsTab.test.tsx
    - web/src/services/ec2/__tests__/VolumesTab.test.tsx
    - web/src/services/ec2/__tests__/SnapshotsTab.test.tsx
    - web/src/services/ec2/__tests__/ElasticIpsTab.test.tsx
    - web/src/services/ec2/__tests__/GatewaysTab.test.tsx
    - web/src/services/ec2/__tests__/InstanceWizard.test.tsx
    - web/src/services/ec2/__tests__/DeleteModal.test.tsx
  modified: []
decisions:
  - MSW uses single POST handler dispatching on Action parameter (EC2 Query protocol pattern)
  - DeleteModal.test.tsx does not use MSW (no API calls needed for UI-only behavior)
metrics:
  duration: 17m
  completed: "2026-04-15"
  tasks_completed: 2
  files_created: 14
---

# Phase 2 Plan 00: Wave 0 Test Scaffolding Summary

EC2 test scaffolding with MSW handlers dispatching on EC2 Query protocol Action parameter, shared XML fixtures for 13+ actions, and 12 test stub files covering all 12 phase requirements as todo stubs.

## Tasks Completed

| Task | Name | Commit | Files |
|------|------|--------|-------|
| 1 | MSW handlers and shared EC2 XML fixtures | 310b680 | fixtures.ts, msw-handlers.ts |
| 2 | 12 test stub files with describe blocks and test.todo() | 2d9b91a | xml.test.ts + 11 *.test.tsx |

## Verification Evidence

```
vitest run result:
 Test Files  8 passed | 12 skipped (20)
      Tests  16 passed | 73 todo (89)

tsc --noEmit: exit code 0 (no type errors)
```

- 12 new test files: 73 todo stubs, all skipped (not failing)
- 8 Phase 1 test files: 16 tests passing (unaffected)

## Artifacts Produced

### `fixtures.ts`

Exports `EC2_FIXTURES` with XML response strings for:
- **Describe actions (13):** DescribeInstances (2 reservations, running + stopped), DescribeVpcs (default + custom), DescribeSubnets (2 subnets, 2 AZs), DescribeSecurityGroups (2 SGs with inbound/egress rules), DescribeKeyPairs, DescribeVolumes (in-use + available), DescribeSnapshots, DescribeAddresses, DescribeInternetGateways, DescribeNatGateways, DescribeRouteTables (2 routes), DescribeNetworkInterfaces, DescribeImages (3 AMIs)
- **Mutation actions (22):** RunInstances, Start/Stop/Terminate/RebootInstances, Create/DeleteVpc, Create/DeleteSubnet, Create/DeleteSecurityGroup, Create/DeleteKeyPair, Create/DeleteVolume, Create/DeleteSnapshot, Allocate/ReleaseAddress, Create/DeleteInternetGateway, Create/DeleteNatGateway

### `msw-handlers.ts`

Exports `ec2Handlers` — single `http.post('/')` handler that:
1. Reads request body as text
2. Parses Action from URLSearchParams
3. Switches on Action to return corresponding fixture XML via `HttpResponse.xml()`
4. Returns 400 with `InvalidAction` XML for unknown actions

### Test Stub Files (12)

Each file imports `describe`, `test` from vitest. Files needing MSW import `mswServer` and `ec2Handlers`, registering handlers via `beforeAll(() => mswServer.use(...ec2Handlers))`.

| File | Requirements | Stubs |
|------|-------------|-------|
| xml.test.ts | EC2-01, CRUD-01 | 7 |
| InstancesTab.test.tsx | EC2-01/02, CRUD-01/02/05/06 | 15 |
| VpcsTab.test.tsx | EC2-03, CRUD-03/04 | 7 |
| SubnetsTab.test.tsx | EC2-03, CRUD-03/04 | 5 |
| SecurityGroupsTab.test.tsx | EC2-03, CRUD-02/03 | 4 |
| KeyPairsTab.test.tsx | EC2-03, CRUD-03/04 | 3 |
| VolumesTab.test.tsx | EC2-04, CRUD-03/04 | 5 |
| SnapshotsTab.test.tsx | EC2-04, CRUD-03 | 3 |
| ElasticIpsTab.test.tsx | EC2-05, CRUD-04 | 4 |
| GatewaysTab.test.tsx | EC2-05, CRUD-03/04 | 6 |
| InstanceWizard.test.tsx | EC2-06, CRUD-03 | 9 |
| DeleteModal.test.tsx | CRUD-04 | 5 |

## Deviations from Plan

None - plan executed exactly as written.

## Known Stubs

All test stubs are intentional `test.todo()` placeholders. They are Wave 0 scaffolding — implementation will be wired in Plans 01-06. These stubs are not bugs; they exist to satisfy Nyquist compliance before production code is written.

## Threat Flags

None - test scaffolding only, no production code, no trust boundaries introduced.

## Self-Check: PASSED

Checked files exist:
- FOUND: web/src/services/ec2/__tests__/fixtures.ts
- FOUND: web/src/services/ec2/__tests__/msw-handlers.ts
- FOUND: web/src/services/ec2/__tests__/xml.test.ts
- FOUND: web/src/services/ec2/__tests__/InstancesTab.test.tsx
- FOUND: web/src/services/ec2/__tests__/VpcsTab.test.tsx
- FOUND: web/src/services/ec2/__tests__/SubnetsTab.test.tsx
- FOUND: web/src/services/ec2/__tests__/SecurityGroupsTab.test.tsx
- FOUND: web/src/services/ec2/__tests__/KeyPairsTab.test.tsx
- FOUND: web/src/services/ec2/__tests__/VolumesTab.test.tsx
- FOUND: web/src/services/ec2/__tests__/SnapshotsTab.test.tsx
- FOUND: web/src/services/ec2/__tests__/ElasticIpsTab.test.tsx
- FOUND: web/src/services/ec2/__tests__/GatewaysTab.test.tsx
- FOUND: web/src/services/ec2/__tests__/InstanceWizard.test.tsx
- FOUND: web/src/services/ec2/__tests__/DeleteModal.test.tsx

Commits verified:
- FOUND: 310b680 (feat(02-00): MSW handlers and shared EC2 XML fixtures)
- FOUND: 2d9b91a (test(02-00): 12 EC2 test stub files with describe blocks and test.todo())
