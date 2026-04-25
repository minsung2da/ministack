---
phase: 04-lambda-service
verified: 2026-04-17T23:44:21Z
status: human_needed
score: 3/3 success criteria verified at code level
overrides_applied: 0
requirements_covered: [LAM-01, LAM-02, LAM-03]
decisions_verified: [D-01, D-02, D-03, D-04, D-05, D-06, D-07, D-08, D-09, D-10]
forbidden_term_greps:
  - target: "Monaco|CodeMirror|monaco|codemirror in PayloadEditor.tsx"
    expected: 0
    actual: 0
  - target: "Tabs|TabsBar|CodeView in InvokeResult.tsx"
    expected: 0
    actual: 0
  - target: "[Cc]ancel in InvokePanel.tsx"
    expected: 0
    actual: 0
  - target: "AbortController in InvokePanel.tsx"
    expected: 0
    actual: 0
  - target: "TODO Plan 05 in FunctionDetailPage.tsx"
    expected: 0
    actual: 0
  - target: "test.todo anywhere under web/src/services/lambda"
    expected: 0
    actual: 0
  - target: "onClick|onSubmit|useMutation in TriggersPanel.tsx (D-07)"
    expected: 0
    actual: 0
  - target: "masking/***/reveal in EnvironmentPanel.tsx (D-05)"
    expected: 0
    actual: 0
  - target: "D-08 version UI tokens (Qualifier/publish/alias) in user-facing components"
    expected: 0 non-doc occurrences
    actual: "All Qualifier/publish/alias mentions are doc-comments or negative-assertion tests confirming absence; zero version UI surface"
  - target: "New npm dependencies since Phase 3"
    expected: 0
    actual: 0 (web/package.json untouched since 01-03 — Registry Safety intact)
test_evidence:
  suite: "web $ npm run test -- src/services/lambda --run"
  files: 22 passed (22)
  tests: 112 passed (112)
  typecheck: "npx tsc --noEmit -p tsconfig.json → 0 errors"
human_verification:
  - test: "04-05-SUMMARY.md 30-step UAT checklist against live :4566"
    expected: "All 30 steps pass; user responds 'approved'"
    why_human: "Live Docker cold-start invocation, clipboard paste, tab switching in real browser, CLI-driven env var/trigger/error-function creation, and accessibility (keyboard focus ring) cannot be verified via code greps or jsdom tests"
---

# Phase 4: Lambda Service — Verification Report

**Phase Goal (ROADMAP.md):** Users can see the Lambda function list, view function configuration/environment/triggers on a detail page, and invoke a function with a JSON payload to see the response and execution log.

**Verified:** 2026-04-17T23:44:21Z
**Status:** human_needed — all automated checks pass; human UAT gate (04-05 Task 3) still pending.
**Re-verification:** No — initial verification.

## Goal Achievement

### Observable Truths (from ROADMAP Success Criteria)

| # | Truth | Status | Evidence |
|---|-------|--------|----------|
| 1 | User can see Lambda function list with runtime, handler, and last modified time | VERIFIED (code) | `FunctionListPage.tsx` (78 lines) + `FunctionTable.tsx` (199 lines) + `columns.ts` wire `useFunctions()` → Cloudscape Table with Runtime, Handler, LastModified (rendered via `RelativeTime` per D-10). Route `/services/lambda` registered in `routes.tsx:126-135` BEFORE the `:serviceKey` wildcard (Pitfall C-1). |
| 2 | User can open a function detail page showing configuration, environment variables, and triggers | VERIFIED (code) | `FunctionDetailPage.tsx` imports `ConfigurationPanel`, `EnvironmentPanel`, `TriggersPanel` and renders a 4-tab Cloudscape Tabs shell (D-03). Route `/services/lambda/:functionName` at `routes.tsx:130-133`. All three panels are substantive (ConfigurationPanel 94 LoC, EnvironmentPanel 93 LoC, TriggersPanel 174 LoC) and consume live TanStack Query hooks (`useFunction`, `useEventSourceMappings`, `useFunctionUrl`). |
| 3 | User can invoke a function with a JSON payload and see the response body and execution log | VERIFIED (code) | `InvokePanel.tsx` (107 LoC) owns `useInvoke(functionName)` mutation; `PayloadEditor.tsx` (97 LoC) owns JSON-validated payload textarea; `InvokeResult.tsx` (99 LoC) renders D-06 vertical stack (Alert? → Response `<pre>` → Logs `<pre>`). `invokeClient.ts` decodes base64 `LogResult` with `TextDecoder('utf-8')` (Pitfall 1) and reads `X-Amz-Function-Error` header for error detection (Pitfall 2). 112/112 tests pass. |

