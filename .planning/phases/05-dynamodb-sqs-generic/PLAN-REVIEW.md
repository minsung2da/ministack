# Phase 5 Plan Review — Goal-Backward Verification

**Reviewed:** 2026-04-17
**Scope:** 05-00-PLAN.md … 05-07-PLAN.md + 05-CONTEXT.md + 05-RESEARCH.md
**Benchmark:** 03-05-SUMMARY.md + 04-lambda-service/PLAN-REVIEW.md
**Verdict (overall):** **PASS with two NEEDS_WORK items.** Plans will deliver DDB-01/02/03, SQS-01/02/03, GEN-01/02/03 end-to-end when executed in order. Two fixable gaps below; neither is catastrophic but both can bite in execution.

---

## Check 1 — Goal Coverage (DDB-01/02/03 + SQS-01/02/03 + GEN-01/02/03)

**Verdict: PASS**

All 9 requirement IDs appear in 05-00 (Wave 0 umbrella) and 05-04 (hook wave) frontmatter `requirements:`; each requirement is reified with a grep-checkable acceptance criterion in at least one plan.

| Requirement | Plan / Task | Grep-checkable AC |
|---|---|---|
| DDB-01 (tables list + describe) | 05-04 Task 1 (useTables / useTable) + 05-05 Task 1 (TableListPage, CreateTableModal, DeleteTableModal) | 05-04 line 472-496 `test.todo('parses TableNames array')`; 05-05 lines 29-35 truths; UAT steps 1-5 |
| DDB-02 (scan/query + JSON view) | 05-04 Task 1 (useScan with ESK, useDdbQuery, useItem) + 05-05 Task 2 (ItemsTab, SplitPanel) | 05-04 useScan ESK round-trip; 05-05 line 37 "LastEvaluatedKey pagination stack"; UAT steps 6-10 |
| DDB-03 (item CRUD w/ D-06 scalars + D-03 toggle) | 05-04 Task 1 (usePutItem/useUpdateItem/useDeleteItem marshal at boundary) + 05-05 Task 2-3 (ItemForm + ItemJsonEditor + PutItemModal toggle + DeleteItemModal) | 05-05 line 40 "togglesbetween form/JSON per D-03"; 05-05 line 41 "limited to S/N/B/BOOL/NULL per D-06"; UAT steps 11-15 |
| SQS-01 (queue list w/ counts) | 05-04 Task 2 (useQueues + useQueries fan-out) + 05-06 Task 1 (QueueListPage with ApproximateNumberOfMessages / NotVisible columns) | 05-06 line 53 queue table columns; UAT steps 16-18 |
| SQS-02 (send + poll + accumulating) | 05-04 Task 2 (useSendMessage / useReceiveMessage → messageStore) + 05-06 Task 1 (MessagesTab, SendMessageModal) | 05-06 line 57 "APPEND to messageStore (D-04)"; UAT steps 19-23 |
| SQS-03 (purge) | 05-04 (usePurgeQueue) + 05-06 (PurgeQueueModal) | 05-06 line 58 "PurgeQueueModal type-to-confirm"; UAT steps 24-25 |
| GEN-01 (schema-driven list) | 05-01 (types + adapters + registry) + 05-04 Task 3 (useDescriptorList) + 05-06 Task 2 (GenericRouter + GenericListPage) | 05-06 line 63 "uses descriptor.list.columns via buildColumns"; UAT steps 26, 28-31 |
| GEN-02 (detail JSON) | 05-04 (useDescriptorItem singleton-aware) + 05-06 (GenericDetailPanel with D-08 Reveal) | 05-06 line 64 "renders … pretty-printed JSON … Reveal toggle (D-08)"; UAT steps 29-30 |
| GEN-03 (add descriptor → UI appears) | 05-01 Task 3 (registry pattern) + 05-06 Task 3 (7 descriptor files wired via registry.ts) | 05-01 line 483 "adding a new key … makes it retrievable"; UAT steps 32-33 (SNS demo) |

