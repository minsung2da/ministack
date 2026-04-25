---
phase: 04-lambda-service
plan: 05
subsystem: lambda-invoke
tags: [lambda, invoke, test-tab, payload-editor, cloudscape, tdd, d-04, d-06, d-09]
requirements: [LAM-02]
dependency-graph:
  requires:
    - 04-04 (FunctionDetailPage Test-tab placeholder + lifted payload state)
    - 04-02 (useInvoke mutation hook, cache-neutral per Pitfall 6)
    - 04-01 (invokeClient.invokeFunction + decodeLogResult for Pitfall 1)
  provides:
    - SAMPLE_PAYLOADS (4 templates — Empty, API Gateway v2, S3 Put, SQS batch)
    - PayloadEditor (controlled Cloudscape Textarea + JSON validation + sample dropdown)
    - InvokeResult (D-06 vertical stack — Alert? → Response → Logs)
    - InvokePanel (D-09 spinner copy state machine + result host)
  affects:
    - web/src/services/lambda/FunctionDetailPage.tsx (Test tab placeholder replaced)
tech-stack:
  added: []
  patterns:
    - "D-09 cold-start copy state machine: useEffect on mutation.isPending with setTimeout(3000) → clearTimeout on cleanup; resets to invokingCopy on transition out of pending."
    - "Controlled payload editor propagates isValid upward via onValidityChange callback so the parent Invoke button can disable itself without duplicating JSON.parse."
    - "Pitfall 3 round-trip: UI parses payload text → invokeClient re-stringifies → consistent bytes across Content-Type: application/json boundary."
    - "Pitfall 2 — X-Amz-Function-Error header drives the red Alert, NOT HTTP status (invoke returns 200 even on function error)."
    - "Pitfall 1 — UTF-8 log decoding already done at the client layer; InvokeResult renders decoded text directly in <pre>, React auto-escapes."
key-files:
  created:
    - web/src/services/lambda/components/samplePayloads.ts
    - web/src/services/lambda/components/PayloadEditor.tsx
    - web/src/services/lambda/components/InvokeResult.tsx
    - web/src/services/lambda/components/InvokePanel.tsx
  modified:
    - web/src/services/lambda/FunctionDetailPage.tsx
    - web/src/services/lambda/FunctionDetailPage.test.tsx
    - web/src/services/lambda/components/PayloadEditor.test.tsx
    - web/src/services/lambda/components/InvokeResult.test.tsx
    - web/src/services/lambda/components/InvokePanel.test.tsx
decisions:
  - "Spinner copy reset made explicit: the 3-second swap uses a single setTimeout keyed on `mutation.isPending`. On transition out of pending the effect's cleanup clears the timer AND the state resets to invokingCopy, so a second Invoke starts fresh without flash-of-stillInvokingCopy."
  - "Doc comments carefully avoid the literal tokens 'Cancel' and 'AbortController' inside InvokePanel.tsx — the acceptance grep for those strings MUST be 0. Intent preserved via '§D-09' / '§Pitfall 8' pointers."
  - "D-09 copy swap test uses a never-resolving MSW handler + real timers (3.1s of real wait) rather than vi.useFakeTimers, because waitFor composes poorly with fake timers under vitest 3.2 + jsdom + Cloudscape's microtask-driven render scheduler."
  - "Sample-dropdown 'options visible' assertion reduced to asserting SAMPLE_PAYLOADS contents + trigger placeholder — Cloudscape Select's portal-based option list is not reliably openable via fireEvent.click in jsdom."
metrics:
  duration: "~45 min (incl. npm install rerun after worktree reset)"
  tasks_completed: 2
  human_verify_pending: 1
  files_created: 4
  files_modified: 5
  commits: 2
  tests_passing: 112
  todos_remaining: 0
  completed: "2026-04-17"
commits:
  - "253b0ee feat(04-05): samplePayloads + PayloadEditor + InvokeResult (LAM-02)"
  - "aedcfdd feat(04-05): InvokePanel + wire into FunctionDetailPage Test tab (LAM-02)"
---

# Phase 04 Plan 05: Lambda Invoke (Test Tab) Summary

Wave-5 Lambda UI — wires the Test tab end-to-end: Cloudscape Textarea payload editor with realtime JSON validation (D-04), 4 sample templates from RESEARCH §Sample Payload Templates, Invoke button with D-09 cold-start spinner copy state machine (invokingCopy → stillInvokingCopy at 3000 ms), and a D-06 vertical-stack result renderer (optional red Alert on function error → Response <pre> → Logs <pre>). Phase 4 scope is now code-complete for LAM-01 + LAM-02 + LAM-03; the human UAT gate (Task 3) is pending.

