---
phase: 02-ec2-dashboard-crud-patterns
plan: "01"
subsystem: ec2-foundation
tags: [xml-parsing, ec2-client, types, copy-strings, utilities]
dependency_graph:
  requires: [02-00]
  provides: [xml-utils, ec2-query-client, ec2-types, ec2-copy]
  affects: [02-02, 02-03, 02-04, 02-05, 02-06, 02-07]
tech_stack:
  added: []
  patterns:
    - EC2 Query protocol: URLSearchParams POST to bare '/' with fake SigV4 header
    - XML parsing: DOMParser + scoped getElementsByTagName to avoid cross-nesting
    - 1-based member indexing: addMemberList uses i+1 per EC2 Query spec
key_files:
  created:
    - web/src/shared/api/xml.ts
    - web/src/services/ec2/api/ec2Client.ts
    - web/src/services/ec2/api/types.ts
  modified:
    - web/src/shared/copy.ts
decisions:
  - getItems scopes to firstSet.getElementsByTagName('item') not doc.getElementsByTagName('item') to prevent cross-nesting when multiple sets exist in same XML response
  - ec2Copy stays in shared/copy.ts (not a separate ec2/copy.ts) — file is already established from Phase 1, splitting adds complexity without benefit
  - ORIGIN pattern (window.location.origin fallback to '') mirrors counts.ts for jsdom test compatibility
metrics:
  duration: ~12m
  completed: "2026-04-14T23:04:37Z"
  tasks_completed: 1
  files_changed: 4
---

# Phase 2 Plan 01: Utility Foundation Summary

**One-liner:** Shared XML parsing helpers, EC2 Query protocol client, 12 resource type interfaces, and full Phase 2 copy strings — all importable foundations for every subsequent plan.

## Tasks Completed

| Task | Name | Commit | Files |
|------|------|--------|-------|
| 1 | XML utilities, EC2 client, types, and copy extensions | 764b226 | xml.ts, ec2Client.ts, types.ts, copy.ts |

## What Was Built

### `web/src/shared/api/xml.ts`

Five exports for safe EC2 XML parsing:
- `parseXml(text)` — DOMParser wrapper
- `getText(el, tag)` — safe textContent extraction
- `getItems(parent, setTag)` — scoped item extraction (avoids cross-nesting)
- `getAllItemsFromSet(parent, setTag)` — alias for scoped callers
- `getNameTag(el)` — Name tag value from tagSet

### `web/src/services/ec2/api/ec2Client.ts`

- `ec2Query(action, params)` — EC2 Query protocol POST: URLSearchParams body, `Content-Type: application/x-www-form-urlencoded`, fake SigV4 Authorization header. Returns raw XML text.
- `addMemberList(params, key, ids)` — 1-based member list builder (e.g., `InstanceId.1`, `InstanceId.2`)

### `web/src/services/ec2/api/types.ts`

12 resource interfaces + `Ec2ResourceType` union type:
- `Ec2Instance` (22 fields including nested securityGroups, blockDeviceMappings)
- `Ec2Vpc`, `Ec2Subnet`, `Ec2SecurityGroup` (with inbound/outbound rule arrays)
- `Ec2KeyPair`, `Ec2Volume`, `Ec2Snapshot`, `Ec2ElasticIp`
- `Ec2InternetGateway`, `Ec2NatGateway`, `Ec2RouteTable`, `Ec2NetworkInterface`

### `web/src/shared/copy.ts` (extended)

Added all Phase 2 EC2 copy strings from 02-UI-SPEC.md Copywriting Contract:
- Page headings and descriptions
- Table header formatter `ec2TableHeader(resource, count)`
- Empty state headings/bodies/CTAs per resource type slug
- Error state copy (heading, body, retry)
- Action success messages (Flashbar) for all CRUD operations
- Delete and terminate confirmation copy (single + bulk)
- Wizard step titles and descriptions
- Miscellaneous UI strings (refresh, filter, preferences, no-match)

## Verification

- `tsc --noEmit`: exit 0, 0 errors
- `vitest run`: 16 Phase 1 tests pass, 73 Phase 2 stubs todo (expected)

## Deviations from Plan

None — plan executed exactly as written.

## Known Stubs

None. All files contain production-ready implementations, not stubs. Copy strings are complete per UI-SPEC.

## Threat Flags

None. No new network endpoints, auth paths, file access patterns, or schema changes beyond what is in the plan's threat model (T-02-01, T-02-02 — both accepted).

## Self-Check: PASSED

- `web/src/shared/api/xml.ts`: FOUND
- `web/src/services/ec2/api/ec2Client.ts`: FOUND
- `web/src/services/ec2/api/types.ts`: FOUND
- `web/src/shared/copy.ts`: FOUND (modified)
- Commit 764b226: FOUND