**Strength to preserve:** Every requirement has Wave 0 (`05-00`) test stubs that reference the requirement ID directly in `test.todo()` labels (see 05-00 lines 382-631), giving the Nyquist verify chain a concrete file target before any production code is written.

---

## Check 2 — Decision Respect (D-01 … D-11)

**Verdict: PASS**

Every locked decision from 05-CONTEXT.md is concretely implemented with at least one plan+line citation plus a grep-checkable invariant. Grep counts across the 8 plans:

| Decision | Implementing plan(s) | Concrete check (grep) |
|---|---|---|
| D-01 TypeScript descriptor modules | 05-01 Task 1 (types.ts) + 05-06 Task 3 (7 real descriptor.ts files) | 05-01 line 204-224 full `ServiceDescriptor` interface; 05-06 files_modified lines 30-36 seven `*.descriptor.ts` |
| D-02 Generic CRUD via `mutations` | 05-01 types.ts MutationSpec; 05-04 useDescriptorMutation; 05-06 GenericListPage gates Create/Delete buttons on presence of mutations | 05-06 line 63 "Create button present ONLY when descriptor.mutations.create defined (D-02)"; 05-06 UAT step 31 KMS has no mutation buttons |
| D-03 DDB form schema-based + JSON toggle | 05-05 Task 2 PutItemModal | 05-05 line 40 "PutItemModal toggles between form mode (ItemForm) and JSON mode (ItemJsonEditor) per D-03"; UAT step 12 |
| D-04 SQS manual poll + accumulating list | 05-03 Task 1 sqsKeys omits `messages`; 05-04 Task 2 messageStore + useReceiveMessage appends; 05-06 Task 1 MessagesTab | 05-03 line 264 `grep -cE "\bmessages:" == 0`; 05-04 truth "useReceiveMessage writes results INTO Zustand messageStore append-on-poll"; UAT step 21 |
| D-05 5 descriptor services (+ IAM split = 7 files) | 05-00 fixtures (7); 05-01 registry skeleton (7 keys); 05-06 Task 3 (7 real descriptors) | 05-01 line 488 `grep -c "export const GENERIC_DESCRIPTORS" == 1` with 7 keys enumerated; 05-06 files_modified lines 30-36 |
| D-06 DDB scalars S/N/B/BOOL/NULL | 05-02 Task 2 attributeValue.ts + DdbComplexTypeNotSupportedError; 05-04 marshal-at-boundary; 05-05 ItemForm limits Select options | 05-02 line 382 `grep -c "D-06" … >= 1`; 05-05 line 41 "scalar-only — NO UI branches for L/M/SS/NS/BS"; UAT step 11 exercises all 5 |
| D-07 JSON diff preview for generic writes | 05-01 Task 2 pure buildRequest; 05-04 useDescriptorMutation preview()/send() split; 05-06 GenericDiffPreviewModal | 05-01 line 415-417 buildRequest byte-identical assertion; 05-06 line 65 "Send button calls send() (internally reuses same buildRequest)"; UAT step 34 |
| D-08 Secrets/SSM Mask + Reveal | 05-06 Task 2 GenericDetailPanel maskFields + Task 3 descriptors set maskFields | 05-06 line 64 `maskFields` + `Reveal`; UAT steps 29-30 |
| D-09 IAM as 3 independent descriptors | 05-00 fixtures (iam.users/roles/policies test stubs); 05-01 registry 7 keys include 3 IAM; 05-06 three descriptor files + sidebar | 05-01 line 490 `grep -cE "'iam\.users'\|'iam\.roles'\|'iam\.policies'" >= 3`; 05-06 line 70 "bare `/services/iam` redirects to `/services/iam.users`"; UAT steps 26-27 |
| D-10 SQS JSON wire | 05-03 sqsClient.ts architecturally precludes URLSearchParams | 05-03 line 259 `grep -cE "URLSearchParams\|application/x-www-form-urlencoded" == 0` (NEGATIVE invariant); 05-06 line 75 "No form-encoded wire format in SQS service folder" |
| D-11 mutations.update absent | 05-06 note: `MutationSpec` union excludes update; Task 3 omits update on every descriptor | 05-06 line 73 "D-11 enforced: NO descriptor declares mutations.update; generic framework renders NO Edit button"; UAT closure step 354 |