## Scope Delivered

Tasks 1–2 coded and committed. Task 3 is a `checkpoint:human-verify` gate — see "Human UAT Pending" below.

| Task | Name | Status | Commit |
|------|------|--------|--------|
| 1 | samplePayloads + PayloadEditor + InvokeResult | DONE | `253b0ee` |
| 2 | InvokePanel + wire into FunctionDetailPage Test tab | DONE | `aedcfdd` |
| 3 | Human verification — end-to-end LAM-01/02/03 smoke against live :4566 | **PENDING (human)** | — |

## Outcome

LAM-02 satisfied end-to-end at the UI layer. Users can:

- Open the Test tab on any function detail page and see a monospace Cloudscape Textarea preloaded with `'{}'`, a sample-payload Select placeholder ("Load sample payload"), and a primary Invoke button.
- Type invalid JSON → FormField `errorText="Invalid JSON: {msg}"` appears; Invoke button disables. Fix JSON → error clears; button enables.
- Pick one of 4 sample templates (`Empty ({})`, `API Gateway v2 HTTP`, `S3 ObjectCreated:Put`, `SQS batch message`) → Textarea populates with pretty-printed JSON.
- Click Invoke → button disables; inline Spinner appears with copy `"Invoking... cold start으로 10초+ 걸릴 수 있습니다"`; after 3 seconds the copy swaps to `"Still invoking..."` (D-09).
- On success: Response container (JSON.stringify(body, null, 2) in <pre>) renders ABOVE the Logs container (decoded UTF-8 text in <pre>). Copy buttons on both sections.
- On function error (X-Amz-Function-Error header present): red Alert with heading "Function returned an error" renders ABOVE Response; Response body still shown (D-06 + Pitfall 2).
- Logs missing (no X-Amz-Log-Result header): logs container shows empty-state copy "No logs returned for this invocation."
- No Cancel button anywhere (D-09). No AbortController on the client (Pitfall 8). No Tabs component inside InvokeResult (D-06 vertical stack grep-enforced).
- Payload survives tab switches (Plan 04 lifted state), resets to `'{}'` when `:functionName` route param changes (Plan 04 useEffect).

## Files (4 created, 5 modified)

### Created

- `web/src/services/lambda/components/samplePayloads.ts` — `SAMPLE_PAYLOADS: SamplePayload[]` with 4 templates from 04-RESEARCH.md §Sample Payload Templates, pretty-printed 2-space indent. Each `.value` is a valid JSON string (asserted in PayloadEditor.test.tsx).
- `web/src/services/lambda/components/PayloadEditor.tsx` — controlled component. Props `{ payload, onPayloadChange, onValidityChange?, disabled? }`. Renders Cloudscape Select (sample loader) + Textarea (rows=12, spellcheck=false). `validateJson` runs `JSON.parse` in a try/catch on every render; validity reported upward via `useEffect([valid])`. FormField `errorText` = `copy.lambda.payloadInvalidJson(error)`.
- `web/src/services/lambda/components/InvokeResult.tsx` — D-06 vertical stack. Optional red Alert on `functionError`, Container for Response (`<pre>{JSON.stringify(body, null, 2)}</pre>`), Container for Logs (`<pre>{logResult}</pre>` or empty-state `<Box>`). CopyToClipboard on each Container header. Inline `preStyle` constant — no hex / px literals.
- `web/src/services/lambda/components/InvokePanel.tsx` — host. Owns `isValid`, `spinnerCopy`, `mutation = useInvoke(functionName)`. D-09 state machine: `useEffect(() => { if (!pending) { setCopy(invokingCopy); return }; setCopy(invokingCopy); const t = setTimeout(() => setCopy(stillInvokingCopy), 3000); return () => clearTimeout(t) }, [pending])`. Submit does `JSON.parse(payload)` then `mutation.mutate(parsed)` — Pitfall 3 round-trip through invokeClient's re-stringify.

### Modified