**Score:** 3/3 success criteria verified at the code/test layer. **LIVE runtime validation is the human-UAT-gate remainder** — see human_verification.

### Required Artifacts (all from Plan summaries)

| Artifact | Expected | Status | Details |
|----------|----------|--------|---------|
| `web/src/services/lambda/LambdaLayout.tsx` | Layout shell for lambda routes | VERIFIED | 9 LoC shell (Outlet + Flashbar consumer), registered in routes.tsx |
| `web/src/services/lambda/FunctionListPage.tsx` | LAM-01 list page | VERIFIED | 78 LoC; wires FunctionTable + Create/Delete modals |
| `web/src/services/lambda/FunctionDetailPage.tsx` | LAM-03 detail page w/ 4 tabs + lifted payload state | VERIFIED | 141 LoC; 4-tab Cloudscape Tabs; `useEffect([functionName])` resets payload to `'{}'`; InvokePanel in Test tab |
| `web/src/services/lambda/components/FunctionTable.tsx` | Marker-pagination table | VERIFIED | 199 LoC |
| `web/src/services/lambda/components/CreateFunctionModal.tsx` | D-01 Create + D-02 Zip/S3/Image | VERIFIED | 350 LoC; `type Source = 'zip' \| 's3' \| 'image'`; Cloudscape Tiles; three mutually-exclusive input sets |
| `web/src/services/lambda/components/DeleteFunctionModal.tsx` | D-01 Delete w/ type-to-confirm | VERIFIED | 105 LoC; Pitfall 9 guard test asserts DELETE URL never contains `Qualifier` |
| `web/src/services/lambda/components/ConfigurationPanel.tsx` | D-03 Configuration tab | VERIFIED | 94 LoC; KeyValuePairs w/ 12 rows incl. Image URI branch for `PackageType === 'Image'`; Copy buttons on ARN/Role |
| `web/src/services/lambda/components/EnvironmentPanel.tsx` | D-05 plaintext env vars | VERIFIED | 93 LoC; `cell: (e) => e.value` renders plaintext; grep for mask/***/reveal = 0 |
| `web/src/services/lambda/components/TriggersPanel.tsx` | D-07 read-only triggers + function URLs | VERIFIED | 174 LoC; grep for onClick/onSubmit/useMutation = 0 — zero mutation surface |
| `web/src/services/lambda/components/PayloadEditor.tsx` | D-04 JSON-validated textarea | VERIFIED | 97 LoC; 2× `JSON.parse`; 4× `Textarea` references; 0× Monaco/CodeMirror |
| `web/src/services/lambda/components/InvokeResult.tsx` | D-06 vertical stack Alert→Response→Logs | VERIFIED | 99 LoC; 3× `<pre`; 0× Tabs/TabsBar/CodeView |
| `web/src/services/lambda/components/InvokePanel.tsx` | D-09 cold-start spinner state machine | VERIFIED | 107 LoC; 6× Spinner, 4× 3000/setTimeout references; 0× [Cc]ancel; 0× AbortController |
| `web/src/services/lambda/components/samplePayloads.ts` | 4 sample templates | VERIFIED | Empty / API Gateway v2 / S3 Put / SQS batch |
| `web/src/services/lambda/components/RelativeTime.tsx` | D-10 relative + hover absolute | VERIFIED | 37 LoC; reused by ConfigurationPanel, FunctionTable columns, TriggersPanel |
| `web/src/services/lambda/api/lambdaClient.ts` | JSON REST client | VERIFIED | Pitfall 9 guard — no Qualifier param |
| `web/src/services/lambda/api/invokeClient.ts` | Header-aware invoke + UTF-8 log decode | VERIFIED | `TextDecoder('utf-8')` + base64 atob + X-Amz-Function-Error read (Pitfalls 1+2) |
| `web/src/services/lambda/api/codeUploadClient.ts` | Chunked base64 for zip upload | VERIFIED | 32 KB chunk loop + FileReader jsdom fallback |
| `web/src/services/lambda/api/lambdaKeys.ts` | TanStack Query key factory | VERIFIED | `lambdaKeys.functions()`, `.function(name)`, `.triggers(name)` |
| `web/src/services/lambda/api/useFunctions.ts` | list query | VERIFIED | Marker pagination via `placeholderData` |
| `web/src/services/lambda/api/useFunction.ts` | detail query | VERIFIED | |
| `web/src/services/lambda/api/useEventSourceMappings.ts` | triggers query | VERIFIED | |
| `web/src/services/lambda/api/useFunctionUrl.ts` | function URL config query | VERIFIED | |
| `web/src/services/lambda/api/functionMutations.ts` | Create/Delete/Update mutations | VERIFIED | Pitfall 9 Qualifier-absence guard in test |
| `web/src/services/lambda/api/invokeMutation.ts` | Cache-neutral invoke mutation (Pitfall 6) | VERIFIED | |
| `web/src/services/lambda/__tests__/fixtures.ts` + `msw-handlers.ts` | Wave-0 test scaffolding | VERIFIED | 22 test files exercise these MSW handlers |