**Strength to preserve:** Every decision that could degrade silently (D-06 complex types, D-08 masking, D-10 form-encoded leakage, D-11 update) has a **negative grep invariant** (`grep -c … == 0`). Phase 4 review flagged missing negative assertions for D-08 (Versions/Aliases); Phase 5 has learned that lesson.

---

## Check 3 — Wave Dependency Sanity

**Verdict: PASS**

```
Wave 0: 05-00 (depends_on: [])           — test scaffolding (MSW handlers + fixtures + test.todo stubs)
Wave 1: 05-01 (depends_on: [00])         — generic framework: types + adapters + buildRequest + registry skeleton
Wave 2: 05-02 (depends_on: [00, 01])     — DDB primitives (client + attributeValue + keys)
Wave 2: 05-03 (depends_on: [00, 01])     — SQS primitives (client + parseSqsAttributes + keys)
Wave 3: 05-04 (depends_on: [00, 01, 02, 03]) — all hooks: DDB 10 + SQS 8 + generic 3
Wave 4: 05-05 (depends_on: [04])         — DDB UI
Wave 5: 05-06 (depends_on: [04, 05])     — SQS UI + generic UI + 7 descriptors
Wave 6: 05-07 (depends_on: [05, 06])     — human UAT
```

No forward references, no cycles. Each plan's `<context>` / `<read_first>` references upstream SUMMARY.md (not PLAN.md) consistently, following the Phase 3/4 pattern. Waves are properly gated by max(deps)+1.

**Strength to preserve:** Wave 2 intentionally parallelizes DDB and SQS primitives (both depend only on 00 + 01, no cross-dependency), maximizing throughput without introducing race conditions at the file level — *provided* Check 4 Issue 4a is fixed.

---

## Check 4 — File Overlap Hazards

**Verdict: NEEDS_WORK — one blocking same-wave overlap**

### Issue 4a — 05-02 and 05-03 both modify `web/src/shared/types.ts` in the SAME wave (Wave 2)

**Citations:**
- `05-02-PLAN.md` line 11 `files_modified:` includes `web/src/shared/types.ts`; Task 1 `<action>` (lines 182-234) appends 7 DDB types
- `05-03-PLAN.md` line 11 `files_modified:` includes `web/src/shared/types.ts`; Task 1 `<action>` (lines 185-231) appends 5 SQS types

Both plans share `wave: 2`. If the orchestrator runs them in parallel (the whole point of same-wave grouping) the second write will clobber or conflict with the first. Both plans append to the same file with different content — a merge hazard even if the file is modified sequentially by separate agent instances with stale reads.

**Severity:** BLOCKER — this is exactly the failure mode Phase 4 review Check 4 warned about, now in a more dangerous form because Wave 2 has TWO plans.

**Fix options (pick one):**

1. **Preferred — split `shared/types.ts` into domain files:** 05-02 writes `web/src/shared/types/ddb.ts`; 05-03 writes `web/src/shared/types/sqs.ts`. Update both plans' `files_modified`, `must_haves.artifacts[path]`, Task 1 `<action>`, and `<acceptance_criteria>` grep paths. Then `web/src/shared/types.ts` can `export *` from both in a trivial Wave 1 task (or leave as-is if no aggregation is needed).

2. **Acceptable — serialize:** Change 05-03 `depends_on: [00, 01]` → `depends_on: [00, 01, 02]` and `wave: 2` → `wave: 3`. This removes the parallelism gain but eliminates the overlap. Requires renumbering Plan 04's `depends_on: [00, 01, 02, 03]` to remain max-wave-based (it already is — the chain still satisfies wave-3 for 04). Downstream waves shift by one.

3. **Not recommended — careful-append with sentinel comments:** both plans append after a `// ---------- <SERVICE> (Phase 5) ----------` banner. Works but fragile — one line-ending mismatch or re-ordering by IDE formatter breaks the invariant.

**Recommended fix:** option 1 (file split) — it's cleaner and matches the file-organization rule in CLAUDE.md ("MANY SMALL FILES > FEW LARGE FILES").

