---
phase: 05-dynamodb-sqs-generic
plan: 01
subsystem: generic-framework-foundation
tags: [generic, framework, adapters, registry, typescript]
requirements: [GEN-01, GEN-02, GEN-03]
dependency_graph:
  requires: [Phase 4 (ky + TanStack Query patterns), Plan 05-00 (intended test scaffolding)]
  provides: [ServiceDescriptor contract, 3 transport adapters, pure buildRequest, genericKeys, GENERIC_DESCRIPTORS skeleton]
  affects: [Wave 2 plans 05-05 / 05-06 — ListPage / DetailPanel / router consume these exports]
tech_stack:
  added: []
  patterns: [discriminated-union-adapters, pure-buildRequest-preview, placeholder-registry-skeleton]
key_files:
  created:
    - web/src/services/_generic/types.ts
    - web/src/services/_generic/keys.ts
    - web/src/services/_generic/adapters/awsJson.ts
    - web/src/services/_generic/adapters/awsQuery.ts
    - web/src/services/_generic/adapters/rest.ts
    - web/src/services/_generic/adapters/buildRequest.ts
    - web/src/services/_generic/registry.ts
    - web/src/services/_generic/__tests__/msw-handlers.ts
    - web/src/services/_generic/types.test.ts
    - web/src/services/_generic/keys.test.ts
    - web/src/services/_generic/adapters/awsJson.test.ts
    - web/src/services/_generic/adapters/awsQuery.test.ts
    - web/src/services/_generic/adapters/rest.test.ts
    - web/src/services/_generic/adapters/buildRequest.test.ts
    - web/src/services/_generic/registry.test.ts
  modified: []
decisions:
  - "Registry placeholder strategy: every descriptor key is filled with a minimal synthetic descriptor (empty columns, __PLACEHOLDER__.{serviceKey} target). Lets Wave 2 consume the registry shape before Plan 06 authors real descriptors."
  - "msw-handlers.ts for _generic introduced here (Plan 00's intended stub not present on this worktree's base — parallel wave). Documented as Rule 3."
  - "Authorization date stamp uses the phase's today (20260417) per plan stub literal; a future plan can parameterize."
metrics:
  duration: 8m
  tasks: 3
  files_created: 15
  tests_added: 42
  completed: 2026-04-17
---

# Phase 5 Plan 01: Generic framework foundation Summary

Built the `_generic` service framework foundation: the ServiceDescriptor contract, three transport adapters (aws-json / aws-query / rest) with a pure `buildRequest` dispatcher that locks D-07 preview ↔ send byte-equality (Pitfall 7.2.6), the TanStack `genericKeys` factory, and a 7-key placeholder descriptor registry that unblocks Wave 2 UI work before Plan 06 authors real descriptors. Zero new npm dependencies.

## Objective Recap

Plan 05-01 scoped to the **framework skeleton** — types, adapters, keys, registry — without any specific service descriptors. Output: 7 new source files + 7 new test files (all passing), ready for Wave 2 to import.

## What Shipped

### Task 1 — `ServiceDescriptor` types + `genericKeys` factory
- **`types.ts`** exposes:
  - `Adapter = 'rest' | 'aws-json' | 'aws-query'`
  - `ListEndpoint`, `DetailEndpoint`, `MutationSpec` as discriminated unions on `adapter`
  - `ColumnDefinition<Row>` with `cell: (row) => ReactNode`
  - `JsonBodyShape` for Create/Delete form generation (D-02)
  - `ServiceDescriptor<Row>` with optional `kind?: 'list' | 'singleton'` — singleton flags STS (Pitfall 7.2.7)
- **`keys.ts`** exposes `genericKeys.all / list(k) / item(k, id)` as stable readonly tuples.
- Tests: `expectTypeOf` assertions on the discriminated unions + `toEqual` on factory tuples.
- Commit: `7a9578a`

### Task 2 — Three adapters + pure `buildRequest`
- **`awsJson.ts`** — `buildAwsJsonRequest` returns `{url:'/', headers: {'X-Amz-Target', 'Content-Type: application/x-amz-json-1.0', Authorization}, body: JSON.stringify(body)}`. `awsJsonCall` calls buildRequest + fetch, parses JSON.
- **`awsQuery.ts`** — `buildAwsQueryRequest` returns `{url:'/', headers: {'Content-Type: application/x-www-form-urlencoded', Authorization}, body: URLSearchParams.toString()}`. `awsQueryCall` returns `res.text()` — descriptor parseResponse handles XML via DOMParser.
- **`rest.ts`** — generic method/path/body/searchParams round-trip. Returns parsed JSON when `content-type` is JSON, else text.
- **`buildRequest.ts`** — pure dispatcher, exhaustive switch on `input.adapter`.
- **Pitfall 7.2.6 closure**: each `*Call` internally calls its `build*Request`. Tests assert byte-identical `body` and `Authorization` header between `buildRequest(input)` (preview) and the MSW-captured request body from `*Call(input)` (send).
- **T-5-01-02**: explicit test for `&` / `=` inside aws-query param values — `URLSearchParams` preserves them.
- Commit: `ef9cc10`

### Task 3 — Registry skeleton (7 placeholder keys)
- **`registry.ts`** exports `GENERIC_DESCRIPTORS: Record<string, ServiceDescriptor>` with exactly 7 keys:
  - `iam.users`, `iam.roles`, `iam.policies` (D-09 — three independent descriptors)
  - `sts` (kind: 'singleton' — Pitfall 7.2.7)
  - `secretsmanager`, `ssm`, `kms`
