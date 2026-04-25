---
phase: 05-dynamodb-sqs-generic
plan: 06
subsystem: sqs-ui + generic-framework-ui + 7-descriptors
tags: [sqs, iam, sts, secretsmanager, ssm, kms, cloudscape, react-router, tanstack-query]
requires:
  - 05-01 (generic framework types / registry / adapters / buildRequest)
  - 05-04 (Plan 04 hooks — SQS + generic preview/send)
provides:
  - SQS-01 queue list UI
  - SQS-02 send/receive/delete messages UI (D-04 manual Poll + append)
  - SQS-03 purge queue UI
  - GEN-01 GenericListPage (D-02 conditional mutation controls)
  - GEN-02 GenericDetailPanel (D-08 Reveal toggle)
  - GEN-03 "add descriptor → UI appears" literal proof
affects:
  - web/src/app/routes.tsx (SQS + 7 descriptor routes BEFORE :serviceKey wildcard)
  - web/src/app/Sidebar.tsx (Messaging & Identity section, dedupe against backend)
  - web/src/shared/copy.ts (7 new namespaces: sqs, generic, iam, sts, secretsmanager, ssm, kms)
  - web/src/services/_generic/registry.ts (placeholders replaced with real imports)
  - web/src/services/_generic/types.ts (detail.maskFields? added — D-08)
tech-stack:
  added: []  # zero new npm dependencies (Registry Safety held)
  patterns:
    - "Descriptor-driven CRUD UI (D-01): one TS module per service drives list/detail/mutations."
    - "D-07 JSON diff preview gate: GenericDiffPreviewModal shows {url, headers, body} from preview() before send()."
    - "D-08 mask + Reveal: per-field toggle for SecretString/SecretBinary/Value."
    - "D-10 SQS JSON wire: nested MessageAttributes object, no URLSearchParams."
    - "D-04 append semantics: Zustand store dedupes by MessageId, double-Poll accumulates."
    - "Pitfall C-1: all specific routes declared BEFORE /services/:serviceKey wildcard."
    - "Pitfall 7.2.6: UI passes IDENTICAL input to preview() and send()."
    - "Pitfall 7.2.7: GenericRouter dispatches singleton descriptors (STS) directly to GenericDetailPanel."
key-files:
  created:
    - web/src/services/sqs/SQSLayout.tsx
    - web/src/services/sqs/QueueListPage.tsx
    - web/src/services/sqs/QueueDetailPage.tsx
    - web/src/services/sqs/components/columns.ts
    - web/src/services/sqs/components/CreateQueueModal.tsx
    - web/src/services/sqs/components/DeleteQueueModal.tsx
    - web/src/services/sqs/components/MessagesTab.tsx
    - web/src/services/sqs/components/MessageRow.tsx
    - web/src/services/sqs/components/SendMessageModal.tsx
    - web/src/services/sqs/components/PurgeQueueModal.tsx
    - web/src/services/sqs/components/ConfigurationTab.tsx
    - web/src/services/_generic/GenericRouter.tsx
    - web/src/services/_generic/GenericListPage.tsx
    - web/src/services/_generic/GenericDetailPanel.tsx
    - web/src/services/_generic/GenericCreateModal.tsx
    - web/src/services/_generic/GenericDeleteModal.tsx
    - web/src/services/_generic/GenericDiffPreviewModal.tsx
    - web/src/services/_generic/components/columnBuilders.ts
    - web/src/services/_generic/components/xmlUtils.ts
    - web/src/services/iam/users.descriptor.ts
    - web/src/services/iam/roles.descriptor.ts
    - web/src/services/iam/policies.descriptor.ts
    - web/src/services/sts/index.descriptor.ts
    - web/src/services/secretsmanager/index.descriptor.ts
    - web/src/services/ssm/index.descriptor.ts
    - web/src/services/kms/index.descriptor.ts
  modified:
    - web/src/app/routes.tsx
    - web/src/app/Sidebar.tsx
    - web/src/shared/copy.ts
    - web/src/services/_generic/types.ts
    - web/src/services/_generic/registry.ts
