---
phase: 02-ec2-dashboard-crud-patterns
plan: 07
subsystem: frontend/ec2-ui
tags: [cloudscape, react, wizard, ec2, instances, vpcs, subnets, security-groups, key-pairs]
dependency_graph:
  requires: [02-02, 02-04, 02-05]
  provides: [InstanceWizard, useImages, useRunInstance]
  affects: []
tech_stack:
  added: []
  patterns:
    - "Wizard step validation: per-step error map cleared on navigation, re-validated on next/submit"
    - "VPC-scoped dropdown filtering: Subnet and SG lists filtered by selected VpcId client-side"
    - "Canonical hook imports: no duplicate hooks — useVpcs/useSubnets/useSecurityGroups/useKeyPairs imported directly"
    - "RunInstances param building with addMemberList for SecurityGroupId member list"
    - "Default AMI constant for local emulator (ami-00000000000000001)"
key_files:
  created:
    - web/src/services/ec2/api/images.ts
    - web/src/services/ec2/pages/InstanceWizard.tsx
  modified:
    - web/src/services/ec2/api/instances.ts
    - web/src/app/routes.tsx
decisions:
  - "Used ami-00000000000000001 as default AMI constant — local emulator does not ship real AMIs; plan did not require AMI selection step"
  - "VPC change clears subnetId and securityGroupIds to prevent stale cross-VPC selections"
  - "Key pair Select includes 'Proceed without a key pair' option (value='') so field is never uncontrolled"
  - "Step validation gated on activeStepIndex to avoid validating future steps prematurely"
metrics:
  duration: "~12 minutes"
  completed_date: "2026-04-15"
  tasks: 2
  files_created: 2
  files_modified: 2
---

# Phase 02 Plan 07: Instance Launch Wizard Summary

4-step Cloudscape Wizard for EC2 instance launch — Name/type, Network (VPC+Subnet), Security (SG multiselect + key pair), Review — using canonical hooks from Plans 04/05 with per-step validation and RunInstances mutation.

## Tasks Completed

| Task | Name | Commit | Key Files |
|------|------|--------|-----------|
| 1 | AMI/Images API hook and RunInstances mutation | 04d7b4d | images.ts, instances.ts |
| 2 | Instance Launch Wizard page and route | 91343e4 | InstanceWizard.tsx, routes.tsx |

## What Was Built

### images.ts (`web/src/services/ec2/api/images.ts`)
- `Ec2Image` interface: imageId, name, description, architecture, platform
- `parseImages(xml)`: parses DescribeImages XML from `<imagesSet><item>`
- `useImages()`: query hook with 5-minute stale time (AMIs rarely change)

### instances.ts additions
- `useRunInstance()` mutation hook accepting `RunInstanceInput`
- Builds EC2 Query Protocol params: ImageId, InstanceType, SubnetId, MinCount/MaxCount
- Conditionally adds KeyName, SecurityGroupId member list via `addMemberList`, and Name TagSpecification
- Invalidates `['ec2', 'instances']` on success

### InstanceWizard.tsx (`web/src/services/ec2/pages/InstanceWizard.tsx`)
- **Step 1** — Name (optional Input, max 255) + Instance type (Select, 10 options: t2/t3/m5 variants)
- **Step 2** — VPC (Select from `useVpcs()`), Subnet (Select filtered by VPC from `useSubnets()`), Auto-assign public IP (Enable/Disable)
- **Step 3** — Security Groups (Multiselect filtered by VPC from `useSecurityGroups()`), Key Pair (Select from `useKeyPairs()`)
- **Step 4** — Read-only review via ColumnLayout + KeyValuePairs
- Per-step validation: instance type required (step 1), VPC+subnet required (step 2), at least 1 SG required (step 3)
- VPC change clears subnetId and securityGroupIds to avoid cross-VPC stale selections
- Launch button calls `useRunInstance().mutateAsync(...)`, shows Flashbar success and navigates to `/services/ec2/instances`
- Cancel navigates to `/services/ec2/instances` without side effects
- Copy strings from `shared/copy.ts` (ec2WizardHeader, ec2WizardSteps, ec2WizardCancel, ec2WizardSubmit)

### routes.tsx update
- Added `{ path: 'launch-wizard', element: withSuspense(<InstanceWizard />) }` as child of `services/ec2`
- Lazy import via `const InstanceWizard = lazy(() => import(...))`

## Verification

- `npx tsc --noEmit`: exit 0 (0 errors)
- `npx vitest run`: 16 passed, 73 todo, 0 failed — all existing tests still green

## Deviations from Plan

### Auto-fixed Issues

None — plan executed exactly as written.

### Notes

- `InstanceWizard.test.tsx` existed as a pre-created stub (9 `test.todo` entries) from Plan 02 scaffolding. These remain as todos per the project pattern; implementation tests would be added in a dedicated test plan.

## Known Stubs

None — the wizard is fully wired to live API hooks. The AMI step uses a constant (`ami-00000000000000001`) because the local emulator does not ship real AMI catalogs; this is intentional for a local dev tool.

## Threat Flags

None — all surface matches the plan's threat model (T-02-09: URLSearchParams to localhost, no SQL/shell; T-02-10: VPC/Subnet/SG data from local backend only).

## Self-Check: PASSED

- `web/src/services/ec2/api/images.ts` — EXISTS
- `web/src/services/ec2/pages/InstanceWizard.tsx` — EXISTS
- Commit `04d7b4d` — confirmed in git log
- Commit `91343e4` — confirmed in git log
- TypeScript: 0 errors
- Vitest: 16/16 passed, 0 failures