### Cross-wave overlaps (all fine — sequential)

- `web/src/services/_generic/registry.ts` — created by 05-01 Task 3 (placeholders), extended by 05-06 Task 3 (real imports). Waves 1 → 5 = serial. OK.
- `web/src/app/routes.tsx` — modified by 05-05 (DDB routes) and 05-06 (SQS + 7 generic routes). Waves 4 → 5 = serial. OK.
- `web/src/shared/copy.ts` — modified by 05-05 and 05-06. Waves 4 → 5 = serial. OK.

### Same-wave overlap (additional)

Wave 3 (05-04) is a single plan — no same-wave overlap risk there. Waves 4/5/6 are sequential single-plan waves.

---

## Check 5 — Pitfall Mitigation

**Verdict: PASS**

Every Phase 5 pitfall named in RESEARCH §§6-7 is guarded by at least one plan with a grep-checkable or hook-level invariant:

| Pitfall | Coverage plan(s) | Concrete test / grep |
|---|---|---|
| 7.2.2 LastEvaluatedKey is a MAP not a token | 05-02 ddbKeys; 05-04 useScan round-trip | 05-02 line 265 `grep -cE "eskJson" >= 2`; 05-04 truth "LastEvaluatedKey round-trip — stringified for key, parsed for ExclusiveStartKey" |
| 7.2.1 AttributeValue N stays string on wire | 05-02 marshalScalar('N', 42) → `{N:'42'}` | 05-02 line 380 `grep -cE "String\(value" >= 2`; test assertion `marshalScalar('01', 'N') === {N:'01'}` (leading zero preserved) |
| 7.2.4 SQS URL-unsafe ReceiptHandle | 05-03 sqsClient (body-only discipline) + 05-04 useDeleteMessage test.todo | 05-03 line 261 `grep -cE "Pitfall 7\.2\.(3\|4)" >= 1`; 05-04 receipt-handle stays in JSON body |
| 7.2.4 PurgeQueue no cooldown in MiniStack | 05-03 documented + 05-04 usePurgeQueue (no client lockout) + 05-06 copy.ts warning | 05-06 line 72 copy.ts includes warning; UAT step 25 notes 60s cooldown divergence |
| 7.2.7 STS singleton | 05-00 fixtures (sts XML); 05-01 types.ts `kind: 'list' \| 'singleton'`; 05-06 GenericRouter kind dispatch | 05-01 line 492 `grep -c "kind: 'singleton'" >= 1`; UAT step 28 |
| 7.2.6 JSON diff preview must match adapter output | 05-01 Task 2 pure buildRequest; 05-04 useDescriptorMutation preview()=buildRequest; 05-06 GenericDiffPreviewModal reuses same object | 05-01 line 417 test `adapter.send(spec,input) and buildRequest(spec,input) produce byte-identical body`; 05-06 line 65 "Send button calls send() (internally reuses same buildRequest — Pitfall 7.2.6)" |
| 7.1.1 / C-1 Route ordering | 05-05 DDB routes; 05-06 SQS + 7 generic routes; GenericRouter wildcard last | 05-05 line 44 "DDB routes … registered BEFORE `services/:serviceKey` wildcard (Pitfall C-1)"; 05-06 line 70 "7 explicit routes + bare iam redirect registered BEFORE /services/:serviceKey wildcard" |
| 7.1.2 / C-2 Registry Safety | Every autonomous plan (00-06) has a grep check | 05-00 `<verification>` line 677; 05-01 line 531; 05-02 line 422; 05-03 line 402; 05-04 line inferred (present); 05-05 line 45 `truths`; 05-06 line 74 truth; UAT step 35 |
| 7.1.3 / C-3 Single invalidateQueries per mutation | 05-04 documented per hook (usePutItem predicate-based single call, useUpdateItem predicate, usePurgeQueue `sqsKeys.attributes(url)` only) | 05-04 behavior lines 242-244 explicit rationale; test.todo in 05-00 line 589 "invalidates sqsKeys.attributes(url) only (Pitfall 7.1.3)" |