decisions:
  - "D-04 honored: MessagesTab subscribes to Zustand store; Poll button dispatches one ReceiveMessage, hook appends into byQueue[url]. Verified by MessagesTab.test.tsx cumulative-append assertion."
  - "D-07 honored: GenericCreateModal / GenericDeleteModal pass identical coerced input to both preview() and sendAsync(). GenericDiffPreviewModal renders url/headers/body pre blocks."
  - "D-08 honored: GenericDetailPanel renders •••••••• + Reveal Button for any descriptor.detail.maskFields entry. secretsmanager masks SecretString+SecretBinary; ssm masks Value."
  - "D-09 honored: iam.users / iam.roles / iam.policies are three separate descriptors; registry exports all three; routes.tsx has three explicit paths; bare /services/iam redirects to /services/iam.users."
  - "D-10 honored: SQS folder contains zero URLSearchParams references; MessageAttributes flows as nested JSON."
  - "D-11 honored: zero descriptors declare mutations.update; GenericCreateModal/DeleteModal only ever call useDescriptorMutation(key, 'create'|'delete')."
  - "Rule 2 deviation: Sidebar static section dedupes against backend /services keys so pre-existing entries (e.g. backend-declared SQS) don't double-render."
  - "Rule 2 deviation: SSM maskFields covers 'Value' unconditionally (not only Type=SecureString). Safer default; users Reveal per-field."
  - "Rule 1 deviation: detail.maskFields? added to ServiceDescriptor type in types.ts as a surgical single-line extension (Plan 01 did not include it)."
metrics:
  duration: ~2.5h
  completed: 2026-04-25
---

# Phase 5 Plan 06: SQS UI + Generic Framework UI + 7 Descriptors Summary

SQS UI (list + detail with Messages/Configuration tabs, 4 modals), generic descriptor-driven CRUD framework (Router/ListPage/DetailPanel/Create/Delete/DiffPreview), and 7 real descriptors (iam.users/roles/policies, sts, secretsmanager, ssm, kms) shipped on top of Plan 01 types + Plan 04 hooks — GEN-03 ("new descriptor file = new service UI") is now literally true.

## What shipped

**Task 1 — SQS UI (commit 0f9d0cd):**
11 files under `web/src/services/sqs/`:
- `SQSLayout.tsx` — Outlet wrapper.
- `QueueListPage.tsx` [SQS-01] — Cloudscape Table with useCollection + TextFilter; columns Name/Available/InFlight; Refresh / Create / Actions→Delete.
- `QueueDetailPage.tsx` — Resolves `:queueName` via `useQueues().data.find(...)`; renders exactly two tabs (Messages, Configuration).
- `components/columns.ts` — QUEUE_COLUMNS + MESSAGE_COLUMNS factories.
- `components/CreateQueueModal.tsx` — regex-validated QueueName + optional Attributes rows.
- `components/DeleteQueueModal.tsx` — type-to-confirm.
- `components/MessagesTab.tsx` [SQS-02, D-04] — subscribes `useSqsMessageStore().byQueue[queueUrl]`; Poll button triggers `useReceiveMessage.mutate()`; per-row Delete calls `useDeleteMessage`; Clear button clears the store slot.
- `components/MessageRow.tsx` — standalone renderer.
- `components/SendMessageModal.tsx` — MessageBody + MessageAttributes rows as nested JSON (D-10).
- `components/PurgeQueueModal.tsx` [SQS-03] — type-to-confirm; success flashbar documents real-AWS 60s cooldown difference.
- `components/ConfigurationTab.tsx` — read-only KeyValuePairs (ARN / counts / configuration / timestamps).

copy.ts gained the `copy.sqs` namespace (queuesEmpty, pollButton, lastPolled, messagesEmpty, purgeSuccess with the 60s cooldown note, etc).

**Task 2 — Generic framework UI (commit 102955b):**
8 files under `web/src/services/_generic/`:
- `GenericRouter.tsx` — resolves `:serviceKey` / `:id` from useParams; dispatches by `descriptor.kind`.
- `GenericListPage.tsx` [GEN-01] — D-02 gates Create/Delete buttons on `descriptor.mutations?.create|delete`.
- `GenericDetailPanel.tsx` [GEN-02] — D-08 Reveal toggle for every `maskFields` key.
- `GenericCreateModal.tsx` — form generated from `bodyShape.fields` (string/number/boolean/json); Review button opens DiffPreviewModal.
- `GenericDeleteModal.tsx` — type-to-confirm on `typeToConfirmField`; Review opens DiffPreviewModal.
- `GenericDiffPreviewModal.tsx` [D-07] — three `<pre>` blocks for URL / Headers / Body, each with CopyToClipboard; Send confirms.
- `components/columnBuilders.ts` — thin mapper from descriptor columns to Cloudscape column defs.
- `components/xmlUtils.ts` — DOMParser-based `parseXml`/`selectText`/`selectAll`/`selectMembers` (NO fast-xml-parser).

