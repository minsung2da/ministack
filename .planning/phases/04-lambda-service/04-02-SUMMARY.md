---
phase: 04-lambda-service
plan: 02
subsystem: lambda-query-layer
tags: [lambda, tanstack-query, mutations, cache-invalidation, tdd]
requires:
  - web/src/services/lambda/api/lambdaClient.ts
  - web/src/services/lambda/api/invokeClient.ts
  - web/src/services/lambda/api/lambdaKeys.ts
  - web/src/shared/types.ts
provides:
  - web/src/services/lambda/api/useFunctions.ts
  - web/src/services/lambda/api/useFunction.ts
  - web/src/services/lambda/api/useEventSourceMappings.ts
  - web/src/services/lambda/api/useFunctionUrl.ts
  - web/src/services/lambda/api/functionMutations.ts
  - web/src/services/lambda/api/invokeMutation.ts
affects:
  - web/src/services/lambda/api/
tech-stack:
  added: []
  patterns:
    - TanStack Query v5 useQuery with queryKey factory + placeholderData for marker pagination
    - Discriminated union (LambdaCodeSource) → per-variant POST body construction
    - Spy-enforced invalidation contracts (`vi.spyOn(qc, 'invalidateQueries')`) to lock in Pitfall C-3
    - Cache-neutral mutation for Invoke (no onSuccess handler) per Pitfall 6
key-files:
  created:
    - web/src/services/lambda/api/useFunctions.ts
    - web/src/services/lambda/api/useFunctions.test.tsx
    - web/src/services/lambda/api/useFunction.ts
    - web/src/services/lambda/api/useFunction.test.tsx
    - web/src/services/lambda/api/useEventSourceMappings.ts
    - web/src/services/lambda/api/useEventSourceMappings.test.tsx
    - web/src/services/lambda/api/useFunctionUrl.ts
    - web/src/services/lambda/api/useFunctionUrl.test.tsx
    - web/src/services/lambda/api/functionMutations.ts
    - web/src/services/lambda/api/functionMutations.test.tsx
    - web/src/services/lambda/api/invokeMutation.ts
    - web/src/services/lambda/api/invokeMutation.test.tsx
  modified: []
decisions:
  - "Renamed Plan 00 stubs from `.test.ts` to `.test.tsx` since real tests need JSX for the QueryClientProvider wrapper (same pattern as S3 Phase 3 hook tests)."
  - "CreateFunction invalidation key hard-coded as `['lambda', 'functions']` (prefix) rather than `lambdaKeys.functions(null)` (which produces `['lambda','functions', null]`) — spy assertions need the prefix to verify every marker variant is covered."
  - "DeleteFunction orders `removeQueries(detail)` BEFORE `invalidateQueries(list)` so UI consumers reading the list after deletion never see a cached detail ref to a gone function."
metrics:
  duration: "~15 min"
  tasks: 2
  files: 12
  tests_passing: 23
  completed: "2026-04-17"
commits:
  - 9e1342a feat(04-02) Lambda query hooks — useFunctions/useFunction/useEventSourceMappings/useFunctionUrl
  - a49e0b5 feat(04-02) Lambda mutations — Create/Delete/UpdateConfiguration + cache-neutral Invoke
---

# Phase 04 Plan 02: Lambda Query Hook + Mutation Layer Summary

TanStack Query hook and mutation layer sitting between Plan 01's API primitives and the UI pages (Plans 03-05). Six modules, 23 new passing tests, four Phase-4 pitfalls spy-enforced at the cache-invalidation boundary.

## Outcome

| Module | Purpose | Pitfalls / Decisions Guarded |
|---|---|---|
| `useFunctions.ts` | ListFunctions with marker pagination + placeholderData | LAM-01 |
| `useFunction.ts` | GetFunction detail (disabled on empty name) | LAM-03 |
| `useEventSourceMappings.ts` | ListEventSourceMappings by `FunctionName` | Pitfall 7 |
| `useFunctionUrl.ts` | ListFunctionUrlConfigs (plural `/urls` — 200+empty, not 404) | D-07, LAM-03 |
| `functionMutations.ts` | Create/Delete/UpdateConfiguration | Pitfall 9, C-3, D-02 |
| `invokeMutation.ts` | Cache-neutral Invoke | Pitfall 6 |

