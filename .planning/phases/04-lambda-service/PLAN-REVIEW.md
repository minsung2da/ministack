# Phase 4 Plan Review — Goal-Backward Verification

**Reviewed:** 2026-04-17
**Scope:** 04-00-PLAN.md … 04-05-PLAN.md + 04-CONTEXT.md + 04-RESEARCH.md
**Benchmark:** 03-05-SUMMARY.md (S3 "done" reference)
**Verdict (overall):** **PASS with two minor NEEDS_WORK items.** Plans will deliver LAM-01/02/03 end-to-end if executed in order. Two fixable gaps below; neither blocks the Wave 0 start.

---

## Check 1 — Goal Coverage (LAM-01 / LAM-02 / LAM-03)

**Verdict: PASS**

Every sub-requirement from REQUIREMENTS.md maps to at least one plan task with a grep-checkable acceptance criterion.

| Sub-requirement | Plan / Task | Grep-checkable AC |
|---|---|---|
| LAM-01 list shows runtime | 04-03 Task 2 (FunctionTable) via columns.ts | `grep -cE "Tiles\b" CreateFunctionModal.tsx`, `FUNCTION_COLUMNS` contains Runtime (line 181) |
| LAM-01 shows handler | 04-03 columns.ts line 183 | same |
| LAM-01 shows last-modified | 04-03 columns.ts line 187 + RelativeTime | `grep -c "RelativeTime" columns.ts >= 1` |
| LAM-02 JSON payload editor | 04-05 Task 1 (PayloadEditor) | `grep -c "JSON.parse" PayloadEditor.tsx >= 1`, `grep -cE "Monaco\|CodeMirror" == 0` |
| LAM-02 invoke response | 04-05 Task 1 (InvokeResult) | `grep -c "<pre" InvokeResult.tsx >= 2` (response + logs) |
| LAM-02 invoke logs | 04-05 Task 1 + Plan 01 invokeClient | `grep -c "TextDecoder" invokeClient.ts >= 1` |
| LAM-03 configuration tab | 04-04 Task 1 (ConfigurationPanel) | `grep -c "KeyValuePairs" ConfigurationPanel.tsx >= 1` |
| LAM-03 environment tab | 04-04 Task 1 (EnvironmentPanel) | D-05 grep negative assertion (`mask\|\*\*\*` == 0) |
| LAM-03 triggers tab | 04-04 Task 1 (TriggersPanel) | `grep -c "useEventSourceMappings\|useFunctionUrl" >= 2` |

All three requirements also listed in every plan's frontmatter `requirements:`.

**Strength to preserve:** Plan 00 pre-names every downstream test file and wires them to specific LAM-0N labels, making the Nyquist verify chain checkable before any production code.

---

## Check 2 — Decision Respect (D-01 … D-10)

**Verdict: NEEDS_WORK (minor — D-08 never named)**

Grep counts of each decision ID across plans:

| Decision | Appearances | Implementing plan(s) | Concrete check |
|---|---|---|---|
| D-01 Create + Delete | 3 | 04-02 (mutations), 04-03 (modals) | `grep -c "useDeleteFunction" DeleteFunctionModal.tsx >= 1` |
| D-02 three code sources | 4 | 04-01 (LambdaCodeSource), 04-02 (buildCreateBody), 04-03 (CreateFunctionModal Tiles) | `grep -cE "ZipFile\|S3Bucket\|ImageUri" functionMutations.ts >= 3` |
| D-03 4 tabs | 3 | 04-04 FunctionDetailPage line 322 | `grep -cE "configuration\|environment\|triggers\|test" FunctionDetailPage.tsx >= 4` |
| D-04 Textarea + realtime JSON | 2 | 04-05 PayloadEditor | `grep -cE "Monaco\|CodeMirror" == 0` |
| D-05 env plaintext | 4 | 04-04 EnvironmentPanel | `grep -cE "password\|mask\|\*\*\*" == 0` |
| D-06 Response over Logs | 2 | 04-05 InvokeResult | `grep -c "Tabs" InvokeResult.tsx == 0` |
| D-07 triggers read-only | 3 | 04-04 TriggersPanel | `grep -cE "onClick\|onSubmit" TriggersPanel.tsx == 0` |
| **D-08 Versions/Aliases deferred** | **0** | — (implicit) | **no explicit negative assertion** |
| D-09 cold-start spinner | 3 | 04-05 InvokePanel | `grep -cE "3000\|setTimeout.*3" >= 1`, `grep -cE "Cancel" == 0` |
| D-10 relative time + ISO tooltip | 3 | 04-03 RelativeTime + columns | `grep -c "title=" RelativeTime.tsx >= 1` |