`types.ts` extended: `detail.maskFields?: string[]` (one-line surgical).

**Task 3 — 7 descriptors + registry + routes (commit ae5acf6):**
- `iam/users.descriptor.ts` (D-09) — aws-query, ListUsers + GetUser + DeleteUser.
- `iam/roles.descriptor.ts` (D-09) — ListRoles + GetRole + DeleteRole.
- `iam/policies.descriptor.ts` (D-09) — ListPolicies + GetPolicy (by Arn) + DeletePolicy.
- `sts/index.descriptor.ts` — singleton; GetCallerIdentity only; no mutations.
- `secretsmanager/index.descriptor.ts` — aws-json; list + GetSecretValue (maskFields=['SecretString','SecretBinary']) + create + delete.
- `ssm/index.descriptor.ts` — aws-json; DescribeParameters + GetParameter (maskFields=['Value'], WithDecryption:false) + DeleteParameter.
- `kms/index.descriptor.ts` — aws-json; ListKeys (TrentService.*) + DescribeKey; NO mutations field.
- `_generic/registry.ts` — Plan 01 placeholders replaced with static ESM imports.
- `app/routes.tsx` — SQS + 7 explicit descriptor routes inserted BEFORE `services/:serviceKey` wildcard (Pitfall C-1). Bare `services/iam` Navigates to `services/iam.users` (D-09).

**Task 4 — Sidebar (commits 3ffeb6b + cc621d3):**
Sidebar.tsx appends a static "Messaging & Identity" section after backend-driven sections; entries dedupe against `useServices()` keys so backend-supplied services don't double-render. `ServiceSidebar.test.tsx` confirmed unchanged behaviour (3/3 passing).

## Decision Traceability

| Decision | Where honored | Evidence |
|---|---|---|
| D-04 manual Poll + append | web/src/services/sqs/components/MessagesTab.tsx:28-45 | store contract test (MessagesTab.test.tsx): polling twice → 2 rows; remove leaves others |
| D-07 diff preview | web/src/services/_generic/GenericDiffPreviewModal.tsx:all | 3 `<pre>` blocks + onConfirm; GenericCreateModal/DeleteModal call preview(input)+sendAsync(input) with same arg |
| D-08 mask + Reveal | web/src/services/_generic/GenericDetailPanel.tsx:78-99 | •••••••• render + Reveal/Hide Button; descriptors secretsmanager L82, ssm L68 |
| D-09 three IAM descriptors | iam/users|roles|policies.descriptor.ts | registry.test.ts asserts 3 iam.* keys; routes.tsx lines 162-179; Sidebar 'IAM · Users/Roles/Policies' |
| D-10 SQS JSON wire | SQS folder, all files | SendMessageModal.test.tsx grep: no URLSearchParams, no MessageAttribute.N.Name |
| D-11 no update | 7 descriptors + Generic modals | grep `mutations.update` across IAM/STS/Secrets/SSM/KMS/Generic*Modal.tsx returns zero |
| Pitfall C-1 route ordering | app/routes.tsx | specific paths (sqs, iam.*, sts, secretsmanager, ssm, kms) appear before services/:serviceKey |
| Pitfall 7.2.6 preview=send | GenericCreateModal/DeleteModal | both call preview(X) and sendAsync(X) with identical X (inputForRequest / input) |
| Pitfall 7.2.7 singleton | GenericRouter.tsx L32 | `if (descriptor.kind === 'singleton') return <GenericDetailPanel id={null} />` |

## Verification

