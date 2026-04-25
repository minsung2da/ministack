---
phase: 5
phase_name: dynamodb-sqs-generic
phase_slug: dynamodb-sqs-generic
requirements: [DDB-01, DDB-02, DDB-03, SQS-01, SQS-02, SQS-03, GEN-01, GEN-02, GEN-03]
created: 2026-04-20
depends_on: [Phase 4]
---

# Phase 5 Context: DynamoDB, SQS & Generic Service Framework

## Phase Goal (from ROADMAP.md)

Users can manage DynamoDB tables/items and SQS queues/messages, **and** the schema-driven generic framework can render any new service UI from a descriptor without custom code.

## Domain Scouting

### Backend (already built)
- `ministack/services/dynamodb.py` — 1,879 lines: CreateTable, DescribeTable, ListTables, Scan, Query, GetItem, PutItem, UpdateItem, DeleteItem, BatchWriteItem, GSI/LSI support, conditional expressions, item attribute type coercion
- `ministack/services/sqs.py` — 1,292 lines: CreateQueue, ListQueues, GetQueueAttributes, GetQueueUrl, SendMessage, ReceiveMessage, DeleteMessage, DeleteMessageBatch, PurgeQueue, visibility timeout, long polling
- For the 5 generic-framework services (IAM, STS, Secrets Manager, SSM, KMS): every backend module exposes ListX + GetX — descriptor framework will call these via the service-detection path at `ministack/app.py`

### Frontend patterns to reuse (Phase 2/3/4)
- Cloudscape 3.x + TanStack Query 5 + Zustand, **no new npm deps** (Registry Safety)
- SplitPanel for detail view, Flashbar for notifications
- Type-to-confirm modals for destructive actions (Phase 2 `DeleteModal` / Phase 3 `DeleteBucketModal` template)
- Payload editor pattern from Phase 4 (Cloudscape Textarea + realtime JSON.parse validation)
- Route ordering: `/services/{specific-svc}` routes registered BEFORE `/services/:serviceKey` wildcard
- Plan 00 Wave 0 test scaffolding convention — MSW handlers + test.todo() stubs for every module in File Inventory

## Locked Decisions (discussion output)

### D-01 — Schema format: TypeScript descriptor modules
Each service that opts into the generic framework exports a `ServiceDescriptor` from `web/src/services/{svc}/descriptor.ts`:

```ts
export interface ServiceDescriptor {
  serviceKey: string            // matches ministack route, e.g. 'iam', 'secretsmanager'
  displayName: string
  list: {
    endpoint: string            // REST path fragment
    parseResponse: (data: unknown) => ResourceRow[]
    columns: ColumnDefinition[]
  }
  detail?: {
    endpoint: (id: string) => string
    parseResponse: (data: unknown) => Record<string, unknown>
  }
  mutations?: {                 // optional — presence enables CRUD UI per D-02
    create?: { endpoint: string, bodyShape: Record<string, unknown> }
    delete?: { endpoint: (id: string) => string, typeToConfirmField: string }
  }
}
```

**Why:** Type safety catches shape drift at compile time; IDE autocomplete speeds descriptor authoring; no JSON parse/version overhead. Cost — descriptors require rebuild to load (acceptable: MiniStack is local dev, rebuild is seconds).

### D-02 — Generic framework scope: CRUD when descriptor declares mutations
The generic framework inspects `descriptor.mutations` at runtime:
- If `mutations` is absent → read-only UI (list + detail JSON view only). Use for KMS keys, STS session info, etc. where console-parity writes aren't needed.
- If `mutations.create` is present → "Create" button in list page appears, form generated from `bodyShape`.
- If `mutations.delete` is present → row-actions menu gets "Delete" with type-to-confirm.

**Why:** GEN-03 promises "add descriptor → UI appears". Per-descriptor CRUD toggle lets each service opt into the right amount of functionality without forking the generic components.

