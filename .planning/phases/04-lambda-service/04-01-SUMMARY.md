---
phase: 04-lambda-service
plan: 01
subsystem: lambda-api-primitives
tags: [lambda, api, invoke, base64, tdd]
requires:
  - web/src/shared/api/client.ts
  - web/src/shared/types.ts
provides:
  - web/src/services/lambda/api/lambdaClient.ts
  - web/src/services/lambda/api/invokeClient.ts
  - web/src/services/lambda/api/codeUploadClient.ts
  - web/src/services/lambda/api/lambdaKeys.ts
  - web/src/services/lambda/__tests__/fixtures.ts
  - web/src/services/lambda/__tests__/msw-handlers.ts
affects:
  - web/src/shared/types.ts
tech-stack:
  added: []
  patterns:
    - native fetch for header-rich responses (invoke)
    - Uint8Array + TextDecoder for base64 UTF-8 decoding
    - Blob.arrayBuffer() with FileReader fallback for jsdom
    - 32 KB chunked btoa for large-file base64
key-files:
  created:
    - web/src/services/lambda/api/lambdaClient.ts
    - web/src/services/lambda/api/lambdaClient.test.ts
    - web/src/services/lambda/api/invokeClient.ts
    - web/src/services/lambda/api/invokeClient.test.ts
    - web/src/services/lambda/api/codeUploadClient.ts
    - web/src/services/lambda/api/codeUploadClient.test.ts
    - web/src/services/lambda/api/lambdaKeys.ts
    - web/src/services/lambda/api/lambdaKeys.test.ts
    - web/src/services/lambda/__tests__/fixtures.ts
    - web/src/services/lambda/__tests__/msw-handlers.ts
  modified:
    - web/src/shared/types.ts
decisions:
  - "Bootstrapped Plan 00 fixtures + MSW handlers inline because Plan 00 had not run on this parallel wave's base."
  - "FileReader fallback added to fileToBase64 — jsdom's File does not implement Blob.arrayBuffer(); browser path uses Blob.arrayBuffer() directly."
metrics:
  duration: "~25 min"
  tasks: 2
  files: 11
  tests_passing: 22
  completed: "2026-04-17T21:52Z"
commits:
  - 53fad55 feat(04-01): lambdaClient, lambdaKeys, shared Lambda types + Wave-0 fixtures
  - 674d600 feat(04-01): invokeClient (header-aware + UTF-8 log decode) and codeUploadClient
---

# Phase 04 Plan 01: Lambda API Primitives Summary

Low-level Lambda API layer — JSON-over-REST client, header-aware invoke client with base64 UTF-8 log decoding, chunked file→base64 helper, and TanStack Query key factory — shipped with 22 passing tests and zero new npm dependencies.

## Outcome

All 4 Lambda API primitive modules implemented per Plan 04-01 spec with TDD (test written and run alongside implementation). Phase-4 pitfalls 1, 2, 3, 8, and 9 are guarded at this single layer so higher-level hooks/components never have to think about them.

| Module | Purpose | Pitfalls Guarded |
|---|---|---|
| `lambdaClient.ts` | `lambdaGet/Post/Put/Delete` JSON helpers | 9 (no Qualifier on delete) |
| `invokeClient.ts` | Native-fetch invoke with header extraction | 1 (UTF-8 logs), 2 (X-Amz-Function-Error), 3 (JSON-parse fallback), 8 (no client timeout), 9 (encodeURIComponent) |
| `codeUploadClient.ts` | `fileToBase64` — chunked btoa | C-2 (no new deps) |
| `lambdaKeys.ts` | TanStack Query key factory | C-3 (prefix-match invalidation) |

## Key Implementation Notes

### Invoke — native fetch, not ky
The invoke response's **headers are the product** (X-Amz-Log-Result, X-Amz-Function-Error, X-Amz-Executed-Version). ky's `.json()` would discard them. Native `fetch` is used only here; everything else routes through `apiClient` (ky).

### UTF-8 log decoding (Pitfall 1)
`atob(b64)` returns a binary string where each char is one byte. Using it directly on UTF-8 log output mangles multi-byte sequences (Korean `안녕` → `ì•ˆë…•`). Correct path: `atob → Uint8Array → TextDecoder('utf-8').decode(bytes)`. Tested explicitly with "안녕 from Lambda" in `invokeSuccessLogBase64`.

### Function-error detection (Pitfall 2)
Lambda invoke returns HTTP 200 even when the user function crashes. The only reliable "was this an error?" signal is the `X-Amz-Function-Error` header. HTTP status is deliberately not used. Test case `invokeFunction('boom')` asserts `functionError === 'Unhandled'` with status 200 (no throw).

### 32 KB chunking in `fileToBase64` (Pitfall C-2)
`String.fromCharCode(...bytes)` with a >1 MB Uint8Array blows the JS engine's argument-list size on some browsers. 32 KB chunks are safe and fast. Verified via 100 KB round-trip test that reconstructs byte-by-byte.