### Key Link Verification

| From | To | Via | Status | Details |
|------|----|----|--------|---------|
| `routes.tsx` | `LambdaLayout`, `FunctionListPage`, `FunctionDetailPage` | lazy import + child routes | WIRED | Lambda block placed BEFORE `services/:serviceKey` wildcard (Pitfall C-1) |
| `FunctionListPage` | `useFunctions()` | TanStack Query hook | WIRED | Fetches live data; placeholderData sustains marker pagination |
| `FunctionListPage` | `CreateFunctionModal`, `DeleteFunctionModal` | local state toggles | WIRED | Actions menu in FunctionTable triggers modals |
| `FunctionDetailPage` | `ConfigurationPanel`, `EnvironmentPanel`, `TriggersPanel`, `InvokePanel` | Cloudscape Tabs `tabs: [...]` | WIRED | All 4 panels mounted via tabs array |
| `InvokePanel` | `useInvoke(functionName)` | mutation hook | WIRED | `mutation.mutate(parsed)` on submit |
| `InvokePanel` | `PayloadEditor`, `InvokeResult` | controlled props | WIRED | `payload`/`onPayloadChange`/`onValidityChange` + `result` prop |
| `invokeClient` | Lambda backend `/2015-03-31/functions/{name}/invocations` | native `fetch` | WIRED | Reads `X-Amz-Function-Error` + `X-Amz-Log-Result` headers |
| `EnvironmentPanel` | `Configuration.Environment.Variables` | read from props | WIRED | Plaintext render (D-05) |
| `ConfigurationPanel`, `FunctionTable`, `TriggersPanel` | `RelativeTime` | component import | WIRED | D-10 relative + hover absolute |
| `FunctionDetailPage.test.tsx` | asserts `<InvokePanel>` mounts when Test tab active | integration test | WIRED | Task 2 tests pass |

### Locked Decisions (D-01 … D-10) — Concrete Evidence