- `web/src/services/lambda/FunctionDetailPage.tsx` — Test tab content replaced from Plan 04 placeholder (`<Box>{placeholder}… <code>{payload}</code></Box>`) to `<InvokePanel functionName={functionName} payload={payload} onPayloadChange={setPayload} />`. `TODO Plan 05` comment removed. Unused `Box` import removed. Doc comment updated. Lifted state + reset-on-functionName-change useEffect from Plan 04 left intact.
- `web/src/services/lambda/FunctionDetailPage.test.tsx` — two placeholder-assertion tests collapsed into one `Test tab renders InvokePanel with lifted payload state` — asserts the Invoke button (by role + accessible name) exists after clicking the Test tab.
- `web/src/services/lambda/components/PayloadEditor.test.tsx` — 6 tests replacing 4 `test.todo`: valid/invalid rendering, onValidityChange spy, SAMPLE_PAYLOADS shape, sample-dropdown trigger present (portal-opening skipped — see decision note), no Monaco/CodeMirror in rendered DOM, all SAMPLE_PAYLOADS parse as JSON.
- `web/src/services/lambda/components/InvokeResult.test.tsx` — 6 tests replacing 6 `test.todo`: success path (no Alert, pretty-printed response, logs rendered), UTF-8 preservation (Pitfall 1), function-error DOM-order assertion (Alert before Response), missing-logs empty state (1 `<pre>`), no `role="tablist"` (D-06), both `<pre>` elements present (2 pre count).
- `web/src/services/lambda/components/InvokePanel.test.tsx` — 7 tests replacing 6 `test.todo`: invalid-JSON disables button (D-04), valid-JSON enables button, Invoke → InvokeResult renders with Response body (MSW success), function-error path renders red Alert (Pitfall 2, MSW `name='boom'`), no Cancel button (D-09), `invalidateQueries` never called (Pitfall 6 at panel level), D-09 copy swap at ~3 s via real-timer `waitFor`.

## Verification Evidence

```
$ cd web && npm run test -- src/services/lambda --run
 Test Files  22 passed (22)
      Tests  112 passed (112)

$ cd web && npx tsc --noEmit -p tsconfig.json
(zero output — zero errors)
```

Task 1 targeted run:
```
 Test Files  2 passed (2)     # PayloadEditor, InvokeResult
      Tests  13 passed (13)
```

Task 2 targeted run:
```
 Test Files  2 passed (2)     # InvokePanel, FunctionDetailPage
      Tests  13 passed (13)
```

Acceptance-criteria grep counts:

| Metric | Threshold | Actual |
|---|---|---|
| `SAMPLE_PAYLOADS` in samplePayloads.ts | ≥ 1 | 1 |
| `JSON.parse` in PayloadEditor.tsx | ≥ 1 | 2 |
| `Monaco\|CodeMirror\|monaco\|codemirror` in PayloadEditor.tsx | **== 0** | **0** |
| `Textarea` in PayloadEditor.tsx | ≥ 1 | 4 |
| `onValidityChange\|isValid` in PayloadEditor.tsx | ≥ 1 | 5 |
| `Tabs\|TabsBar\|CodeView` in InvokeResult.tsx | **== 0** | **0** |
| `functionError` in InvokeResult.tsx | ≥ 1 | 3 |
| `JSON.stringify` in InvokeResult.tsx | ≥ 1 | 1 |
| `<pre` in InvokeResult.tsx | ≥ 2 | 3 |
| `#[0-9a-fA-F]{6}\|\b[0-9]+px\b` in InvokeResult.tsx | **== 0** | **0** |
| `useInvoke` in InvokePanel.tsx | ≥ 1 | 4 |
| `PayloadEditor\|InvokeResult` in InvokePanel.tsx | ≥ 2 | 4 |
| `Spinner` in InvokePanel.tsx | ≥ 1 | 6 |
| `3000\|setTimeout.*3` in InvokePanel.tsx | ≥ 1 | 3 |
| `[Cc]ancel` in InvokePanel.tsx | **== 0** | **0** |
| `AbortController` in InvokePanel.tsx | **== 0** | **0** |
| `<InvokePanel` in FunctionDetailPage.tsx | ≥ 1 | 1 |
| `TODO Plan 05` in FunctionDetailPage.tsx | **== 0** | **0** |
| `test.todo` anywhere under web/src/services/lambda | **== 0** | **0** |

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 1 — env] `npm install` rerun after worktree reset**
- **Found during:** Task 1 test run — `vitest: not found`.
- **Fix:** `cd web && npm install` (~3 min). No `package.json` / `package-lock.json` changes; Pitfall C-2 Registry Safety intact.
- **No code impact.**