### `shared/types.ts` extended, not replaced
Added 6 Lambda types after the existing S3 types. Phase 4 later plans (hooks, mutations, components) import from the single canonical location.

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 3 — Blocker bootstrap] Plan 00 scaffolding absent on this wave's base**
- **Found during:** Task 1 setup — `web/src/services/lambda/__tests__/fixtures.ts` and `msw-handlers.ts` do not exist on the worktree base (`3ca3b41`). Plan 00 has not been executed on this parallel wave.
- **Action:** Created both files inline per Plan 00 spec (fixtures covering all 8 endpoints with base64 UTF-8 log fixture; MSW handlers in specificity-ordered list). Reduces risk that Plan 02 depends on their absence.
- **Files created:** `web/src/services/lambda/__tests__/fixtures.ts`, `web/src/services/lambda/__tests__/msw-handlers.ts`
- **Commit:** 53fad55
- **Note:** The remaining Plan 00 `test.todo()` stub files (22 component/hook test files) were **not** bootstrapped — Plan 01 only owns the 4 API files. Downstream plans can still run Plan 00 to fill the rest, or each plan can bootstrap its own stubs.

**2. [Rule 1 — Env fix] `fileToBase64` FileReader fallback**
- **Found during:** Task 2 first test run — 3 failures: `TypeError: file.arrayBuffer is not a function` in jsdom.
- **Issue:** jsdom's `File` does not implement `Blob.arrayBuffer()`. Browser does.
- **Fix:** Added a `readAsArrayBuffer` helper that prefers `Blob.arrayBuffer()` when available and falls back to `FileReader.readAsArrayBuffer` otherwise. Both paths are universal.
- **Commit:** 674d600
- **Impact:** None — browser behavior unchanged; test environment now works.

**3. [Rule 1 — Trivial] `npm install` re-run**
- **Found during:** Task 1 test run.
- **Issue:** Partial `node_modules` on this worktree; vitest binary missing, jsdom partially extracted.
- **Fix:** Ran `npm install` to completion. No `package.json`/`package-lock.json` changes.
- **No code impact.**

## Authentication / Security Notes

`AUTHORIZATION` constant is the dummy SigV4 header required by the backend for presence checks. MiniStack does not verify signatures; value matches the S3/EC2 pattern. No secrets involved.

## Verification Evidence

```
$ cd web && npm run test -- src/services/lambda/api --run
 Test Files  4 passed (4)
      Tests  22 passed (22)

$ cd web && npx tsc --noEmit -p tsconfig.json
(zero output — zero errors)

$ grep -rn "dangerouslySetInnerHTML" web/src/services/lambda/
(zero matches)

$ grep -rn "AbortController\|signal:" web/src/services/lambda/api/invokeClient.ts
33: * [Pitfall 8] No AbortController / client-side timeout — cold starts are
(comment-only reference explaining intentional absence; no runtime usage)
```

## Acceptance Criteria — Status

Task 1 (lambdaClient, lambdaKeys, types):
- [x] 4 lambdaGet/Post/Put/Delete exports
- [x] `AWS4-HMAC-SHA256` constant with `/lambda/` service scope
- [x] `searchParams` supported on lambdaGet
- [x] `lambdaDelete(path: string)` — no searchParams (Pitfall 9)
- [x] lambdaKeys.functions/function/triggers/functionUrl exported
- [x] 6 Lambda type exports in shared/types.ts
- [x] Zero `test.todo` — real passing tests
- [x] tests + tsc pass

Task 2 (invokeClient, codeUploadClient):
- [x] invokeFunction export
- [x] TextDecoder + Uint8Array (Pitfall 1)
- [x] x-amz-function-error and x-amz-log-result reads (Pitfall 2)
- [x] X-Amz-Invocation-Type header sent
- [x] encodeURIComponent applied (Pitfall 9)
- [x] No AbortController in code path (Pitfall 8)
- [x] arrayBuffer + 32 KB chunk + btoa in codeUploadClient
- [x] Zero `test.todo` — real passing tests
- [x] tests + tsc pass

## Threat Model — Applied Mitigations

| Threat ID | Mitigation applied |
|---|---|
| T-4-01-01 | `encodeURIComponent(name)` in `invokeFunction` — tested with `"hello world"` → `hello%20world` |
| T-4-01-04 | 32 KB chunking in `fileToBase64` — 100 KB round-trip test confirms no call-stack overflow |
| T-4-01-06 | `functionError` sourced exclusively from header; test covers HTTP 200 + error header path |
| T-4-01-07 | No AbortController in invoke path; verified by grep |

## Known Stubs / Deferred

None. Every export is wired to real code and real tests.

## Self-Check: PASSED

- FOUND: web/src/services/lambda/api/lambdaClient.ts
- FOUND: web/src/services/lambda/api/lambdaKeys.ts
- FOUND: web/src/services/lambda/api/invokeClient.ts
- FOUND: web/src/services/lambda/api/codeUploadClient.ts
- FOUND: web/src/services/lambda/__tests__/fixtures.ts
- FOUND: web/src/services/lambda/__tests__/msw-handlers.ts
- FOUND commit 53fad55
- FOUND commit 674d600
- Tests: 22/22 passing
- tsc: 0 errors