**Trade-off:** Write operations in generic code means more test surface — mitigated by D-07 safety preview requirement.

### D-03 — DDB item editor: Schema-based form with JSON advanced mode toggle
DDB items are rendered as **per-attribute input controls** where each field matches the attribute's DDB type (D-06 defines which types are in scope). A "JSON mode" toggle lets power users drop to raw JSON for complex cases.

**Why:** DDB is a flagship service in this phase; a form feels consoleworthy. JSON toggle preserves the escape hatch without blocking schema-based authoring.

### D-04 — SQS receive: Manual "Poll" button + accumulating response list
The SQS detail page has a "Poll" button that calls `ReceiveMessage(MaxNumberOfMessages=10, WaitTimeSeconds=0)` once per click. New messages append to a running list (not replace). Each message row shows MessageId, ApproximateReceiveCount, Body (with copy), and a "Delete" action that calls `DeleteMessage` using the ReceiptHandle.

**Why:** Manual poll is legible (user sees exactly when the API call fires). Accumulating list lets users compare successive receives. Auto-polling would risk silent message consumption or visibility-timeout confusion.

### D-05 — Phase 5 generic-framework service coverage: 5 services (IAM, STS, Secrets Manager, SSM, KMS)
These services get a `descriptor.ts` and render via the generic framework. Sufficient to:
1. Prove GEN-03 end-to-end (adding a new descriptor → new service UI).
2. Cover the highest-traffic "supporting" services operators need for local emulation workflows.
3. Keep Phase 5 test surface bounded.

All other AWS services (Cognito, Route53, SNS, CloudFormation, etc.) are deferred. Adding them later is a pure descriptor-file PR — no framework change needed. Phase 6+ can batch-add them.

### D-06 — DDB attribute types (initial set): scalars only (S, N, B, BOOL, NULL)
Schema-based form supports DDB's five scalar attribute types. Complex types (List `L`, Map `M`, String/Number/Binary Set) must use JSON advanced mode.

**Why:** 80% of DDB items in MiniStack dev usage are scalar-heavy. Nested recursive rendering is ~3× the code and bug surface. Escape hatch via JSON mode preserves completeness.

### D-07 — Generic CRUD safety: Always show JSON diff preview before write
Every Create / Update / Delete triggered through the generic framework shows a "Review request" panel with the actual JSON payload that will be sent to the backend. User clicks "Send" to confirm. Flashbar shows result.

**Why:**
- Teaches users what their edits translate to (transparent vs "magic")
- Catches input bugs before committing
- Mirrors the `aws --dry-run` mental model
- Delete modal keeps type-to-confirm on top of the JSON preview (belt + suspenders)

**Application scope:** Generic framework writes only. DDB/SQS native pages (which have richer context like DDB key schema) can skip the preview because their forms are already specific.

### D-08 — Secrets / SSM value display: masked by default with Reveal toggle
Secrets Manager secret values and SSM SecureString parameters render as `••••••••` by default, with a "Reveal" button per value that toggles to plaintext. Diverges from Lambda env-vars D-05 (which was plaintext) because these services are semantically "credentials" — shoulder-surfing risk is real in screen-sharing, even on local emulators.

### D-09 — IAM as three independent descriptors
`services/iam/users.descriptor.ts`, `services/iam/roles.descriptor.ts`, `services/iam/policies.descriptor.ts` each with `serviceKey: 'iam.users' | 'iam.roles' | 'iam.policies'`. Sidebar shows three rows under "IAM". Keeps the generic framework's "one descriptor = one page" invariant clean. `/services/iam` (bare) redirects to `iam.users`.

### D-10 — SQS wire protocol: JSON
Use SQS's `AWSJsonProtocol` shape (same pattern as DDB). Backend supports both; JSON avoids the form-encoded `Key.1.Name/Value` indexing pitfall and shares the adapter with DDB.