| # | Decision | Status | Evidence (file:line) |
|---|----------|--------|----------------------|
| D-01 | Create + Delete included beyond read-only LAM scope | VERIFIED | `components/CreateFunctionModal.tsx` (350 LoC), `components/DeleteFunctionModal.tsx` (105 LoC). `api/functionMutations.ts` wires both. |
| D-02 | Code upload: Zip + S3 key + Container Image URI (all three) | VERIFIED | `CreateFunctionModal.tsx:19` `type Source = 'zip' \| 's3' \| 'image'`; `:76-80` separate state slots for each; `:117-138` branched payload assembly. 18 matches of `ZipFile\|S3Bucket\|ImageUri\|PackageType` in file. |
| D-03 | Dedicated Test tab in 4-tab detail page | VERIFIED | `FunctionDetailPage.tsx:20-21` doc "Configuration / Environment / Triggers / Test locked by D-03"; `:106,116,124` mounts ConfigurationPanel, EnvironmentPanel, TriggersPanel; InvokePanel mounts in Test tab |
| D-04 | Cloudscape Textarea + realtime JSON validation; NO Monaco/CodeMirror | VERIFIED | `components/PayloadEditor.tsx` — 2× `JSON.parse`, 4× `Textarea`, 5× `onValidityChange\|isValid`. Grep `Monaco\|CodeMirror\|monaco\|codemirror` = **0**. |
| D-05 | Env vars in plaintext; no masking | VERIFIED | `components/EnvironmentPanel.tsx:88` `cell: (e: EnvEntry) => e.value` renders plaintext. Grep `\*\*\*\|mask\|hidden\|reveal\|Reveal` = **0**. |
| D-06 | Response above, Logs below; NO tabs; NO CodeView | VERIFIED | `components/InvokeResult.tsx` — 3× `<pre` (Alert+Response+Logs stacked vertically). Grep `Tabs\|TabsBar\|CodeView` = **0**. |
| D-07 | Triggers tab read-only (no create/edit/delete) | VERIFIED | `components/TriggersPanel.tsx` — Grep `onClick\|onSubmit\|useMutation` = **0**. Zero mutation surface. |
| D-08 | Versions / Aliases deferred — no version UI | VERIFIED | Grep for `Qualifier\|publish\|alias\|Version` in user-facing components: only doc-comments (e.g. `ConfigurationPanel.tsx:32` "NO version / alias / Qualifier UI (D-08)") and negative-assertion tests (`DeleteFunctionModal.test.tsx:84` `expect(capturedUrl).not.toContain('Qualifier')`). No version selector, publish button, or alias dropdown. |
| D-09 | Inline Spinner + cold-start copy; no Cancel; no AbortController | VERIFIED | `components/InvokePanel.tsx:47-59` state machine: `setSpinnerCopy(copy.lambda.invokingCopy)` → `setTimeout(() => setSpinnerCopy(copy.lambda.stillInvokingCopy), 3000)` + cleanup. 6× Spinner, 4× 3000/setTimeout. Grep `[Cc]ancel` = **0**; grep `AbortController` = **0**. |
| D-10 | Relative time + hover absolute ISO | VERIFIED | `components/RelativeTime.tsx` (37 LoC) used by `ConfigurationPanel.tsx`, `components/columns.ts` (FunctionTable Last Modified), `TriggersPanel.tsx` (ESM last processing + function URL created/lastModified) |

### Data-Flow Trace (Level 4)

| Artifact | Data Variable | Source | Produces Real Data | Status |
|----------|---------------|--------|--------------------|--------|
| `FunctionListPage` | functions array | `useFunctions()` → `lambdaClient.listFunctions()` → `GET /2015-03-31/functions` | Yes (fetched via ky from :4566) | FLOWING |
| `FunctionDetailPage` | `data.Configuration` | `useFunction(name)` → `lambdaClient.getFunction(name)` | Yes | FLOWING |
| `EnvironmentPanel` | `Environment.Variables` | prop drilled from `useFunction` `Configuration` | Yes | FLOWING |
| `TriggersPanel` | ESM list + function URL | `useEventSourceMappings(name)` + `useFunctionUrl(name)` | Yes | FLOWING |
| `InvokePanel` | mutation `data` (response+logs+functionError) | `useInvoke(name).mutate(payload)` → `invokeClient.invokeFunction` → POST `.../invocations` | Yes — live fetch of real backend response body + headers | FLOWING |

No HOLLOW, DISCONNECTED, or HOLLOW_PROP artifacts detected.

### Behavioral Spot-Checks