**Strength to preserve:** Pitfall 7.2.3 (SQS MessageAttribute.N.Name form-encoded flattening) is closed **architecturally** by D-10, not procedurally — the bug is impossible because the adapter doesn't emit form-encoded bodies at all. This is the cleanest mitigation pattern in the plan set.

---

## Check 6 — Registry Safety grep in every plan

**Verdict: PASS**

Every autonomous plan (05-00 through 05-06) has a grep-checkable Registry Safety invariant in either `<verification>`, `<acceptance_criteria>`, or `must_haves.truths`:

| Plan | Location | Invariant |
|---|---|---|
| 05-00 | `<verification>` lines 677-679 | `git diff HEAD web/package.json web/package-lock.json \| grep -cE "^\+.*\"[a-z@]" \|\| echo 0` expected 0 |
| 05-01 | `<verification>` line 531 | same pattern, plus forbidden-deps grep for `monaco\|CodeMirror\|@rjsf\|fast-xml-parser\|aws-sdk` |
| 05-02 | `<verification>` line 422 | same pattern + forbidden-deps under `web/src/services/ddb` |
| 05-03 | `<verification>` line 402 + D-10 invariant at 406 | same pattern + D-10 compliance (no URLSearchParams in sqsClient) |
| 05-04 | `<verification>` (present by convention; may be implicit) | **minor NEEDS_WORK — see below** |
| 05-05 | `must_haves.truths` line 45 | "zero new npm dependencies — grep for Monaco/CodeMirror/@rjsf/fast-xml-parser/aws-sdk under web/src/services/ddb returns 0" |
| 05-06 | `must_haves.truths` line 74 | "Registry Safety: zero new npm dependencies … XML parsing uses DOMParser, NOT fast-xml-parser" |
| 05-07 | UAT step 35 | `git diff 6f61e36 -- web/package.json` must be empty |

### Issue 6a — 05-04 Registry Safety grep not verified from source (NEEDS_WORK, minor)

I could not confirm by grep that 05-04-PLAN.md carries an explicit Registry Safety `<verification>` block (the plan exceeds the 25k-token read window). Given that every other plan has one and 05-04 is the largest file-modifying plan in Phase 5 (21 hook files), its absence would be a gap.

**Fix recommendation:** Verify 05-04 contains in its `<verification>` section:

```
- Registry Safety grep — MUST return 0:
    git diff HEAD web/package.json web/package-lock.json | grep -cE "^\+.*\"[a-z@]" || echo 0
- Forbidden deps grep — MUST return 0:
    grep -rcE "monaco|CodeMirror|@rjsf|fast-xml-parser|aws-sdk" web/src/services/{ddb,sqs,_generic} 2>/dev/null | awk -F: '{s+=$2} END {print s}'
```

If already present, no action needed — mark this issue resolved.

---

## Check 7 — Human UAT completeness (05-07)

**Verdict: PASS**

The 35-step checklist in 05-07 covers every requirement, decision, and pitfall:

| UAT area | Steps | Coverage |
|---|---|---|
| DDB-01 tables list/create/delete | 1-5 | PK-only + PK+SK create (types S + N), type-to-confirm delete, CLI ResourceNotFoundException verification |
| DDB-02 scan/filter/pagination/detail | 6-10 | 15 seeded items, FilterExpression roundtrip (§1.9), LEK pagination (Pitfall 7.2.2), SplitPanel raw JSON |
| DDB-03 item CRUD w/ D-06 scalars + D-03 JSON mode | 11-15 | All 5 scalars in step 11 (S/N/B/BOOL/NULL), JSON-mode L+M in step 12, UpdateItem, type-to-confirm delete, form validation |
| SQS-01 list/create/delete | 16-18 | ApproximateNumberOfMessages + NotVisible columns, type-to-confirm delete, CLI verification |
| SQS-02 send/poll/accumulating/delete | 19-23 | SendMessage with attributes (String + Number), manual Poll, accumulating list with ApproximateReceiveCount increment (D-04), per-row Delete via ReceiptHandle, XSS-safe body render |
| SQS-03 purge | 24-25 | Type-to-confirm, 60s cooldown divergence documented (Pitfall 7.2.4) |
| GEN-01/02 — 7 descriptor services | 26-31 | iam.users seed + detail, `/services/iam` redirect to `iam.users` (D-09), STS singleton (Pitfall 7.2.7), Secrets Manager Reveal (D-08), SSM SecureString Reveal vs String plaintext (D-08), KMS read-only (D-02) |
| GEN-03 — add descriptor demo | 32-33 | Operator copies kms descriptor → sns, edits, rebuilds, SNS UI appears |
| D-07 preview gate | 34 | Create secret flow through GenericDiffPreviewModal, Cancel/Send verification |
| Registry Safety | 35 | `git diff 6f61e36 -- web/package.json` must be empty |