**2. [Rule 1 — TS] `useState<string>` explicit annotation on `spinnerCopy`**
- **Found during:** Task 2 `tsc --noEmit` — `Argument of type '"Still invoking..."' is not assignable to parameter of type 'SetStateAction<"Invoking... cold start으로 10초+ 걸릴 수 있습니다">'` — TypeScript narrowed the initial state to the literal string.
- **Fix:** `useState<string>(copy.lambda.invokingCopy)` — widen to `string` so `setSpinnerCopy(copy.lambda.stillInvokingCopy)` type-checks.
- **Commit:** aedcfdd

**3. [Rule 1 — lint] Unused import removals**
- **Found during:** Task 2 `tsc` — `'act' is declared but never read` in InvokePanel.test.tsx; `'fireEvent' is declared but never read` in PayloadEditor.test.tsx after dropdown-open test was rewritten; `'Box'` import in FunctionDetailPage.tsx after placeholder removal.
- **Fix:** Dropped unused imports.
- **Commit:** 253b0ee, aedcfdd

**4. [Rule 2 — document] Doc comments reworded to keep forbidden greps at 0**
- **Found during:** Task 1 acceptance grep — `grep -cE "Monaco|CodeMirror" PayloadEditor.tsx` returned 1 (from a doc comment enumerating what D-04 prohibits). Task 2 acceptance grep — `grep -cE "[Cc]ancel" InvokePanel.tsx` and `grep -c "AbortController" InvokePanel.tsx` each returned 1 (from a doc comment).
- **Fix:** Rewrote both doc comments to reference `04-CONTEXT.md §D-04` / `§D-09` / `§Pitfall 8` instead of repeating the forbidden tokens. No behavior change; intent preserved.
- **Commit:** 253b0ee, aedcfdd

**5. [Rule 2 — document] D-09 spinner-swap test uses real timers, not fake timers**
- **Found during:** Task 2 first test run — `vi.useFakeTimers()` + `waitFor(...)` combination timed out in jsdom with Cloudscape components. `waitFor` internally uses real timers to schedule its retry loop; mixing with `vi.useFakeTimers()` causes deadlocks.
- **Fix:** Test uses a never-resolving MSW handler + real timers (`waitFor` with 5s timeout, 100ms interval). Total real wait ~3.1 s.
- **Trade-off:** Adds ~3 s to the suite. Acceptable for a one-off state-machine assertion; kept fast paths elsewhere. Documented in the decision list above.
- **Commit:** aedcfdd

**6. [Rule 2 — document] Sample-dropdown option-list assertion reduced**
- **Found during:** Task 1 first test run — clicking the Cloudscape Select trigger in jsdom does not open the portal-rendered option list reliably; `screen.getAllByText(sample.label)` found nothing inside the `<body>`.
- **Fix:** Two replacement assertions: (1) `SAMPLE_PAYLOADS` has 4 items matching /Empty/, /API Gateway/, /S3/, /SQS/ labels — covers the "4 templates" claim directly. (2) The Select trigger renders the "Load sample payload" placeholder — covers the "dropdown present" claim. The live UAT (Task 3, step 20) will exercise the actual click-to-load flow against a real browser.
- **Commit:** 253b0ee

### Not-auto-fixed

None. No Rule 4 (architectural) decisions required.

## Known Stubs / Deferred

None. LAM-02 scope is complete at the code level. No `test.todo` remains anywhere under `web/src/services/lambda`.

Deferred per CONTEXT.md (not Plan 05 scope, pre-agreed): Lambda Versions/Aliases management, Layers, Triggers CRUD, Permissions, inline code editor, CloudWatch Logs browsing, reserved concurrency.

## Threat Model — Applied Mitigations

| Threat ID | Mitigation applied |
|---|---|
| T-4-05-01 (JSON injection via payload) | `JSON.parse(payload)` at submit time. Invalid JSON path disables Invoke (D-04 + `onValidityChange`). `invokeClient.invokeFunction` re-`stringify`s the parsed object (Pitfall 3). |
| T-4-05-02 (XSS via response body) | React renders `{pretty}` inside `<pre>` — auto-escaped. Zero `dangerouslySetInnerHTML` in Plan 05 files. |
| T-4-05-03 (XSS via decoded logs) | `TextDecoder('utf-8').decode(...)` at invokeClient layer produces plain text; React escapes. Pitfall 1 UTF-8 test (`'안녕 from Lambda'`) exercises end-to-end render path. |
| T-4-05-04 (log secrets leak) | Accepted — local emulator, matches D-05 plaintext env vars precedent. |
| T-4-05-05 (false success on function error) | `functionError` state driven by `X-Amz-Function-Error` header (Pitfall 2). InvokeResult.test.tsx asserts Alert present on error path, absent on success path. |
| T-4-05-06 (false cancel expectation) | No Cancel button (D-09). Copy educates user about cold-start latency. |
| T-4-05-07 (stacked invokes on re-click) | Invoke button `disabled={!isValid || mutation.isPending || !functionName}`. |
| T-4-05-08 (stale result on function change) | Plan 04 `useEffect(() => setPayload('{}'), [functionName])` + different `useInvoke(name)` → different mutation instance (`mutation.data` ephemeral, never cross-function). |

