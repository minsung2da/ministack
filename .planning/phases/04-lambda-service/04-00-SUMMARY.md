---
phase: 04-lambda-service
plan: 00
subsystem: lambda
tags: [wave-0, test-infrastructure, msw, fixtures, todo-stubs]
requires: []
provides:
  - LAMBDA_FIXTURES (JSON fixtures for List/Get/Create/Update/Invoke/ESM/FunctionUrl)
  - lambdaHandlers (MSW v2 HttpHandler[] covering 8 Lambda REST endpoints)
  - 22 test.todo() stub files hooking LAM-01/02/03 and D-01..D-10
affects: [web/src/services/lambda/]
tech_stack_added: []
patterns:
  - MSW v2 handler registration order (specific before generic)
  - Invoke HTTP-layer shape: body string + X-Amz-Log-Result + X-Amz-Function-Error headers
  - test.todo() scaffolding compiles without production imports
key_files_created:
  - web/src/services/lambda/__tests__/fixtures.ts
  - web/src/services/lambda/__tests__/msw-handlers.ts
  - web/src/services/lambda/api/lambdaClient.test.ts
  - web/src/services/lambda/api/invokeClient.test.ts
  - web/src/services/lambda/api/codeUploadClient.test.ts
  - web/src/services/lambda/api/lambdaKeys.test.ts
  - web/src/services/lambda/api/useFunctions.test.ts
  - web/src/services/lambda/api/useFunction.test.ts
  - web/src/services/lambda/api/useEventSourceMappings.test.ts
  - web/src/services/lambda/api/useFunctionUrl.test.ts
  - web/src/services/lambda/api/functionMutations.test.ts
  - web/src/services/lambda/api/invokeMutation.test.ts
  - web/src/services/lambda/components/FunctionTable.test.tsx
  - web/src/services/lambda/components/CreateFunctionModal.test.tsx
  - web/src/services/lambda/components/DeleteFunctionModal.test.tsx
  - web/src/services/lambda/components/ConfigurationPanel.test.tsx
  - web/src/services/lambda/components/EnvironmentPanel.test.tsx
  - web/src/services/lambda/components/TriggersPanel.test.tsx
  - web/src/services/lambda/components/InvokePanel.test.tsx
  - web/src/services/lambda/components/PayloadEditor.test.tsx
  - web/src/services/lambda/components/InvokeResult.test.tsx
  - web/src/services/lambda/components/RelativeTime.test.tsx
  - web/src/services/lambda/FunctionListPage.test.tsx
  - web/src/services/lambda/FunctionDetailPage.test.tsx
key_files_modified: []
decisions:
  - Invoke MSW handler uses `new HttpResponse(string, { headers })` (not HttpResponse.json) so the X-Amz-Log-Result and X-Amz-Function-Error headers survive exactly as backend emits them
  - Handler ordering: specific sub-paths (/configuration, /urls, /invocations, /event-source-mappings) registered before generic /functions/:name so MSW matches specificity correctly
  - Pre-computed base64 log fixtures inlined as string literals (rather than Buffer.from(...) at module init) to keep fixtures.ts environment-agnostic
metrics:
  duration: "~25 minutes"
  tasks: 2
  files_created: 24
  files_modified: 0
  commits: 2
  test_todos: 98
  completed: 2026-04-17
---

# Phase 4 Plan 00: Wave 0 Test Scaffolding Summary

Wave 0 test infrastructure for Lambda service: MSW handlers covering 8 Lambda REST endpoints with invoke-specific header semantics (Pitfalls 1/2/4), JSON fixtures for every downstream plan to consume, and 22 `test.todo()` stub files (98 todos total) hooking every LAM requirement and every locked CONTEXT decision.

## What Shipped

### Fixtures (`web/src/services/lambda/__tests__/fixtures.ts`)

`LAMBDA_FIXTURES` const exports 16 keyed entries:

- **List**: `listFunctionsEmpty`, `listFunctionsTwo`, `listFunctionsTruncated` (with `NextMarker`)
- **Detail**: `getFunctionHello` (Zip package), `getFunctionImage` (ECR image — PackageType=Image)
- **Create/Update**: `createFunctionResponse`, `updateConfigResponse` (Timeout=30, MemorySize=512)
- **Invoke**: `invokeSuccessBody`, `invokeErrorBody` (string bodies so headers can be set via `new HttpResponse`), plus `invokeSuccessLogBase64` and `invokeErrorLogBase64` — both pre-computed base64 strings of UTF-8 text containing the multi-byte sequence `안녕` (Pitfall 1 hook)
- **ESM**: `esmsEmpty`, `esmsOne` with UUID, EventSourceArn, State, BatchSize, LastProcessingResult
- **Function URL**: `functionUrlEmpty`, `functionUrlOne` with AuthType=NONE

