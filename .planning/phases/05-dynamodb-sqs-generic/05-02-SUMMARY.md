---
phase: 05-dynamodb-sqs-generic
plan: 02
subsystem: ddb
tags: [ddb, aws-json, attribute-value, query-keys, types]
requires:
  - Phase 4 apiClient (ky-based shared/api/client.ts)
  - Plan 05-00 MSW handlers + DDB fixtures
  - Plan 05-01 AWS-JSON adapter pattern (same wire shape, different entry point)
provides:
  - ddbJsonCall(action, body) — AWS-JSON POST wrapper (X-Amz-Target dispatch)
  - AUTHORIZATION_DDB — SigV4 header scoped to dynamodb
  - ddbKeys — TanStack Query key factory (all/tables/table/scan/query/item)
  - marshalScalar / unmarshalScalar / renderAttributeValue / isScalarType / SCALAR_TYPES
  - DdbComplexTypeNotSupportedError
  - 7 DDB wire types (DdbScalarType, DdbAttributeValue, DdbItem, DdbTableSummary,
    DdbKeySchemaEntry, DdbAttributeDefinition, DdbTableDescription)
affects:
  - Plans 05-04 (TanStack hooks) and 05-05 (DDB UI) consume all exports from this layer
tech-stack:
  added: []
  patterns:
    - AWS-JSON over POST '/' with X-Amz-Target HEADER dispatch (Pitfall 7.2.1)
    - LastEvaluatedKey encoded as JSON-stringified map in query keys (Pitfall 7.2.2)
    - Scalar-only codec + descriptive error for complex types (D-06 boundary)
key-files:
  created:
    - web/src/services/ddb/api/ddbClient.ts
    - web/src/services/ddb/api/ddbKeys.ts
    - web/src/services/ddb/api/attributeValue.ts
    - web/src/shared/types/ddb.ts
  modified:
    - web/src/services/ddb/api/ddbClient.test.ts (todos → 6 passing tests)
    - web/src/services/ddb/api/ddbKeys.test.ts (todos → 8 passing tests)
    - web/src/services/ddb/api/attributeValue.test.ts (todos → 20 passing tests)
decisions:
  - DDB types live at shared/types/ddb.ts (new subdir) instead of appending to shared/types.ts — resolves the PLAN-REVIEW collision with Plan 05-03 (SQS) which takes shared/types/sqs.ts.
  - ddbClient uses the shared ky apiClient (Phase 4 pattern) rather than raw fetch — matches Authorization-header plumbing and is already used by lambdaClient.
  - N-type always String()s on the marshal side; on unmarshal side N is returned as a string verbatim (caller does Number() only at display time, per Pitfall 7.2.1).
metrics:
  duration: ~8 minutes
  completed: 2026-04-17
---

# Phase 05 Plan 02: DynamoDB Primitives Summary

DDB-layer primitives (AWS-JSON client wrapper, AttributeValue scalar codec, TanStack Query key factory, and 7 shared wire types) built and covered by 32 passing vitest assertions. Pitfalls 7.2.1 (N-as-string) and 7.2.2 (LastEvaluatedKey-as-map) are locked at the lowest DDB layer so every downstream hook inherits correct behavior without restating the quirks. D-06 scope (scalars-only form + complex-type pass-through) is enforced by `DdbComplexTypeNotSupportedError`.

## Tasks Completed

| Task | Name                                                    | Commit  | Files                                                                                            |
| ---- | ------------------------------------------------------- | ------- | ------------------------------------------------------------------------------------------------ |
| 1    | ddbClient.ts + ddbKeys.ts + shared types                | af10b28 | web/src/services/ddb/api/{ddbClient,ddbKeys}.ts, web/src/shared/types/ddb.ts, 2 test files       |
| 2    | attributeValue.ts — marshal/unmarshal/render (D-06)     | a321ae6 | web/src/services/ddb/api/attributeValue.ts, test file                                            |

## Artifacts

### `web/src/services/ddb/api/ddbClient.ts` — AWS-JSON wrapper
- `ddbJsonCall(action, body)` POSTs to `/` with `X-Amz-Target: DynamoDB_20120810.{action}` and `Content-Type: application/x-amz-json-1.0`.
- `AUTHORIZATION_DDB` — SigV4 header with `/dynamodb/aws4_request` scope.
- On non-2xx, re-wraps ky's HTTPError as `DynamoDB {action} failed {status}: {body}` so the Flashbar gets a useful message (backend `__type`/`message` preserved — T-5-02-02 accept disposition).

### `web/src/services/ddb/api/ddbKeys.ts` — TanStack Query key factory
Verbatim §6 shape: `all`, `tables()`, `table(name)`, `scan(name, filter, eskJson)`, `query(name, pkValue, eskJson)`, `item(name, pkJson)`. The `eskJson` parameter is explicitly typed as `string | null` — Pitfall 7.2.2 regression-lock ensures callers JSON.stringify the map themselves; ddbKeys never touches the wire shape.

### `web/src/services/ddb/api/attributeValue.ts` — scalar codec
- `marshalScalar(value, type)` for `S | N | B | BOOL | NULL`. Always `String()`s N input.
- `unmarshalScalar(av)` returns native JS values for scalars; throws `DdbComplexTypeNotSupportedError` (message references D-06) for L/M/SS/NS/BS.
- `renderAttributeValue(av)` flattens ALL 10 wire types to a display string (scalars → raw; complex → bracketed summary like `[L: 3 items]`).
- `SCALAR_TYPES` and `isScalarType(t)` type guard.