### Issue 2a — D-08 not guarded (NEEDS_WORK)

D-08 "Versions/Aliases deferred" is never cited, and no plan has a grep-checkable negative assertion that prevents accidental inclusion. It is honored in practice (FunctionDetailPage has exactly 4 tabs, no `$LATEST` selector, no version selector), but a regression could silently slip in.

**Citations:** 04-04-PLAN.md lines 319-334 (tabs array — no version selector) enforces it implicitly; no grep check makes it explicit.

**Fix recommendation:** Add to 04-04-PLAN.md Task 2 `<acceptance_criteria>`:
```
- `grep -cE "Qualifier|Version|Alias|publish" web/src/services/lambda/FunctionDetailPage.tsx` == 0   (D-08 — Versions/Aliases deferred)
```
And to 04-05-PLAN.md Task 3 UAT, insert a step 10.5: "Confirm Configuration tab shows no Version dropdown or publish button (D-08 deferred)."

---

## Check 3 — Wave Dependency Sanity

**Verdict: PASS**

```
wave 0: plan 00 (depends_on: [])          — test scaffolding + MSW fixtures
wave 1: plan 01 (depends_on: [00])        — API primitives
wave 2: plan 02 (depends_on: [01])        — query hooks + mutations
wave 3: plan 03 (depends_on: [02])        — function list page + routes
wave 4: plan 04 (depends_on: [03])        — detail page + config/env/triggers
wave 5: plan 05 (depends_on: [04])        — Test tab (InvokePanel) + UAT
```

Every `depends_on` points to an earlier wave. No forward references, no cycles. Each plan's `<read_first>` references the upstream's SUMMARY.md consistently.

---

## Check 4 — File Overlap Hazards

**Verdict: PASS (with one inventory bug — NEEDS_WORK)**

**Same-wave overlaps:** None. Each wave has exactly one plan, so concurrent file writes are impossible.

**Cross-wave overlaps (all fine because waves are sequential):**
- `FunctionDetailPage.tsx` — Plan 03 creates stub (action line 234-245); Plan 04 replaces (plan 04 files_modified line 1); Plan 05 modifies (plan 05 files_modified line 5). All serial.
- `web/src/shared/copy.ts` — modified only by Plan 03 (copy catalog additions). Plan 04 Task 2 action (line 347) says "add `notFoundHeader` / `detailLoadErrorHeader` to copy.ts if missing from Plan 03 extensions (Rule 1 fixup if so)" — this is handled via deviation framework, acceptable.
- `web/src/app/routes.tsx` — modified only by Plan 03.
- `web/src/shared/types.ts` — modified only by Plan 01.

### Issue 4a — Plan 03 files_modified omits FunctionDetailPage.tsx (NEEDS_WORK)

**Citation:** 04-03-PLAN.md lines 7-17 `files_modified:` block lists 9 paths but OMITS `web/src/services/lambda/FunctionDetailPage.tsx`, even though Task 1 action (lines 234-245) explicitly creates this file:
```
**FunctionDetailPage.tsx** (stub — Plan 04 replaces):
```
And its `<files>` attribute on line 128 includes `web/src/services/lambda/FunctionDetailPage.tsx`.

**Fix recommendation:** Add the path to 04-03-PLAN.md `files_modified:` frontmatter:
```yaml
files_modified:
  ...existing 9 entries...
  - web/src/services/lambda/FunctionDetailPage.tsx   # stub — Plan 04 replaces
```
This is necessary for `gsd-tools`-style frontmatter audits to produce a clean diff.

