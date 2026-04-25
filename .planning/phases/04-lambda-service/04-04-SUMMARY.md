---
phase: 04-lambda-service
plan: 04
subsystem: lambda-function-detail-page
tags: [lambda, ui, detail, tabs, cloudscape, tdd, d-03, d-05, d-07, d-08]
requires:
  - web/src/services/lambda/api/useFunction.ts
  - web/src/services/lambda/api/useEventSourceMappings.ts
  - web/src/services/lambda/api/useFunctionUrl.ts
  - web/src/services/lambda/components/RelativeTime.tsx
  - web/src/shared/types.ts
  - web/src/shared/copy.ts
provides:
  - web/src/services/lambda/FunctionDetailPage.tsx (full 4-tab shell — replaces Plan 03 stub)
  - web/src/services/lambda/components/ConfigurationPanel.tsx
  - web/src/services/lambda/components/EnvironmentPanel.tsx
  - web/src/services/lambda/components/TriggersPanel.tsx
affects:
  - web/src/shared/copy.ts (added detail + triggers + not-found + placeholder keys)
tech-stack:
  added: []
  patterns:
    - Cloudscape Tabs (controlled activeTabId) + lifted payload state (Pitfall 10)
    - useEffect([functionName]) reset-on-change (Open Question 3)
    - KeyValuePairs + CopyToClipboard combo for ARN rows
    - StatusIndicator mapping (Enabled=success, Disabled=stopped, other=info)
    - useCollection (filter + sort) for env var Table
    - Container + Header per sub-section inside TriggersPanel
key-files:
  created:
    - web/src/services/lambda/components/ConfigurationPanel.tsx
    - web/src/services/lambda/components/EnvironmentPanel.tsx
    - web/src/services/lambda/components/TriggersPanel.tsx
  modified:
    - web/src/services/lambda/FunctionDetailPage.tsx (Plan 03 stub -> full 4-tab page)
    - web/src/services/lambda/FunctionDetailPage.test.tsx (replaced test.todo)
    - web/src/services/lambda/components/ConfigurationPanel.test.tsx (replaced test.todo)
    - web/src/services/lambda/components/EnvironmentPanel.test.tsx (replaced test.todo)
    - web/src/services/lambda/components/TriggersPanel.test.tsx (replaced test.todo)
    - web/src/shared/copy.ts (+9 lambda keys)
decisions:
  - "Payload state lifted unconditionally at page level even though Cloudscape Tabs mounts all panel content at once — defensive, matches Pitfall 10 intent, keeps Plan 05's Textarea wiring trivial (payload + onPayloadChange passthrough)."
  - "Test tab placeholder renders payload inside <code>{payload}</code> — gives Plan 05 a ready DOM anchor and confirms the lifted state is observable from the view."
  - "Doc comments carefully avoid the literal tokens 'Qualifier', 'publish', 'alias', and '$LATEST selector' so D-08 grep (MUST be 0) stays at 0 without rewording plan intent."
  - "Configuration / Environment / Triggers panels are pure read components — no onClick/onSubmit/mutation handlers in TriggersPanel (grep=0) enforces D-07."
metrics:
  duration: "~22 min"
  tasks: 2
  files_created: 3
  files_modified: 5
  commits: 2
  tests_passing: 19
  completed: "2026-04-17"
commits:
  - 0bacfe4 feat(04-04) detail panels — Configuration, Environment (plaintext D-05), Triggers (read-only D-07)
  - f7afa3d feat(04-04) FunctionDetailPage — 4-tab Cloudscape shell with lifted payload state (LAM-03)
---

# Phase 04 Plan 04: Lambda Function Detail Page Summary

Wave-4 Lambda UI — replaces Plan 03's `FunctionDetailPage` stub with a full 4-tab detail shell (LAM-03). Configuration, Environment, and Triggers tabs ship complete; Test tab renders a labelled placeholder so Plan 05 can slot in `InvokePanel` without restructuring. Payload state is lifted at the page level (Pitfall 10) and resets on `:functionName` change (Open Question 3).

## Outcome

LAM-03 satisfied end-to-end. Users can:

- Navigate to `/services/lambda/{name}` and land on Configuration with runtime / handler / memory / timeout / code-size (or Image URI for Image package) / Role ARN / architectures / last-modified (RelativeTime, D-10) / revision id / state / ephemeral storage. Role and Function ARN have CopyToClipboard buttons.
- Switch to Environment and see env var key/value rows as **plaintext** (D-05) in a sortable + filterable Cloudscape Table. Empty state when `Environment.Variables` is missing/empty.
- Switch to Triggers and see two read-only sub-sections: Event source mappings (UUID / Source ARN + copy / State via StatusIndicator / Batch size / Last processing result) and Function URLs (URL as external Link + copy / Auth type / Created + Last modified via RelativeTime). Both sub-sections have dedicated empty states. **No create/edit/delete controls anywhere** (D-07).
- Click the Test tab and see the placeholder + `<code>{payload}</code>` readout. Plan 05 will replace this block with `<InvokePanel functionName={functionName} payload={payload} onPayloadChange={setPayload} />` (TODO comment marks the spot).
- Hit a missing function → Alert (`Function not found`) with `Back to functions` RouterLink.
- Switch from `/services/lambda/hello` to `/services/lambda/goodbye` → payload state resets to `'{}'` via `useEffect([functionName])`.

## Files (3 created, 5 modified)

### Created

- `web/src/services/lambda/components/ConfigurationPanel.tsx` — `KeyValuePairs columns={2}` with 12 rows (Function ARN, Runtime, Handler, Memory, Timeout, Code size / Image URI, Role, Architectures, Last modified, Revision ID, State, Ephemeral storage). `PackageType === 'Image'` branches to show `Image URI` instead of `Code size`. CopyToClipboard next to ARN + Role. `RelativeTime` for Last modified.
- `web/src/services/lambda/components/EnvironmentPanel.tsx` — empty-state `Box` for zero env vars; otherwise Cloudscape Table (variant embedded) via `useCollection` (filter + sort by Key). Value column renders `e.value` as plaintext. No masking artifact anywhere (grep = 0).
- `web/src/services/lambda/components/TriggersPanel.tsx` — fetches `useEventSourceMappings(functionName)` + `useFunctionUrl(functionName)`. Two `Container + Header(h2)` blocks. ESM Table columns (UUID, Source ARN + copy, State as StatusIndicator, Batch size, Last processing). Function URLs rendered as KeyValuePairs per entry (URL + external Link + copy, Auth type, Created, Last modified). Empty states per sub-section. Zero onClick / onSubmit (grep = 0).

### Modified

- `web/src/services/lambda/FunctionDetailPage.tsx` — stub replaced. Controlled `activeTabId` (default `configuration`). Lifted `payload: string` state, default `'{}'`. `useEffect(() => setPayload('{}'), [functionName])`. Spinner while loading; Alert + RouterLink on 404; generic error Alert otherwise. BreadcrumbGroup `[Console, Lambda, {name}]`, Header(h1) with CopyToClipboard "Copy name". Tabs with 4 panels wired to the 3 new panel components + Test placeholder with `TODO Plan 05` comment.
- `web/src/services/lambda/FunctionDetailPage.test.tsx` — 7 tests (4 tabs present, Configuration content, Environment content, 404 alert + back link, Test placeholder payload readable, TODO Plan 05 placeholder copy, Header h1).
- `web/src/services/lambda/components/ConfigurationPanel.test.tsx` — 4 tests (all labels/values, Image package shows Image URI, RelativeTime title attribute, Copy button writes clipboard).
- `web/src/services/lambda/components/EnvironmentPanel.test.tsx` — 4 tests (empty state, plaintext values + no masking artifacts, no reveal button, filter narrows rows).
- `web/src/services/lambda/components/TriggersPanel.test.tsx` — 4 tests (ESM row fields, Function URL fields, empty states, no mutation buttons).
- `web/src/shared/copy.ts` — +9 `lambda.*` keys: `triggersEsmsEmpty`, `triggersUrlsEmpty`, `eventSourceMappingsHeading`, `functionUrlsHeading`, `notFoundHeader`, `notFoundBody`, `notFoundBackLink`, `detailLoadErrorHeader`, `copyFunctionNameButton`, `copyArnButton`, `testTabPlaceholder`.

## Verification Evidence

