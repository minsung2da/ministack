---
phase: 4
phase_name: lambda-service
phase_slug: lambda-service
requirements: [LAM-01, LAM-02, LAM-03]
created: 2026-04-17
depends_on: [Phase 3]
---

# Phase 4 Context: Lambda Service UI

## Phase Goal (from ROADMAP.md)

Users can see the Lambda function list, view function configuration/environment/triggers on a detail page, and invoke a function with a JSON payload to see the response and execution log.

## Domain Scouting

### Backend (already built)
- `ministack/services/lambda_svc.py` — 2,778 lines, complete Lambda emulation
  - Function CRUD: `_create_function`, `_list_functions`, `_get_function`, `_delete_function`, `_update_code`, `_update_config`
  - Invoke: `_invoke` async, supports Docker runtime (`_execute_function_docker`), warm-path local exec (`_execute_function_warm`), image (`_execute_function_image`)
  - Versions / Aliases: `_publish_version`, `_list_versions`, `_create_alias`, ... (available but scope-deferred in this phase)
  - Policies / Permissions: `_add_permission`, `_get_policy` (deferred)
  - Event source mappings: present in backend state (triggers read-path only for this phase)
- `_fetch_code_from_s3` confirms backend accepts `S3Bucket + S3Key` code source alongside direct `ZipFile` bytes and `ImageUri` container images

### Frontend patterns to reuse (from Phase 2 / Phase 3)
- `web/src/services/s3/` as the template — same layout applies
- TanStack Query 5 hooks with stable query keys: `lambdaKeys.functions()`, `lambdaKeys.function(name)`, `lambdaKeys.triggers(name)`
- Cloudscape 3.x components; **no new npm dependencies** (Registry Safety)
- SplitPanel for detail, Flashbar for notifications
- Type-to-confirm modals for destructive actions (Phase 2 `DeleteModal` pattern)
- Route placement: `/_console/services/lambda` list → `/_console/services/lambda/:functionName` detail (BEFORE the `/services/:serviceKey` wildcard — Phase 3 Pitfall 5)

## Locked Decisions (discussion output)

### D-01 — Scope: Create + Delete IS included
Beyond LAM-01/02/03 (which only require list + detail + invoke), this phase **also implements Create and Delete** to give users a console-parity CRUD experience.

**Why:** User explicitly chose "Create + Delete 모두 추가" to match AWS console expectations, even though the requirements only demand read + invoke. Keeps DX high; matches S3 Phase 3 completeness.

### D-02 — Code upload: Zip + S3 key + Container Image URI (all three)
Create form exposes three mutually-exclusive code sources:
1. **Zip upload** — user drops a `.zip` file, we send base64 `ZipFile` field to backend
2. **S3 key** — two text inputs (bucket + key). Backend does the fetch via `_fetch_code_from_s3`
3. **Container Image URI** — text input for ECR/image registry URI

UI uses Cloudscape `Tiles` or `RadioGroup` to select source type; only the relevant input set is shown.

**Why:** Backend supports all three; limiting to one throws away functionality users may need for image-based workflows.

**Tradeoff:** Larger Create form surface. Mitigation: sensible defaults (zip source preselected), collapsible "Advanced" section for rarely-used S3 key path.

### D-03 — Invoke UI placement: Dedicated Test tab on the detail page
Function detail page structure (tabs within SplitPanel or top-level Tabs component):
- **Configuration** — runtime, handler, memory, timeout, code size, role ARN
- **Environment** — env var key/value table
- **Triggers** — read-only list of event source mappings + function URLs (if present)
- **Test** — payload editor + Invoke button + response/logs panel

**Why:** Matches real AWS console pattern. Inline invocation keeps context (user sees function name, memory/timeout) while testing. Modal hides payload history; separate page duplicates navigation.

### D-04 — Payload editor: Cloudscape Textarea + realtime JSON validation
- Monospace `Textarea` with a fixed height (~300px, vertically resizable).
- `onChange` handler runs `JSON.parse` in a try/catch. If invalid, show inline `FormField` error "Invalid JSON: {message}"; **disable Invoke button** while error is present.
- Provide a dropdown of sample payloads (empty `{}`, API Gateway event, S3 put-object event, custom `{ "key": "value" }`) to bootstrap.
- No Monaco / CodeMirror / AST-based editor — would add 2MB+ to the bundle and violate UI-SPEC Registry Safety.

### D-05 — Environment variables displayed in plaintext (no masking)
Env var table shows key + value as-is, both columns sortable/filterable. **No show/hide toggle, no asterisk masking.**

**Why:** MiniStack is a **local** emulator. Secrets are already on the user's machine; the UI has no shoulder-surfing threat model worth defending against. Masking would add state/complexity for no security win. Real-AWS operators who need masking should use the real AWS console, not MiniStack.