---

## Check 5 — Pitfall Mitigation

**Verdict: PASS**

Grep counts (occurrences across all plans) with at-least-one test assertion tracked:

| Pitfall | Coverage count | Concrete test assertion |
|---|---|---|
| 1 (base64 + TextDecoder) | 33 | 04-00 Task 1 AC: `grep -c "X-Amz-Log-Result" msw-handlers.ts >= 1` + fixture contains `안녕`; 04-01 Task 2 AC: `grep -c "TextDecoder" invokeClient.ts >= 1`; 04-05 InvokeResult.test asserts `'안녕'` in rendered DOM |
| 2 (FunctionError header as source of truth) | 18 | 04-01 Task 2 AC: `grep -c "x-amz-function-error" invokeClient.ts >= 1`; error fixture in 04-00 has `X-Amz-Function-Error: Unhandled` with HTTP 200 |
| 3 (payload JSON round-trip) | 5 | 04-01 Task 2 action: `try { body = JSON.parse(text) } catch { /* keep as raw string */ }`; 04-05 PayloadEditor + InvokePanel parse before mutate |
| 4 (Docker vs local runtime shape) | 1 | 04-00 Task 1 action line 196: "Every locked decision… MSW fixtures speak HTTP-layer shape (not internal executor shape) per Pitfall 4". Fixtures inspected — correct shape. |
| 5 (accept=".zip" advisory) | 5 | 04-03 CreateFunctionModal action line 300: surface backend BadZipFile via Flashbar; acceptance_criteria implicitly via integration test |
| 6 (Invoke as mutation, cache-neutral) | 14 | 04-02 Task 2 AC: `grep -c "invalidateQueries" invokeMutation.ts == 0`; 04-05 InvokePanel.test spies on `queryClient.invalidateQueries` asserting zero calls |
| 7 (ESM FunctionName spelling) | 10 | 04-00 AC: `grep -cE "FunctionName" msw-handlers.ts >= 1`; 04-02 Task 1 test captures URL searchParams and asserts `FunctionName=hello` |
| 8 (no AbortController) | 7 | 04-01 Task 2 AC: `grep -c "AbortController\|signal:" == 0`; 04-05 Task 2 AC: same check on InvokePanel |
| 9 (no Qualifier on delete) | 17 | 04-01 AC: `grep -cE "lambdaDelete\(path: string\)" >= 1` (no 2nd param); 04-02 AC: `grep -cE "Qualifier" functionMutations.ts == 0`; 04-03 AC: `grep -c "Qualifier" DeleteFunctionModal.tsx == 0` |
| 10 (tab-switch textarea reset) | 15 | 04-04 AC: `grep -c "const \[payload" FunctionDetailPage.tsx >= 1` + integration test asserts payload survives tab switches and resets on functionName change |
| C-1 (route ordering) | 7 | 04-03 AC: `awk '/services\/lambda/{L=NR} /services\/:serviceKey/{S=NR} END{exit !(L && S && L<S)}'` — clever and correct |
| C-2 (Registry Safety) | 4 | 04-03 verification: `grep -rn "Monaco\|CodeMirror\|jszip\|react-json-view"` == 0; 04-05 verification same + `date-fns\|dayjs`; also see Check 6 |
| C-3 (single invalidateQueries) | 12 | 04-02 Task 2 AC + test spies on `qc.invalidateQueries` asserting exactly 1 call per mutation onSuccess |
| C-4 (renderWithProviders basename) | 0 | **Not directly asserted in any plan.** RESEARCH.md lists it (lines 405-408) but no plan adds a test. Mitigation: Phase 3 already fixed the test helper; Phase 4 passively benefits. Acceptable — the risk is a test-helper regression unrelated to Phase 4 scope. |