## Key Implementation Notes

### Marker pagination with `placeholderData` (LAM-01)
`useFunctions(marker, maxItems=50)` returns the prior page while the next page is fetching so the Cloudscape table never flashes empty between pagination clicks. `placeholderData: (prev) => prev` is the v5 idiom replacing v4's `keepPreviousData`.

### Discriminated code source (D-02)
`CreateFunctionInput.Code` is the `LambdaCodeSource` discriminated union from `shared/types.ts`. `buildCreateBody` pattern-matches on `kind` and emits exactly the backend-expected keys per variant:

- `{ kind: 'zip', ZipFile }` → `{ Code: { ZipFile }, PackageType: 'Zip' }`
- `{ kind: 's3', S3Bucket, S3Key }` → `{ Code: { S3Bucket, S3Key }, PackageType: 'Zip' }`
- `{ kind: 'image', ImageUri }` → `{ Code: { ImageUri }, PackageType: 'Image' }`

ImageUri is the ONLY trigger for `PackageType: 'Image'` — tested explicitly.

### Cache-neutral invoke (Pitfall 6)
`useInvoke` has no `onSuccess`, no `onSettled`. A spy test asserts `invalidateQueries` and `removeQueries` are never called across a full invoke round-trip. Invoke result lives in `mutation.data` only; it is never cached by key.

### Single invalidation per mutation (Pitfall C-3)
Every mutation's `onSuccess` makes exactly one `invalidateQueries` call (`useDeleteFunction` also makes one `removeQueries`). Spy tests assert `toHaveBeenCalledTimes(1)` on `invalidateQueries` for each mutation — guards against future drift where someone "helpfully" also invalidates the functions list on Update (which would blow every paginated page in the cache on a single field edit).

### No Qualifier on delete (Pitfall 9)
`lambdaDelete(path)` has no `searchParams` parameter (enforced at the Plan 01 layer). The delete test asserts the URL has `search === ''` and `pathname === '/2015-03-31/functions/hello'` — no code path exists to attach a `Qualifier` query param.

### `FunctionName` spelling (Pitfall 7)
The ESM test captures the outgoing URL and asserts:
- `searchParams.get('FunctionName') === 'hello'` ✓
- `searchParams.get('Function') === null` ✓

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 1 — trivia] Rename `.test.ts` → `.test.tsx` on 6 test files**
- **Found during:** Task 1 first test run — Vitest rejected JSX in `.ts` files.
- **Issue:** Plan 00 stubs were `.ts` (no JSX needed for `test.todo()`), but real tests need JSX for `QueryClientProvider`.
- **Fix:** Renamed each stub to `.tsx` as the real test was written. Same convention as S3 Phase 3 (`useBuckets.test.tsx`, `bucketMutations.test.tsx`).
- **Files:** all 6 test files for this plan.
- **No code impact.**

**2. [Rule 1 — trivia] Unused `waitFor` import removed**
- **Found during:** Task 2 `tsc --noEmit`.
- **Issue:** `functionMutations.test.tsx` imported `waitFor` but only used `act` after I refactored assertions to await `mutateAsync` directly.
- **Fix:** Dropped `waitFor` from the import.

**3. [Rule 3 — blocker] `npm install` rerun (env)**
- **Found during:** Task 1 test run — `vitest: not found`.
- **Issue:** Worktree `node_modules` was incomplete after soft reset at executor start.
- **Fix:** `npm install` — no `package-lock.json` changes.
- **No code impact.**

## Authentication / Security Notes

All three mutation hooks inherit the dummy SigV4 `AUTHORIZATION` header from Plan 01's `lambdaClient`. No client-side validation of UpdateConfiguration patch fields beyond the TypeScript whitelist type — the backend's `_update_config` whitelist at `lambda_svc.py:842-860` is the authoritative filter (T-4-02-04 accepted in threat model).