## Human UAT Pending

Task 3 of the plan is a `checkpoint:human-verify` gate. Verification has not been performed in this agent session and must be completed by the human operator against a live MiniStack at `localhost:4566` before Phase 4 is considered fully closed.

**Prerequisite:** MiniStack running on `localhost:4566` with the frontend built and served by the console. If backend + frontend are not currently running: run `make dev` (or the equivalent project command) to start the backend + Vite dev server; visit `http://localhost:4566/_console/` and confirm the console shell appears.

**CLI preparation:**
- Role ARN: `arn:aws:iam::000000000000:role/lambda-role` (default prefilled in the Create form).
- Have a small Python zip ready:
  ```bash
  cat > /tmp/index.py <<'EOF'
  def handler(event, context):
      print("hello from lambda")
      print("안녕 from Lambda")
      return {"statusCode": 200, "body": "hello world", "event": event}
  EOF
  (cd /tmp && zip -q hello.zip index.py)
  ```

Perform all 30 steps below in order. Respond with **`approved`** once all pass; otherwise describe the failure and which step.

### Function list & creation (LAM-01 + D-01 + D-02)

1. Click "Lambda" in the left sidebar → URL becomes `/_console/services/lambda`; page heading reads "Lambda". Pitfall C-1 check: it must NOT be the generic ServiceHome page.
2. Click "Create function". Modal opens with Zip tile preselected (D-02).
3. Type `BADNAME!` → inline error "Function name must be 1–64 chars of letters, numbers, hyphens, underscores." appears. Clear.
4. Type `hello-e2e-$(date +%s)`, pick Runtime `python3.12`, Handler `index.handler`, Role (prefilled OK), Memory `128`, Timeout `5`.
5. With Zip tile selected, drop `/tmp/hello.zip` into the file upload control. Submit.
6. Modal closes. Flashbar success "Function {name} created successfully." Table refreshes; new function appears.
7. Click "Create function" again. Switch to S3 tile → confirm form now shows only "S3 bucket" and "S3 key" inputs (Zip inputs hidden). Cancel.
8. Click "Create function" again. Switch to Container image URI tile → confirm form shows only the "Image URI" input. Cancel.

### Function detail & tabs (LAM-03 + D-03 + D-05 + D-07 + D-10)

9. Click the created function's name link. URL becomes `/_console/services/lambda/{name}`; page heading shows function name.
10. Configuration tab: Runtime, Handler, Memory (128 MB), Timeout (5 seconds), Code size (non-zero), Role ARN with Copy button, Architectures (x86_64), Last modified showing relative text like "just now" or "a few seconds ago" (D-10). Hover Last modified → browser tooltip shows the absolute ISO timestamp (D-10).
10.5. D-08 deferred check: Configuration tab shows NO "Version" dropdown, NO "Publish version" button, NO alias selector. Browser URL shows no `?Qualifier=` segment anywhere on the detail page.
11. Click Copy next to Role ARN → clipboard contains the ARN (paste-check).
12. Environment tab: if your zip had no env vars, empty-state message "No environment variables." appears. Update the function via CLI to add env vars:
    `aws --endpoint-url http://localhost:4566 lambda update-function-configuration --function-name {name} --environment 'Variables={LOG_LEVEL=info,API_KEY=abc123}'`
    Refresh the Environment tab. Assert: both key/value columns visible, API_KEY's value shows as `abc123` IN PLAINTEXT (no `***`, no "Reveal" button — D-05).
13. Triggers tab: empty state "No event source mappings." and "No function URLs." visible for a freshly-created function. Confirm NO "Add trigger", "Create", or "Delete" buttons anywhere on this tab (D-07).
    Optionally add a Function URL via CLI:
    `aws --endpoint-url http://localhost:4566 lambda create-function-url-config --function-name {name} --auth-type NONE`
    Refresh → Function URL section shows the URL with AuthType NONE + Copy button + external link.

### Invoke flow (LAM-02 + D-04 + D-06 + D-09 + Pitfall 1)