All 8 Phase-4-specific pitfalls explicitly called out by user prompt are guarded:
- log base64 TextDecoder ✓ (Pitfall 1 — Plan 00 fixture + Plan 01 code + Plan 05 render assertion)
- FunctionError header source of truth ✓ (Pitfall 2)
- payload reserialize ✓ (Pitfall 3 — Plan 01 invokeClient + Plan 05 InvokePanel onSubmit)
- docker runtime shape ✓ (Pitfall 4 — MSW fixtures at HTTP layer per Plan 00 action)
- Invoke as mutation not query ✓ (Pitfall 6)
- ESM FunctionName typo ✓ (Pitfall 7)
- route ordering ✓ (Pitfall C-1 — awk line-order check is the strongest assertion in any plan)
- no AbortController ✓ (Pitfall 8)

---

## Check 6 — Registry Safety (package.json unchanged)

**Verdict: PASS**

Three grep-checkable assertions across plans:
- 04-03-PLAN.md line 471: `grep -rn "Monaco\|CodeMirror\|jszip\|react-json-view" web/src/services/lambda/` returns no matches
- 04-05-PLAN.md line 478: expanded to `Monaco\|CodeMirror\|jszip\|react-json-view\|date-fns\|dayjs`
- 04-05-PLAN.md UAT step 30: "Inspect `web/package.json` diff vs the Phase 3 merge commit. ZERO new npm dependencies added during Phase 4."

**Gap (minor):** No plan has an automated acceptance criterion of the form `git diff <phase3-merge>..HEAD -- web/package.json | wc -l == 0`. The manual UAT step covers it, but an automated gate would be safer. This is acceptable because Plans 01-05 all declare `tech-stack.added: []` implicitly by never mentioning `npm install`.

**Fix recommendation (optional, not blocking):** Add to 04-05-PLAN.md Task 2 `<acceptance_criteria>`:
```
- `git diff origin/master..HEAD -- web/package.json web/package-lock.json | grep -cE '^\\+\\s*"[^"]+":\\s*"\\^?[0-9]'` == 0   (no new dependency lines)
```

---

## Check 7 — Human UAT Completeness

**Verdict: PASS (with minor D-08 gap noted in Check 2)**

Plan 05 Task 3's 30-step UAT matrix:

| Requirement | Covered by UAT step(s) |
|---|---|
| LAM-01 list + columns | 1, 9 (columns via detail-page verification of the same rows) |
| LAM-01 create (Zip) | 2-6 |
| LAM-01 create (S3) | 7 (form inputs visible) |
| LAM-01 create (Image) | 8 (form inputs visible) |
| LAM-01 delete | 26-27 |
| LAM-02 payload editor | 14-16 |
| LAM-02 invoke success | 17-19 |
| LAM-02 invoke error | 21-23 |
| LAM-02 logs UTF-8 (Pitfall 1) | 18 (explicit `'안녕 from Lambda'` assertion) |
| LAM-03 configuration tab | 10-11 |
| LAM-03 environment tab (plaintext) | 12 |
| LAM-03 triggers tab (read-only) | 13 |

Decisions in UAT:
- D-01 (Create+Delete) → steps 2, 26
- D-02 (three sources) → steps 5, 7, 8
- D-03 (4 tabs) → steps 9-14
- D-04 (JSON validation) → steps 15-16
- D-05 (plaintext) → step 12
- D-06 (Response over Logs) → steps 18, 23
- D-07 (read-only triggers) → step 13
- **D-08 (Versions deferred) → NOT covered** (see Issue 2a)
- D-09 (spinner copy) → steps 17, 19
- D-10 (relative time + hover ISO) → step 10

Pitfalls in UAT: C-1 (step 1), 1 (step 18), 2 (step 23), 5 (implicit via BadZipFile flashbar wiring from step 5-6), 9 (step 27 — CLI `get-function` confirms function gone not version), 10 (steps 24-25), C-2 (step 30).

**Only missing UAT item:** D-08 negative check. Fix recommendation in Issue 2a above.

---

## Summary Table