User-supplied environment-variable values flow through `lambdaPut` as plain JSON (D-05 plaintext, no client-side redaction). `JSON.stringify` on the structured body is the only serialization path — no string concatenation (T-4-02-01 mitigated).

## Verification Evidence

```
$ cd web && npm run test -- src/services/lambda/api --run
 Test Files  10 passed (10)
      Tests  45 passed (45)

$ cd web && npx tsc --noEmit -p tsconfig.json
(zero output — zero errors)
```

Acceptance-criteria grep counts:

| Metric | Threshold | Actual |
|---|---|---|
| `export function useFunctions` in useFunctions.ts | == 1 | 1 |
| `export function useFunction\b` in useFunction.ts | == 1 | 1 |
| `export function useEventSourceMappings` | == 1 | 1 |
| `export function useFunctionUrl` | == 1 | 1 |
| `placeholderData` in useFunctions.ts | ≥ 1 | 1 |
| `FunctionName` in useEventSourceMappings.ts | ≥ 1 | 1 |
| `/urls` in useFunctionUrl.ts | ≥ 1 | 1 |
| `encodeURIComponent` in useFunction.ts | ≥ 1 | 1 |
| `export function useCreate/Delete/UpdateConfiguration` | == 3 | 3 |
| `export function useInvoke` | == 1 | 1 |
| `ZipFile\|S3Bucket\|ImageUri` in functionMutations.ts | ≥ 3 | 3 |
| `PackageType.*Image` | ≥ 1 | 1 |
| `invalidateQueries` in functionMutations.ts | ≥ 3 | 3 |
| `invalidateQueries` in invokeMutation.ts | == 0 | 0 |
| `Qualifier` in functionMutations.ts | == 0 | 0 |
| `removeQueries` in functionMutations.ts | ≥ 1 | 1 |
| `test.todo` across the 6 test files | == 0 | 0 |

## Threat Model — Applied Mitigations

| Threat ID | Mitigation applied |
|---|---|
| T-4-02-01 (JSON injection) | `JSON.stringify` on structured object via `lambdaPost`/`lambdaPut` — no string concat anywhere in this layer |
| T-4-02-03 (accidental version delete) | `useDeleteFunction` test asserts URL `search === ''` — no Qualifier code path exists |
| T-4-02-05 (cache thrash self-DoS) | Every mutation spy-asserted `invalidateQueries.toHaveBeenCalledTimes(1)` |
| T-4-02-06 (stale cache leak from invoke) | `invalidateQueries` and `removeQueries` spy-asserted `.not.toHaveBeenCalled()` across invoke |

Accepted: T-4-02-02 (delete is un-guarded at hook layer — gate is Plan 03 type-to-confirm modal) and T-4-02-04 (whitelist is server-enforced; client type is guidance only).

## Known Stubs / Deferred

None. Every export is wired to real code and real tests. No placeholder components, no hardcoded empty arrays downstream of these hooks yet — those appear only when Plans 03-05 consume these hooks for the actual pages.

## Self-Check: PASSED

Files created (confirmed on disk):
- `web/src/services/lambda/api/useFunctions.ts` — FOUND
- `web/src/services/lambda/api/useFunction.ts` — FOUND
- `web/src/services/lambda/api/useEventSourceMappings.ts` — FOUND
- `web/src/services/lambda/api/useFunctionUrl.ts` — FOUND
- `web/src/services/lambda/api/functionMutations.ts` — FOUND
- `web/src/services/lambda/api/invokeMutation.ts` — FOUND
- 6 matching `.test.tsx` files — FOUND

Commits (confirmed in git log):
- `9e1342a` `feat(04-02): Lambda query hooks — useFunctions/useFunction/useEventSourceMappings/useFunctionUrl` — FOUND
- `a49e0b5` `feat(04-02): Lambda mutations — Create/Delete/UpdateConfiguration + cache-neutral Invoke` — FOUND

Test run: 45/45 passing (10 api/ test files). Type check: 0 errors.