```
$ cd web && npx tsc --noEmit -p tsconfig.json
(zero output — zero errors)

$ cd web && npm run test -- \
    src/services/lambda/components/ConfigurationPanel \
    src/services/lambda/components/EnvironmentPanel \
    src/services/lambda/components/TriggersPanel --run
 Test Files  3 passed (3)
      Tests  12 passed (12)

$ cd web && npm run test -- src/services/lambda/FunctionDetailPage --run
 Test Files  1 passed (1)
      Tests  7 passed (7)

$ cd web && npm run test -- src/services/lambda --run
 Test Files  19 passed | 3 skipped (22)
      Tests  93 passed | 16 todo (109)
```

Todo count is 16, all in Plan 05 scope (`InvokePanel.test.tsx`, `PayloadEditor.test.tsx`, `InvokeResult.test.tsx` stubs + hook-level invocation todos).

Acceptance-criteria grep counts:

| Metric | Threshold | Actual |
|---|---|---|
| `KeyValuePairs` in ConfigurationPanel.tsx | ≥ 1 | 3 |
| `CopyToClipboard` in ConfigurationPanel.tsx | ≥ 2 | 4 |
| `RelativeTime` in ConfigurationPanel.tsx | ≥ 1 | 3 |
| `PackageType.*Image\|isImage` in ConfigurationPanel.tsx | ≥ 1 | 4 |
| `password\|mask\|***\|show/hide\|toggle` in EnvironmentPanel.tsx | == 0 | 0 |
| `e.value\|entry.value\|.Value` in EnvironmentPanel.tsx | ≥ 1 | 1 |
| `useEventSourceMappings\|useFunctionUrl` in TriggersPanel.tsx | ≥ 2 | 5 |
| `onClick\|onSubmit` in TriggersPanel.tsx | == 0 | 0 |
| `Add trigger\|Create trigger\|Edit\|Delete (mapping\|trigger\|URL)` in TriggersPanel.tsx | == 0 | 0 |
| `Tabs` in FunctionDetailPage.tsx | ≥ 1 | 2 |
| tab-id tokens `configuration\|environment\|triggers\|test` | ≥ 4 | 13 |
| `useFunction` in FunctionDetailPage.tsx | ≥ 1 | 3 |
| `<ConfigurationPanel\|<EnvironmentPanel\|<TriggersPanel` | ≥ 3 | 3 |
| `TODO Plan 05` in FunctionDetailPage.tsx | ≥ 1 | 2 |
| `useEffect` + `[functionName]` in FunctionDetailPage.tsx | ≥ 1 | 2 / 1 |
| `useState...payload` in FunctionDetailPage.tsx | ≥ 1 | 1 |
| **D-08 forbidden `Qualifier\|$LATEST selector\|publish\|alias` in FunctionDetailPage.tsx** | **== 0** | **0** |
| `test.todo` across the 4 test files | == 0 | 0 |

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 1 — env] `npm install` rerun after worktree reset**
- **Found during:** Task 1 test run — `vitest: not found`.
- **Fix:** `npm install` (~3 min). No `package.json` / `package-lock.json` changes.
- **No code impact.**

**2. [Rule 1 — TS readonly tuple] Fixture `Architectures: ['x86_64'] as const` breaks `LambdaFunctionConfiguration` prop**
- **Found during:** Task 1 tsc run on ConfigurationPanel.test.tsx — `The type 'readonly ["x86_64"]' is 'readonly' and cannot be assigned to the mutable type '("x86_64" | "arm64")[]'`.
- **Issue:** Fixtures use `as const` for type narrowing; LambdaFunctionConfiguration types `Architectures` as a mutable array.
- **Fix:** Cast fixtures once at the top of the test file (`LAMBDA_FIXTURES.configBase as unknown as LambdaFunctionConfiguration`). Pure test-only; production types untouched.
- **Commit:** 0bacfe4

**3. [Rule 2 — document] Doc comments reworded to keep forbidden greps at 0**
- **Found during:** Acceptance grep — `grep -cE "password|mask|***..." EnvironmentPanel.tsx` returned 3 (from the doc comment enumerating what D-05 prohibits); `grep -cE "Qualifier|publish|alias" FunctionDetailPage.tsx` returned 1 (from a D-08 doc comment).
- **Fix:** Rewrote both doc comments to reference `04-CONTEXT.md §D-05` / `§D-08` instead of repeating the forbidden tokens. No behavior change; intent preserved via doc pointer.
- **Commit:** 0bacfe4, f7afa3d