### D-06 — Invoke result layout: Response above, Logs below (vertical stack, no tabs)
- **Top section:** "Response payload" — JSON-pretty-printed in a `CodeView` or `<pre>` block.
- **Bottom section:** "Logs" — base64-decoded text from `LogResult` header in a monospace block.
- If response contains `FunctionError: "Unhandled"` or `"Handled"`, prepend a red Cloudscape `Alert` summarizing the error before the response block.

**Why:** User sees both outputs without clicking. Logs and response often read together ("did the function print before crashing?"). Tabs hide the other half.

### D-07 — Triggers tab: Read-only (list + detail)
Show each event source mapping with: UUID, source ARN, state, batch size, last processing timestamp. Show Function URLs (if configured) with AuthType + URL. **No create / edit / delete** on triggers this phase.

**Why:** LAM-03 says "트리거 정보를 볼 수 있다" — read-only satisfies it. Trigger CRUD is complex (different per source type: SQS, Kinesis, DynamoDB streams) and warrants its own phase.

### D-08 — Versions / Aliases: Deferred (not in Phase 4)
All detail views operate on `$LATEST`. No Versions tab, no alias selector. Added to the Deferred Ideas section below for a future phase.

**Why:** Not in LAM requirements. Adds significant UI surface (publish modal, alias CRUD, version selector ties into Invoke). Ship the core first.

### D-09 — Invoke loading UX: Inline Spinner + cold-start copy
- While invoke is in flight: show a Cloudscape `Spinner` next to the Invoke button with copy "Invoking... cold start으로 10초+ 걸릴 수 있습니다".
- After 3 seconds elapsed: swap copy to "Still invoking..." (keeps user informed without suggesting failure).
- No explicit Cancel button — Lambda invoke is short-enough-bounded that cancel adds more complexity than value.

**Why:** Docker-based runtime (`_execute_function_docker`) genuinely takes 10s+ on first call per container image pull. Users will otherwise assume a hang and re-click, causing duplicate invocations.

### D-10 — Time format: Relative + hover absolute (matches Phase 6 DISP-02 pattern)
Last-modified and trigger timestamps show as "3 minutes ago" with a tooltip revealing the absolute ISO string on hover.

**Why:** AWS console parity. Phase 6 will formalize a shared `<RelativeTime>` component across services; this phase can either inline a simple `Intl.RelativeTimeFormat` helper or cherry-pick from a future shared util — to be decided in research.

## Deferred Ideas (roadmap backlog candidates)

- **Lambda Versions / Aliases management** — publish version, alias CRUD, traffic-shift weights
- **Layers management** — list / create / delete layers, attach to function
- **Triggers CRUD** — create/modify/delete event source mappings (per source type: SQS, Kinesis, DDB streams, MSK)
- **Permissions / Policy editor** — add/remove permission statements
- **Function code editor** — inline code editing for Node.js/Python without re-uploading zip (requires client-side zipping)
- **CloudWatch Logs browsing** — historical log streams beyond the LogResult from the last invoke
- **Concurrent executions / reserved concurrency** — config tab

## Downstream Agent Guidance

### For gsd-phase-researcher
Investigate:
- Lambda REST API shape: path patterns for CreateFunction, Invoke, List/GetFunction, EventSourceMappings (the backend is already in `lambda_svc.py line 432 handle_request` — read it to learn the exact paths)
- Base64 decoding of `LogResult` header in browser (`atob` + text decoding)
- Sample event payload JSON templates (API Gateway v2, S3 put-object, etc. — short, representative)
- TanStack Query pattern for polling `_list_versions` (if Versions section ever added — not this phase)
- **Pitfall candidate:** How the backend signals cold-start latency vs real failure (both could take 10s; inspect headers or status)

### For gsd-planner
Locked from this document:
- 5 pages/components: `LambdaLayout`, `FunctionListPage`, `FunctionDetailPage`, `CreateFunctionModal`, `DeleteFunctionModal`
- 4 detail tabs: Configuration / Environment / Triggers / Test
- 3 code-source variants in Create (Zip / S3 / Image)
- Dedicated `InvokePanel` component owns: Textarea, JSON-validation state, Invoke button, response+logs display
- No new npm dependencies; reuse Phase 2/3 utilities (copy catalog, uiStore, TanStack Query wrappers)
- Route order: `/services/lambda` list route registered BEFORE `/services/:serviceKey` wildcard in `web/src/app/routes.tsx`

### Claude's Discretion (no user decision needed)
- Test scaffolding approach (Wave 0 test stub pattern matches Phase 3 03-00)
- MSW fixtures for Lambda REST responses
- Exact file split (small-file principle per CLAUDE.md rules)
- Error flashbar copy (match Phase 3 copy catalog style)
- Empty-state copy for the function list