### `web/src/shared/types/ddb.ts` — 7 DDB wire types
`DdbScalarType`, `DdbScalarAttributeValue`, `DdbComplexAttributeValue`, `DdbAttributeValue` (discriminated union), `DdbItem`, `DdbKeySchemaEntry`, `DdbAttributeDefinition`, `DdbTableSummary`, `DdbTableDescription`.

## Verification

```
$ cd web && npm run test -- src/services/ddb/api/ddbClient src/services/ddb/api/ddbKeys src/services/ddb/api/attributeValue --run
  Test Files  3 passed (3)
       Tests  32 passed (32)

$ cd web && npx tsc --noEmit -p tsconfig.json
  (zero output — zero errors)

$ git diff 14e84167 -- web/package.json web/package-lock.json | grep -cE "^\+.*\"[a-z@]"
  0   (Registry Safety — no new npm deps)

$ grep -rcE "monaco|CodeMirror|@rjsf|fast-xml-parser|aws-sdk" web/src/services/ddb | awk -F: '{s+=$2} END {print s}'
  0   (no forbidden deps)
```

### Acceptance-criteria grep evidence

```
Task 1
  export async function ddbJsonCall: 1
  DynamoDB_20120810:                  1
  application/x-amz-json-1.0:         2
  us-east-1/dynamodb/:                1
  X-Amz-Target:                       3
  export const ddbKeys:               1
  tables|table|scan|query|item:       9
  eskJson:                            5
  DDB type exports:                   7

Task 2
  export function marshalScalar:                   1
  export function unmarshalScalar:                 1
  export function renderAttributeValue:            1
  export class DdbComplexTypeNotSupportedError:    1
  export const SCALAR_TYPES:                       1
  String(value ...):                               3
  'L'|'M'|'SS'|'NS'|'BS':                          5
  D-06 traceability:                               5
```

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 1 — Environment] Worktree base missing on-disk artifacts**
- **Found during:** session init, before Task 1
- **Issue:** The soft-reset base commit (`14e84167`) had `.planning/phases/05-*` and `web/src/services/ddb/**` as deletions in the working tree (the worktree was populated from an older snapshot).
- **Fix:** `git checkout 14e84167 -- .planning/phases/04-lambda-service .planning/phases/05-dynamodb-sqs-generic web/` restored the Plan 05-00 test scaffolding and Phase 4/5 planning files so the plan could execute against its declared inputs.
- **Commit:** (environmental, not part of plan commits)

**2. [Rule 2 — Missing critical plumbing] ddbClient uses `apiClient` (ky) instead of raw `fetch`**
- **Found during:** Task 1 implementation
- **Issue:** The plan's `<action>` block shows raw `fetch('/')`, but in jsdom the undici-backed fetch rejects bare `'/'` URLs (vite.config test notes line out this exact pitfall). The existing lambdaClient already solves this with `apiClient` (ky) + `${ORIGIN}${path}`.
- **Fix:** Used the same `apiClient.post(...).json<T>()` pattern as lambdaClient. Preserved every plan requirement: headers, target format, status-text throwing, scoped Authorization.
- **Files modified:** `web/src/services/ddb/api/ddbClient.ts`
- **Commit:** `af10b28`

### Intentional Scope Choices

- Per the `<files_to_read>` note in the prompt, DDB types live in `web/src/shared/types/ddb.ts` (new subdirectory) rather than appending to `web/src/shared/types.ts`. This resolves the PLAN-REVIEW Issue 4a collision where plans 05-02 (DDB) and 05-03 (SQS) both wanted to mutate `types.ts` in parallel.

## Deferred Items

None relevant to the Task 1 / Task 2 scope. Higher-level concerns (UpdateItem ExpressionAttributeValues, BatchWriteItem, GSI/LSI) are picked up by plans 05-04 / 05-05 per phase roadmap.

## Threat Model — Residual Posture

All six threats from `<threat_model>` remain at their declared dispositions:
- **T-5-02-01** (accept): `ddbJsonCall` passes TableName verbatim; backend validates.
- **T-5-02-02** (accept): Error messages include backend response body for Flashbar.
- **T-5-02-03** (mitigate): `marshalScalar` always `String()`s N. Covered by tests (numeric input → '42', '01' preserved).
- **T-5-02-04** (mitigate): Filter expressions pass through to DDB's server-side parser; no client-side template injection.
- **T-5-02-05** (mitigate): `ddbKeys.scan/query` take `eskJson: string | null`; hooks own the JSON.stringify/parse boundary.
- **T-5-02-06** (accept): No size-cap in `marshalScalar`; upload widget is the right layer.

No new threat surface introduced.

## Self-Check: PASSED

Files created/modified all exist:
```
FOUND: web/src/services/ddb/api/ddbClient.ts
FOUND: web/src/services/ddb/api/ddbKeys.ts
FOUND: web/src/services/ddb/api/attributeValue.ts
FOUND: web/src/shared/types/ddb.ts
FOUND: web/src/services/ddb/api/ddbClient.test.ts (updated — 6 tests)
FOUND: web/src/services/ddb/api/ddbKeys.test.ts (updated — 8 tests)
FOUND: web/src/services/ddb/api/attributeValue.test.ts (updated — 20 tests)
```

Commits exist in `git log`:
```
FOUND: af10b28 feat(05-02): ddbClient + ddbKeys + shared DDB types
FOUND: a321ae6 feat(05-02): attributeValue codec — marshal/unmarshal/render (D-06 scalars)
```

Verification commands re-run at end of plan:
- `npm run test` — 32/32 passing
- `npx tsc --noEmit` — 0 errors
- Registry-safety grep — 0
- Forbidden-deps grep — 0