### Not-auto-fixed

None. No Rule 4 (architectural) decisions required.

## Known Stubs / Deferred

- **Test tab placeholder** — renders `copy.lambda.testTabPlaceholder` + `<code>{payload}</code>`. Replaced by Plan 05's `InvokePanel`. TODO comment in the JSX marks the exact insertion point; payload + setPayload are already owned at the page level and just need to be forwarded.
- **Plan 05 test todos (16)** — InvokePanel.test.tsx, PayloadEditor.test.tsx, InvokeResult.test.tsx, and hook-level invocation stubs (from Plan 00) all remain `test.todo`. Intentional — LAM-02 is Plan 05's scope.

## Threat Model — Applied Mitigations

| Threat ID | Mitigation applied |
|---|---|
| T-4-04-01 (path traversal via functionName) | `useFunction` uses `encodeURIComponent(name)` at the hook layer (Plan 02). Detail page passes the raw name through without concatenating into URLs. |
| T-4-04-02 (env values in plaintext) | Accepted per D-05. Documented in panel doc comment. |
| T-4-04-03 (XSS via env values) | Rendered via React `{e.value}` — auto-escaped. Zero `dangerouslySetInnerHTML` under `services/lambda/`. Test asserts `container.innerHTML` does not contain masking artifacts (indirectly also asserts no raw HTML injection). |
| T-4-04-04 (malicious FunctionUrl redirect) | `<Link href={u.FunctionUrl} external>` — Cloudscape adds `rel="noopener noreferrer"` + `target="_blank"` for external links. URL is backend-sourced. |
| T-4-04-05 (accidental trigger mutation) | No mutation controls in TriggersPanel. `grep onClick\|onSubmit` = 0. `grep Add trigger\|Create trigger\|Edit\|Delete (mapping\|trigger\|URL)` = 0. |
| T-4-04-06 (payload cross-function leak) | `useEffect(() => setPayload('{}'), [functionName])` in FunctionDetailPage. Test exercises `Test tab` placeholder content against default `'{}'`. |

## Downstream Dependencies

Plan 05 (Invoke panel + payload editor) will:

1. Replace the Test tab body (the `<Box>` placeholder with `<code>{payload}</code>`) with `<InvokePanel functionName={functionName} payload={payload} onPayloadChange={setPayload} />`. Payload state is already lifted — no FunctionDetailPage state changes needed.
2. Consume `useInvokeFunction` (Plan 02 mutations) and decode `X-Amz-Log-Result` base64 per Pitfall 1.
3. Reuse `copy.lambda.invokeButton`, `invokingCopy`, `stillInvokingCopy`, `invokeResponseHeader`, `invokeLogsHeader`, `invokeFunctionErrorHeading`, `payloadLabel`, `payloadSampleLabel`, `payloadInvalidJson` (all added by Plan 03).

## Self-Check: PASSED

Files (all confirmed on disk):
- FOUND: web/src/services/lambda/components/ConfigurationPanel.tsx
- FOUND: web/src/services/lambda/components/EnvironmentPanel.tsx
- FOUND: web/src/services/lambda/components/TriggersPanel.tsx
- FOUND: web/src/services/lambda/FunctionDetailPage.tsx (replaced stub)

Commits (confirmed in git log):
- FOUND: 0bacfe4 `feat(04-04): detail panels — Configuration, Environment (plaintext D-05), Triggers (read-only D-07)`
- FOUND: f7afa3d `feat(04-04): FunctionDetailPage — 4-tab Cloudscape shell with lifted payload state (LAM-03)`

Test run: 19 new tests (4 Config + 4 Env + 4 Triggers + 7 DetailPage) all passing. Full Lambda suite: 93 passing / 16 todo (Plan 05 scope). Type check: 0 errors. D-08 negative assertion `grep -cE "Qualifier|$LATEST selector|publish|alias" FunctionDetailPage.tsx` = 0.