| Check | Verdict | Notes |
|---|---|---|
| 1. Goal coverage | PASS | every LAM sub-requirement has grep-checkable task |
| 2. Decision respect | NEEDS_WORK | D-08 has no explicit negative assertion |
| 3. Wave dependency sanity | PASS | strict 0→1→2→3→4→5 chain, no cycles |
| 4. File overlap hazards | NEEDS_WORK | 04-03 files_modified omits FunctionDetailPage.tsx stub |
| 5. Pitfall mitigation | PASS | all 8 user-listed pitfalls guarded by tests/grep |
| 6. Registry Safety | PASS | 3-layer defense; optional auto gate suggested |
| 7. Human UAT completeness | PASS | 30 steps cover LAM-01/02/03 + 9/10 decisions |

**Net:** 5 PASS + 2 NEEDS_WORK (both narrow, both fixable in < 5 minutes each). No FAIL.

---

## Key Strengths to Preserve (do NOT regress in execution)

1. **Plan 00 pre-names every downstream test file and wires it to concrete `test.todo()` labels containing D-0N + Pitfall tags.** This is the single strongest Nyquist-compliance move in the phase — every later plan's `<verify>` command points at a file that already exists.
2. **MSW fixtures speak the HTTP layer, not the internal executor shape (Pitfall 4 defense baked into Wave 0).** Action text on 04-00-PLAN.md line 196 makes this explicit.
3. **Pitfall C-1 route ordering is enforced by an awk line-number assertion** (04-03-PLAN.md line 267), not just a grep — the strongest structural check in the phase.
4. **Invoke cache-neutrality (Pitfall 6) is test-enforced via `invalidateQueries` spy** at two levels (mutation-level in 04-02 and panel-level in 04-05). Double-spied.
5. **Base64 UTF-8 decoding path is validated end-to-end**: fixture (04-00) → hook (04-01 invokeClient) → render (04-05 InvokeResult.test asserts `'안녕'` in the DOM).
6. **Discriminated `LambdaCodeSource` union** (04-01 shared/types.ts) forces all three D-02 code sources to be handled exhaustively in `buildCreateBody` (04-02) — TypeScript regression-locks the decision.
7. **Lifted payload state + functionName-keyed reset** (04-04 FunctionDetailPage) pre-wires Plan 05's InvokePanel without Plan 05 needing to restructure tabs.
8. **Phase 3 utilities reused without premature extraction** (useFlashNotifications, DeleteBucketModal pattern, useCollection) — matches `03-05-SUMMARY.md` benchmark's reuse density.
9. **Human UAT covers the two most error-prone paths with concrete strings**: `안녕 from Lambda` (step 18, Pitfall 1) and `{"errorMessage":"division by zero","errorType":"ValueError"}` (step 23, Pitfall 2).

---

## Required Fixes Before Execution

### Fix 1 — Add D-08 negative assertion (Issue 2a)

**File:** `.planning/phases/04-lambda-service/04-04-PLAN.md`
**Location:** Task 2 `<acceptance_criteria>` block (after line 359)
**Add line:**
```
    - `grep -cE "Qualifier|\\$LATEST selector|publish|alias" web/src/services/lambda/FunctionDetailPage.tsx` == 0   (D-08 — Versions/Aliases deferred; no version UI)
```

**File:** `.planning/phases/04-lambda-service/04-05-PLAN.md`
**Location:** Task 3 UAT steps, after step 10
**Add step:**
```
  10.5. Visual scan of Configuration tab: NO "Version" dropdown, NO "Publish version" button, NO alias selector. Scan of detail page URL: no `?Qualifier=` segment anywhere (D-08 deferred).
```

### Fix 2 — Close 04-03 inventory leak (Issue 4a)

**File:** `.planning/phases/04-lambda-service/04-03-PLAN.md`
**Location:** frontmatter `files_modified:` block (lines 7-17)
**Add entry:**
```yaml
  - web/src/services/lambda/FunctionDetailPage.tsx
```
With inline comment or SUMMARY note: "created as stub in 04-03; replaced in 04-04".

---

## Optional Improvement

**Automated package.json gate (Check 6):** Add an acceptance criterion to 04-05-PLAN.md Task 2 that grep-checks no new dependency lines were introduced in `web/package.json` between Phase 3 merge and HEAD. Not blocking — manual UAT step 30 covers it.