### D-11 — `mutations.update` deferred
Phase 5 descriptor CRUD supports Create + Delete only. Update-in-place is a follow-up. DDB-native page still has its own UpdateItem form per D-03 — the limitation applies only to generic-framework services.

## Deferred Ideas (roadmap backlog candidates)

- **DDB complex attribute types (L, M, Sets)** — first-class form UX beyond scalar + JSON toggle
- **DDB conditional expressions** — UI for `ConditionExpression`, attribute_not_exists guards
- **DDB GSI/LSI query UI** — choose index, see index-specific key schema
- **DDB Streams UI** — list shards, read records
- **SQS FIFO queues + DLQ wiring** — MessageGroupId, DeduplicationId, redrive policy
- **SQS message body transformation** — auto-pretty JSON bodies, base64 binary toggle
- **Generic framework coverage expansion** — Cognito, Route53, SNS, CloudFormation, Athena, Glue, etc.
- **Descriptor hot-reload in dev** — Vite HMR refresh when a descriptor file changes (Phase 5 requires full rebuild)
- **Generic write preview `--dry-run` to backend** — send through a backend validation step before execution
- **Resource relationship graph** — cross-service links (Lambda → SQS trigger, IAM role → Lambda)

## Downstream Agent Guidance

### For gsd-phase-researcher
Investigate and document:
- DDB REST endpoints + request/response shapes for ListTables / DescribeTable / Scan / Query / GetItem / PutItem / UpdateItem / DeleteItem (cite line numbers in `ministack/services/dynamodb.py`)
- Attribute-value wire format: `{"S": "..."}`, `{"N": "..."}`, `{"BOOL": true}`, `{"NULL": true}`, `{"B": "<base64>"}` — client must marshal/unmarshal correctly
- SQS REST endpoints + form-encoded request quirks (SQS uses query-string encoding, NOT JSON — make sure the client handles this)
- Message attributes vs message body (SendMessage's `MessageAttribute.N.Name`, `MessageAttribute.N.Value.DataType` pattern)
- ReceiptHandle lifetime + how Delete handles expired handles
- IAM/STS/Secrets Manager/SSM/KMS list endpoints for the 5 descriptor services (which paths, which JSON shapes)
- `ServiceDescriptor` registry pattern — single registry file with `Record<serviceKey, ServiceDescriptor>`? Or dynamic import from `services/*/descriptor.ts`?
- Pitfall: DDB `Scan` returns `LastEvaluatedKey` for pagination — same state-stack reset-on-filter-change pattern as S3 prefix navigation (Phase 3 Pitfall 3)
- Pitfall: SQS purge is destructive + queued behind receive (60s wait); UI must handle the in-progress state

### For gsd-planner
Locked from this document:
- **3 major subsystems** deserving separate plans:
  1. DynamoDB (tables/items/scan/query/CRUD form per D-03/D-06)
  2. SQS (queues/messages/manual poll per D-04/purge)
  3. Generic framework (descriptor type, 5 service descriptors D-05, CRUD via mutations D-02, JSON diff preview D-07)
- **Shared components** live under `web/src/shared/generic/` or `web/src/services/_generic/`:
  - `ServiceDescriptor` type
  - `GenericListPage`, `GenericDetailPanel`, `GenericCreateModal`, `GenericDeleteModal`, `GenericDiffPreviewModal`
- Every service gets its own route under `/services/{serviceKey}` (specific + generic coexist — DDB/SQS use specific, the 5 supporting services use generic)
- Wave 0 test scaffolding matches Phase 3/4 pattern: MSW handlers + test.todo stubs across all new modules
- Registry Safety grep check in every plan

### Claude's Discretion (no user decision needed)
- Small file split per CLAUDE.md conventions
- Exact folder structure under `web/src/services/_generic/`
- Copy catalog additions (Phase 2+ pattern)
- Error flashbar phrasing for each mutation type
- MSW fixture JSON structure (just enough to exercise parsers)
- Empty-state copy per service