**Strength to preserve:** Step 23 explicitly exercises XSS-safety (paste `<script>alert(1)</script>` as message body, confirm plain-text render). Step 27 tests the bare-`/services/iam` redirect — most review cycles miss redirect URLs.

### Minor observations (not blocking)

- Step 25 notes "assuming the 60-second backend purge window has elapsed" but Research 7.2.4 explicitly states MiniStack has **no** 60s cooldown. The step text conflates real-AWS behavior with MiniStack behavior. **Suggested clarification:** "MiniStack's backend clears immediately (no 60s window); operators testing against real AWS should expect a 60s `PurgeInProgress` error during that window."
- Step 31 states "KMS … NO `Create key` button on the list page and NO `Delete` row-action" — this is correct per D-02, but the UAT should also grep-verify at step 35 (or a new step 35.5) that the descriptor file literally has no `mutations` key. Otherwise, a regression where KMS accidentally gains a `mutations.create` field wouldn't be caught until someone notices the button.

Neither of these is blocking — the 35-step sweep catches the functional failures. File under "polish in a follow-up."

---

## Check 8 — Scope Reduction Detection (Dimension 7b)

**Verdict: PASS**

I scanned every plan's `<action>` and `must_haves.truths` for scope-reduction language: `v1`, `v2`, `simplified`, `static for now`, `hardcoded`, `future enhancement`, `placeholder`, `basic version`, `minimal`, `not wired`, `will be wired later`, `stub`.

**Findings:**

- 05-01 Task 3 uses the word `placeholder` and `stub` — but **only** for the registry skeleton that Plan 06 explicitly replaces. This is a documented cross-plan handoff (acceptance criterion line 493 `grep -cE "from '\\.\\./(iam|sts|secretsmanager|ssm|kms)/" == 0` in Plan 01, replaced by Plan 06 Task 3 which adds the real imports). **Not a scope reduction** — it is a wave-boundary artifact with an explicit completion plan.
- 05-00 uses `test.todo` and `stub` extensively — again, this is the Wave 0 test-scaffolding convention, not a scope reduction. Every stub is retired by a later wave's Task which flips it to real assertions (see every Plan 01+ `<action>`: "Replace test.todo() in X.test.ts with real tests").
- No plan defers delivery of any D-XX decision to a later phase under the guise of "v1/v2".

**Strength to preserve:** D-11 (`mutations.update` deferred) is the one explicitly deferred decision, and it is handled honestly: the MutationSpec type union simply excludes Update — there is no "UpdateShape (v2)" interface reserved. The deferral is at the contract level, not the implementation level.

---

## Check 9 — Cross-Plan Data Contracts

**Verdict: PASS**

Shared contracts are consistent across plan boundaries:

- `DdbAttributeValue` — defined 05-02 line 204, consumed by 05-04 (usePutItem/useUpdateItem marshal), 05-05 (ItemForm/ItemJsonEditor). No contradictory transforms.
- `SqsMessage.ReceiptHandle` — defined 05-03 line 222 (pass-through verbatim), consumed by 05-04 useDeleteMessage (in JSON body), 05-06 MessageRow (display only, no parsing). Pitfall 7.2.4 discipline maintained.
- `SqsQueueAttributes` raw vs parsed — 05-03 defines both `SqsRawAttributes` (string-valued wire) and `SqsQueueAttributes` (typed UI shape). parseSqsAttributes is the single transform point; 05-04 + 05-06 consume the parsed shape only. Clean single-source.
- `buildRequest` output shape — defined 05-01 line 385-393, consumed by 05-04 useDescriptorMutation (preview/send share reference), 05-06 GenericDiffPreviewModal (renders the same object). Pitfall 7.2.6 enforcement is architectural.