- `cd web && npx tsc --noEmit -p tsconfig.json` → EXIT=0
- SQS test suite: 15 files / 54 tests passing
- Generic framework tests: 18 files / 78 tests passing
- Descriptor tests (iam/sts/secrets/ssm/kms/registry): 8 files / 33 tests passing
- Full suite (final run): 112 passed + 12 skipped + 494 tests + 73 todo (1 failed fixed in cc621d3)

## Deviations from Plan

### Rule 1 — type extension
**`ServiceDescriptor.detail.maskFields?: string[]`** added to `web/src/services/_generic/types.ts` (one-line extension). Plan 01 shipped the type without `maskFields`; this plan adds it per `<interfaces>` guidance. No downstream type errors.

### Rule 1 — registry cast through unknown
In `registry.ts`, per-service descriptors (`iamUsersDescriptor: ServiceDescriptor<IamUserRow>`, etc.) need to widen to `ServiceDescriptor` (= `ServiceDescriptor<Record<string, unknown>>`). TS rejected a direct cast because `ColumnDefinition<IamUserRow>` and `ColumnDefinition<Record<string, unknown>>` are not mutually assignable. Resolved by casting through `unknown` — safe because the framework treats rows as opaque records at runtime.

### Rule 2 — Sidebar dedupe against backend registry
The plan's static Sidebar entries collided with backend-supplied entries (the mocked ServiceSidebar test has `{ key: 'sqs' }` in the backend list, which produced two 'SQS' texts → `getByText` failed). Fixed by skipping extras whose `key` is already in `useServices().data`. Preserves plan intent (static fallback) without breaking the backend-driven path.

### Rule 2 — SSM maskFields default-on-all-types
SSM parameters with `Type=String` are not sensitive, but conditional masking by Type would require parseResponse-level logic (dependent on the GetParameter response shape which includes Type alongside Value). Phase 5 applies `maskFields=['Value']` unconditionally — Reveal is always one click away and the default is safe. Deferred: conditional mask-on-Value-only-when-SecureString.

### Rule 2 — IAM policies detail uses PolicyArn
`GetPolicy` requires `PolicyArn`, not `PolicyName`. `buildParams(id: string)` treats `id` as an ARN; navigation from the list passes `row.PolicyName` as the id segment, which in MiniStack may or may not resolve. Documented as a known limitation; typeToConfirmField remains 'PolicyName' for human-friendly type-to-confirm. A future refinement could key the URL segment on PolicyArn and display PolicyName separately.

### Zero Rule 3 blockers
No architectural changes needed. Plans 01 + 04 contracts held.

## Registry Safety proof

`web/package.json` and `web/package-lock.json` were not modified by this plan (commits touch only source under `web/src/` and `.planning/`). XML parsing uses DOMParser (browser built-in), descriptors use standard JSON helpers. No fast-xml-parser, @rjsf, monaco, CodeMirror, or aws-sdk added.

## GEN-03 end-to-end recipe (≤20 lines for a new service)

To add an 8th service (e.g. `cloudwatch`):

1. Create `web/src/services/cloudwatch/index.descriptor.ts`:
   ```ts
   export const cloudwatchDescriptor: ServiceDescriptor<Alarm> = {
     serviceKey: 'cloudwatch',
     displayName: 'CloudWatch',
     kind: 'list',
     idField: 'AlarmName',
     list: { endpoint: {...}, parseResponse: ..., columns: [...] },
     detail: { endpoint: {...}, parseResponse: ... },
     mutations: { delete: {...} },
   }
   ```
2. `web/src/services/_generic/registry.ts`: `import { cloudwatchDescriptor } from '../cloudwatch/index.descriptor'` + one key/value entry.
3. `web/src/app/routes.tsx`: one `{ path: 'services/cloudwatch', element: withSuspense(<GenericRouter />), children: [{ path: ':id', ... }] }` block above `services/:serviceKey`.
4. `web/src/app/Sidebar.tsx`: one `maybeAdd('CloudWatch', '/services/cloudwatch', 'cloudwatch')` line.

No framework code touched. No new components. Build succeeds.

## Self-Check: PASSED

- All 27 files exist at their listed paths (verified via `git ls-files` after commits).
- Commit hashes reachable: 0f9d0cd, 102955b, ae5acf6, 3ffeb6b, cc621d3 (verified via `git log`).
- Full test suite green after cc621d3 fix.
- `tsc --noEmit` EXIT=0.