- Every value is a `placeholder(...)` factory — empty columns, `__PLACEHOLDER__.{serviceKey}` target, explanatory empty-state copy, plus a top-of-file comment listing the exact Plan 06 imports that replace each placeholder.
- Tests assert the 7-key set, IAM prefix triplet, STS singleton, and runtime extensibility (copy + spread + extra key → 8 keys retrievable).
- Commit: `73e1beb`

## Verification Evidence

```
$ cd web && npm run test -- src/services/_generic --run
Test Files  7 passed (7)
     Tests  42 passed (42)

$ cd web && npx tsc --noEmit -p tsconfig.json
EXIT=0  (zero errors)

$ git diff HEAD web/package.json web/package-lock.json | grep -cE '^\+.*"[a-z@]'
0  (Registry Safety — zero new dependencies)

$ grep -rcE "monaco|CodeMirror|@rjsf|fast-xml-parser|aws-sdk" web/src/services/_generic
0  (no forbidden deps)
```

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 3 — Blocker] Plan 00's `_generic/**` test scaffold not present on this worktree's base**
- **Found during:** Task 1 (initial read)
- **Issue:** The plan's `<read_first>` references Plan 00 `test.todo()` stubs for every `_generic/` file and `__tests__/msw-handlers.ts`. Parallel wave scheduling meant Plan 00's output had not landed on this worktree's base commit (`bf1a06e` — pre Phase 5 Plan 00).
- **Fix:** Authored each test file as real passing tests directly (no `test.todo` → real-test conversion step) and created `web/src/services/_generic/__tests__/msw-handlers.ts` with request-capturing handlers appropriate to Task 2's preview-vs-send equality assertions.
- **Files created:** all 7 test files + `__tests__/msw-handlers.ts` (listed under `key_files.created`).
- **Impact on acceptance criteria:** plan's `Zero test.todo` criteria are trivially satisfied — no `test.todo` was ever introduced.
- **Commits:** `7a9578a`, `ef9cc10`, `73e1beb` (new files rolled into their task commits).

**2. [Rule 1 — Bug] `expectTypeOf(col.cell).returns.toBeAny()` is not chainable**
- **Found during:** Task 1 typecheck (`tsc --noEmit` before commit)
- **Issue:** `ExpectAny<ReactNode>` has no call signatures — the chain `.returns.toBeAny()` fails type-check.
- **Fix:** Rewrote the assertion to `expectTypeOf(col.cell).parameter(0).toEqualTypeOf<{id:string}>()`, which proves the `Row` generic flows correctly into `cell`'s parameter.
- **Files modified:** `web/src/services/_generic/types.test.ts`.
- **Commit:** folded into `7a9578a` (fixed before the task commit).

### Architectural Changes (Rule 4)

None.

### Authentication Gates

None.

## Threat Model Coverage

| Threat ID | Status | Evidence |
|-----------|--------|----------|
| T-5-01-01 | accept | Descriptors are compiled TS modules. Registry placeholder values prove the contract without runtime authorship. |
| T-5-01-02 | mitigated | `awsQuery.test.ts > URL-encodes special characters in param values` — `PathPrefix: '/tenant&id=42'` survives a round-trip; `id` key is not injected. |
| T-5-01-03 | accept (no UI this plan) | Preview-panel XSS mitigation lives in Wave 2 plans that render JSON via `<pre>{JSON.stringify(...)}</pre>`. Framework code in this plan never stringifies to HTML. |
| T-5-01-04 | mitigated | `buildRequest.test.ts` + each `*.test.ts` assert byte-equality of `body` and `Authorization` header between `buildRequest(input)` preview and MSW-captured `*Call(input)` send payloads for all three adapters. |
| T-5-01-05 | accept | `awsQueryCall` returns raw string; parseResponse (descriptor-owned, not in this plan) handles DOMParser nulls. |

## Known Stubs

`web/src/services/_generic/registry.ts` contains 7 intentional stub descriptors. Every stub:
- Has `idField: '__placeholder__'` and `target: '__PLACEHOLDER__.{serviceKey}'`
- Renders the empty-state `"{name} (not yet wired) — Plan 06 wires this descriptor."`
- Is explicitly enumerated in a top-of-file comment as a Plan 06 swap point.

Plan 06 replaces these with real imports from `services/{iam,sts,secretsmanager,ssm,kms}/descriptor*.ts`. Stub is intentional per the plan's own "No specific service descriptors created in this plan" constraint.

## Self-Check: PASSED

- `web/src/services/_generic/types.ts` — FOUND
- `web/src/services/_generic/keys.ts` — FOUND
- `web/src/services/_generic/adapters/awsJson.ts` — FOUND
- `web/src/services/_generic/adapters/awsQuery.ts` — FOUND
- `web/src/services/_generic/adapters/rest.ts` — FOUND
- `web/src/services/_generic/adapters/buildRequest.ts` — FOUND
- `web/src/services/_generic/registry.ts` — FOUND
- Commit `7a9578a` — FOUND (Task 1)
- Commit `ef9cc10` — FOUND (Task 2)
- Commit `73e1beb` — FOUND (Task 3)
- 7 test files present, zero `test.todo` (none were ever introduced)
- `npm run test -- src/services/_generic --run` exits 0 with 42/42 passing
- `npx tsc --noEmit -p tsconfig.json` exits 0 with zero errors
- Registry Safety grep returns 0 — zero new npm dependencies