| Behavior | Command | Result | Status |
|----------|---------|--------|--------|
| Full Lambda test suite passes | `cd web && npm run test -- src/services/lambda --run` | 22 files / 112 tests passed, 0 failed | PASS |
| TypeScript compiles | `cd web && npx tsc --noEmit -p tsconfig.json` | Zero output, zero errors | PASS |
| No new npm deps introduced in Phase 4 | `git log --oneline web/package.json` since Phase 3 merge | Only Phase 1 commits (35a404b, eac5ac3) — Phase 4 added none | PASS |
| Live end-to-end invoke against :4566 | 04-05-SUMMARY.md UAT steps 1–30 | — | SKIP — routed to human (needs live backend + browser) |

### Requirements Coverage

| Requirement | Source Plan | Description (REQUIREMENTS.md) | Status | Evidence |
|-------------|-------------|-------------------------------|--------|----------|
| LAM-01 | 04-03 | 함수 목록에 런타임, 핸들러, 최종 수정 시간이 표시된다 | SATISFIED (code) — NEEDS HUMAN (UAT steps 1–8) | `FunctionListPage` + `FunctionTable` + `columns.ts` render Runtime/Handler/LastModified columns. Backed by `useFunctions()`. |
| LAM-02 | 04-05 | JSON 페이로드로 함수를 테스트 실행하고 응답/로그를 확인할 수 있다 | SATISFIED (code) — NEEDS HUMAN (UAT steps 14–23) | `PayloadEditor` + `InvokePanel` + `InvokeResult` + `invokeClient` full stack. Pitfalls 1 (UTF-8 decode) & 2 (function-error header) guarded at client layer with tests. |
| LAM-03 | 04-04 | 함수 상세 페이지에서 설정, 환경변수, 트리거 정보를 볼 수 있다 | SATISFIED (code) — NEEDS HUMAN (UAT steps 9–13) | 4-tab `FunctionDetailPage` + `ConfigurationPanel` / `EnvironmentPanel` / `TriggersPanel`. |

No orphaned requirements: REQUIREMENTS.md lists LAM-01/02/03 for this phase; all three are covered by plans 04-03, 04-04, 04-05.

### Anti-Patterns Found

| File | Line | Pattern | Severity | Impact |
|------|------|---------|----------|--------|
| — | — | None found | — | All files substantive, no stubs, no TODOs, no empty handlers. `test.todo` count = 0 across entire `web/src/services/lambda/` tree. |

### Human Verification Required

The automated verification can only confirm code structure, wiring, and jsdom-level behavior. The following MUST be validated by the user against a live MiniStack at `localhost:4566` before Phase 4 closes:

#### 1. 04-05-SUMMARY.md 30-step UAT checklist

**Test:** Execute all 30 numbered steps in `04-05-SUMMARY.md "Human UAT Pending"` section in order.
**Expected:** User responds `approved` only once every step passes.
**Why human:** Requires:
- Live Docker runtime cold start (10s+ on first invoke — no way to exercise in jsdom)
- Real clipboard paste verification (navigator.clipboard behavior differs in test env)
- CLI-driven setup (env vars, function URL, boom-e2e error function)
- Pitfall 1 UTF-8 log rendering of the Korean string `안녕 from Lambda` in a real browser (jsdom tests assert the code path but cannot confirm final glyph rendering)
- Pitfall 2 red Alert + ABOVE-Response DOM order on real function error path
- D-09 real-time 3-second spinner copy swap against an actual in-flight invocation
- Tab switching payload persistence (Pitfall 10) in real browser
- Keyboard focus ring visibility (accessibility step 29)
- Backend-down/retry error-boundary flow (step 28)

### Gaps Summary

**No code-level gaps.** All 3 ROADMAP success criteria, all 3 LAM requirements, all 10 locked decisions (D-01 … D-10), and all phase-contract forbidden-term greps PASS at the automated layer. Registry Safety (no new npm deps since Phase 1) is intact. 112/112 Lambda tests and 0 tsc errors.

The sole remaining item is the **human UAT gate** — Task 3 of Plan 04-05. Phase 4 is code-complete but not formally closed until the user runs the 30-step checklist against a live backend and responds `approved`.

---

_Verified: 2026-04-17T23:44:21Z_
_Verifier: Claude (gsd-verifier)_