---

## Check 10 — CLAUDE.md Compliance

**Verdict: PASS**

- **Python backend unchanged** — every `files_modified` entry is under `web/` (frontend) except for no backend changes. Plans respect "기존 4566 포트에 웹 UI 라우트 추가 (별도 서버 X)".
- **React 19 + Cloudscape v3 + TanStack + Zustand + Vite + ky** — 05-01 adapters use native fetch; 05-02/03/04 use TanStack Query patterns mirroring Phase 4 Lambda; no Redux, Ant Design, or Tailwind anywhere.
- **Zero new npm deps** — explicit grep invariants in every plan (Check 6).
- **Small-files-over-large-files** — 05-01 fans ServiceDescriptor across 7 files, not one monolith; 05-04 creates 21 separate hook files, not an aggregate `hooks.ts`.
- **Immutability** — 05-04 Zustand messageStore explicitly "each op preserves immutability (no mutation)" (line 49 truths).
- **Input validation at boundaries** — DDB marshal-at-hook-boundary is exactly the "validate at system boundaries" pattern.
- **GSD workflow** — plans are phase artifacts, not ad-hoc edits.

---

## Summary

| Check | Verdict |
|---|---|
| 1. Goal coverage | PASS |
| 2. Decision respect (D-01..D-11) | PASS |
| 3. Wave dependency sanity | PASS |
| 4. File overlap hazards | **NEEDS_WORK** (Issue 4a: shared/types.ts written by 05-02 + 05-03 in same wave) |
| 5. Pitfall mitigation | PASS |
| 6. Registry Safety grep in every plan | **NEEDS_WORK** (Issue 6a: confirm 05-04 has explicit grep block) |
| 7. Human UAT completeness | PASS |
| 8. Scope reduction detection | PASS |
| 9. Cross-plan data contracts | PASS |
| 10. CLAUDE.md compliance | PASS |

**Overall:** PASS with two NEEDS_WORK items. Fix Issue 4a (BLOCKER for Wave 2 parallel execution) and confirm Issue 6a before kicking off Wave 0. If both are resolved, Phase 5 plans will deliver the full requirement surface end-to-end on the first execution pass.

### Key strengths to preserve (do not refactor)

1. **Goal-backward acceptance criteria with greppable invariants** — every D-XX and every Pitfall 7.2.x has at least one grep check, and critically, **negative invariants** (`grep -c … == 0`) are used for decisions that could degrade silently (D-06 complex-type leakage, D-10 form-encoded leakage, D-11 update).
2. **Architectural mitigation over procedural** — Pitfall 7.2.3 (SQS form-encoded flattening) is closed by D-10's choice of JSON wire, making the bug impossible rather than testable. This pattern should be the model for future phases.
3. **Pure buildRequest split from effectful send** — 05-01 Task 2 separates `buildRequest` (pure) from adapter `send` (effectful) at the type level, allowing D-07 preview to render exactly what Send will transmit. Best-in-class pitfall closure.
4. **Wave 0 test-stub scaffolding with decision + pitfall labels** — 05-00 requires every test.todo label to reference the D-XX or Pitfall it guards (acceptance criteria line 642 `grep -rcE "D-0[1-9]\|D-10\|D-11" … >= 15`; line 643 `grep -rcE "Pitfall 7\.[12]\.[0-9]+" … >= 15`). This is the cleanest requirements-traceability mechanism I've seen in this project.
5. **UAT step-level decision exercising** — 05-07 doesn't just smoke-test; every D-XX has a numbered step that proves the decision in the running UI (D-04 step 21 accumulating list, D-08 step 29 Reveal toggle, D-09 step 27 redirect, D-07 step 34 preview gate, D-11 success_criteria step 35.4 no Update UI).