All values are plain JS objects (no XML) mirroring `ministack/services/lambda_svc.py` HTTP-layer output per RESEARCH §Backend REST Inventory.

### MSW Handlers (`web/src/services/lambda/__tests__/msw-handlers.ts`)

`lambdaHandlers: HttpHandler[]` covers 8 endpoints:

| Method | Path | Behavior |
|--------|------|----------|
| GET    | `*/2015-03-31/functions`                          | `listFunctionsTwo` by default; `listFunctionsTruncated` when `?Marker=...` present |
| POST   | `*/2015-03-31/functions`                          | 201 + `createFunctionResponse` |
| GET    | `*/2015-03-31/functions/:name`                    | `getFunctionHello` for `hello`, 404 otherwise |
| PUT    | `*/2015-03-31/functions/:name/configuration`      | 200 + `updateConfigResponse` |
| DELETE | `*/2015-03-31/functions/:name`                    | 204; 404 for `missing` |
| POST   | `*/2015-03-31/functions/:name/invocations`        | `invokeSuccessBody` + success headers by default; `invokeErrorBody` + `X-Amz-Function-Error: Unhandled` for `boom` (both 200 status — Pitfall 2) |
| GET    | `*/2015-03-31/event-source-mappings?FunctionName=hello` | `esmsOne` (Pitfall 7: `FunctionName`, not `Function`) |
| GET    | `*/2021-10-31/functions/:name/urls`               | `functionUrlOne` for `hello`, `functionUrlEmpty` otherwise (D-07) |

### Test Stubs (22 files, 98 `test.todo()` entries)

Every module named in RESEARCH §File Inventory has a test file:

- `api/` — 10 files (clients, keys, hooks, mutations)
- `components/` — 10 files (table, modals, panels, editor, result, relative-time)
- Page-level — 2 files (`FunctionListPage`, `FunctionDetailPage`)

Each stub imports only `{ describe, test }` from vitest — no production imports, so stubs compile cleanly before production code exists. Todo labels explicitly reference the locked decisions (D-01..D-10) and named pitfalls they guard against, making downstream plans' `<verify>` commands greppable.

## Verification Evidence

```
$ cd web && npm run test -- src/services/lambda
 Test Files  22 skipped (22)
      Tests  98 todo (98)
```

```
$ cd web && npm run typecheck
> tsc -b --noEmit
(zero errors, zero warnings)
```

Acceptance-criteria grep counts (all thresholds met):

| Metric | Threshold | Actual |
|--------|-----------|--------|
| `test.todo` entries                        | ≥ 75 | 98 |
| `expect(` across stubs                     | 0    | 0  |
| D-0N references across stubs               | ≥ 10 | 30 |
| Pitfall references across stubs            | ≥ 8  | 28 |
| Test files under `services/lambda/`        | ≥ 22 | 22 |
| `http.(get|put|post|delete)` in handlers   | ≥ 8  | 8  |
| `X-Amz-Log-Result` in handlers             | ≥ 1  | 2  |
| `X-Amz-Function-Error` in handlers         | ≥ 1  | 1  |
| `FunctionName` in handlers (Pitfall 7)     | ≥ 1  | 1  |

## Deviations from Plan

None — plan executed exactly as written. One implementation choice surfaced:

- **Pre-computed base64 strings**: Plan suggested either runtime `Buffer.from(...).toString('base64')` or inline literals. Chose inline literals for environment independence (vitest runs in jsdom which has no `Buffer` by default; `btoa` doesn't handle UTF-8 natively). The base64 strings were computed via Node one-liner before embedding; a comment in fixtures.ts documents the source string for future edits.

## Dependencies for Downstream Plans

Plans 04-01 through 04-05 should import:

```ts
import { LAMBDA_FIXTURES } from '@/services/lambda/__tests__/fixtures'
import { lambdaHandlers } from '@/services/lambda/__tests__/msw-handlers'

// In component/integration tests:
mswServer.use(...lambdaHandlers)
```

Stub test files will be progressively replaced with real `expect(...)` assertions as each plan's modules come online. Each plan's `<verify>` command targets a specific stub file (e.g. `web/src/services/lambda/api/invokeClient.test.ts` for plan 04-03's invoke work).

## Self-Check: PASSED

Files created (all confirmed on disk):
- `web/src/services/lambda/__tests__/fixtures.ts` — FOUND
- `web/src/services/lambda/__tests__/msw-handlers.ts` — FOUND
- 22 test stub files under `web/src/services/lambda/**` — FOUND (via `find ... | wc -l = 22`)

Commits (all confirmed in git log):
- `bfc6c36` `feat(04-00): Lambda JSON fixtures and MSW handlers for Wave 0` — FOUND
- `a9576d7` `test(04-00): Lambda test.todo() stubs for 22 modules` — FOUND

Test run exit code: 0. Type check exit code: 0.