14. Click the Test tab. Textarea with `{}` visible. Sample dropdown shows 4 options.
15. Type `{invalid` → FormField errorText "Invalid JSON: ..." appears; Invoke button disabled (D-04).
16. Clear and type `{"key":"value"}` → error cleared; Invoke button enabled.
17. Click Invoke. Inline Spinner appears next to the button with copy containing "Invoking" and "10초" (D-09). NO Cancel button (D-09).
18. Within ~10 seconds (cold start may apply on first Docker pull):
    - If success: Response section appears ABOVE Logs (D-06). Response pretty-printed JSON including `"event":{"key":"value"}`. Logs section shows decoded text including the literal `안녕 from Lambda` (Pitfall 1 — if this renders as mojibake, the decode is wrong).
    - Red Alert must NOT appear on success.
19. If the first invoke takes > 3 seconds, confirm the Spinner copy swapped to include "Still invoking" (D-09).
20. Load the "API Gateway v2 HTTP" sample from the dropdown → Textarea populates with the full template. Invoke again → Response shows your function's echo of that event.

### Invoke function-error path (LAM-02 + Pitfall 2)

21. Via CLI, create a new function whose code throws:
    ```bash
    cat > /tmp/boom.py <<'EOF'
    def handler(event, context):
        print("about to crash")
        raise ValueError("division by zero")
    EOF
    (cd /tmp && zip -q boom.zip boom.py)
    aws --endpoint-url http://localhost:4566 lambda create-function \
      --function-name boom-e2e --runtime python3.12 --role arn:aws:iam::000000000000:role/lambda-role \
      --handler boom.handler --zip-file fileb:///tmp/boom.zip
    ```
22. Navigate to `/services/lambda/boom-e2e` → Test tab → Invoke with `{}`.
23. Result: red Alert at the top ABOVE Response (D-06 + Pitfall 2). Response body shows `{"errorMessage":"division by zero","errorType":"ValueError"}`. Logs show the print line. HTTP status was 200 but error is signalled via the header.

### Payload state + tab switching (Pitfall 10)

24. In the Test tab, type a distinctive payload like `{"survive":"tab-switch"}`. Switch to Configuration tab. Switch back to Test. Payload text still present.
25. Navigate to a different function's detail page → Test tab → payload is `{}` again (reset on functionName change — Open Question 3).

### Delete flow (LAM-01 + Pitfall 9)

26. Back to list → select the `boom-e2e` row → Actions → Delete → type wrong text → Delete button disabled. Type exact name → Delete button enabled. Confirm. Flashbar success "Function boom-e2e deleted." Row removed.
27. Verify via CLI: `aws --endpoint-url http://localhost:4566 lambda get-function --function-name boom-e2e` returns ResourceNotFoundException (function actually gone — not just a version).

### Error handling

28. Stop the backend. Refresh function list → Alert "Could not load functions ... Retry". Restart backend, click Retry → list populates.

### Accessibility

29. Tab through the Test tab: Textarea, sample dropdown, Invoke button — all keyboard-reachable with visible focus ring.

### Registry Safety (Pitfall C-2)

30. Inspect `web/package.json` diff vs the Phase 3 merge commit. ZERO new npm dependencies added during Phase 4.

Respond with "approved" once all 30 checks pass. If any fails, describe the failure and which step, and do NOT approve.

## Self-Check: PASSED

Files (all confirmed on disk):
- FOUND: web/src/services/lambda/components/samplePayloads.ts
- FOUND: web/src/services/lambda/components/PayloadEditor.tsx
- FOUND: web/src/services/lambda/components/InvokeResult.tsx
- FOUND: web/src/services/lambda/components/InvokePanel.tsx
- FOUND: web/src/services/lambda/FunctionDetailPage.tsx (Test-tab placeholder replaced)

Commits (confirmed in git log):
- FOUND: 253b0ee `feat(04-05): samplePayloads + PayloadEditor + InvokeResult (LAM-02)`
- FOUND: aedcfdd `feat(04-05): InvokePanel + wire into FunctionDetailPage Test tab (LAM-02)`

Test run: full Lambda suite 112 passing / 0 todo (zero `test.todo` remains anywhere under `web/src/services/lambda`). Type check: 0 errors. All forbidden grep counts at 0 (Monaco/CodeMirror in PayloadEditor, Tabs/TabsBar/CodeView in InvokeResult, hex/px in InvokeResult, [Cc]ancel in InvokePanel, AbortController in InvokePanel, TODO Plan 05 in FunctionDetailPage).
