---
phase: 05-dynamodb-sqs-generic
plan: 05
subsystem: ddb-ui
tags: [ddb, cloudscape, tanstack-query, crud, scan, lek-stack, scalars-d06, form-json-toggle-d03]
requirements: [DDB-01, DDB-02, DDB-03]
dependency_graph:
  requires:
    - Plan 05-02 (DDB types, ddbClient, ddbKeys, attributeValue codec)
    - Plan 05-04 (DDB hooks — useTables/useTable/useScan + 5 mutations)
    - Phase 4 Lambda (RelativeTime, PayloadEditor pattern, FlashNotifications, SplitPanelContext)
  provides:
    - "/services/ddb + /services/ddb/:tableName routes (Pitfall C-1 ordering)"
    - DDB copy namespace (~90 entries covering list + detail + CRUD + config)
    - TableListPage with DescribeTable fan-out (per-row status / items / size / created)
    - TableDetailPage 2-tab shell (Items, Configuration) — no Triggers/Test (divergence from Phase 4 intentional)
    - ItemsTab with LEK stack pagination (Pitfall 7.2.2) + dynamic columns + SplitPanel JSON view
    - ConfigurationTab — read-only KeySchema / AttributeDefinitions / GSI section (GSI UI deferred)
    - ItemForm (D-06 scalars only — S/N/B/BOOL/NULL) + ItemJsonEditor (JSON escape hatch)
    - PutItemModal with SegmentedControl Form↔JSON toggle (D-03)
    - DeleteItemModal — type-to-confirm compound primary-key value
  affects:
    - Plan 05-06 (SQS UI + Generic UI) inherits the 2-tab detail pattern + SplitPanel row-click convention

tech_stack:
  added: []
  patterns:
    - "LEK stack pagination: stack<DdbItem[]>; filter change MUST reset stack (Pitfall 7.2.2)"
    - "Dynamic columns derived from KeySchema + items.flatMap(Object.keys) union"
    - "SegmentedControl for Form↔JSON mode (D-03) with round-trip safety — JSON→Form only when every value is a scalar AttributeValue"
    - "Raw JSON PutItem path bypasses usePutItem marshal; mirrors predicate invalidation inline (Pitfall C-3)"
    - "Compound type-to-confirm: Object.values(itemKey).map(renderAttributeValue).join('#')"
    - "DescribeTable fan-out via useQueries for per-row list enrichment"

key_files:
  created:
    - web/src/services/ddb/DDBLayout.tsx
    - web/src/services/ddb/TableListPage.tsx
    - web/src/services/ddb/TableListPage.test.tsx
    - web/src/services/ddb/TableDetailPage.tsx
    - web/src/services/ddb/TableDetailPage.test.tsx
    - web/src/services/ddb/components/columns.ts
    - web/src/services/ddb/components/columns.test.ts
    - web/src/services/ddb/components/CreateTableModal.tsx
    - web/src/services/ddb/components/CreateTableModal.test.tsx
    - web/src/services/ddb/components/DeleteTableModal.tsx
    - web/src/services/ddb/components/DeleteTableModal.test.tsx
    - web/src/services/ddb/components/ItemsTab.tsx
    - web/src/services/ddb/components/ItemsTab.test.tsx
    - web/src/services/ddb/components/ConfigurationTab.tsx
    - web/src/services/ddb/components/ConfigurationTab.test.tsx
    - web/src/services/ddb/components/ItemForm.tsx
    - web/src/services/ddb/components/ItemForm.test.tsx
    - web/src/services/ddb/components/ItemJsonEditor.tsx
    - web/src/services/ddb/components/ItemJsonEditor.test.tsx
    - web/src/services/ddb/components/PutItemModal.tsx
    - web/src/services/ddb/components/PutItemModal.test.tsx
    - web/src/services/ddb/components/DeleteItemModal.tsx
    - web/src/services/ddb/components/DeleteItemModal.test.tsx
  modified:
    - web/src/app/routes.tsx             # inserted DDB route block BEFORE services/:serviceKey (Pitfall C-1)
    - web/src/shared/copy.ts             # appended ddb namespace

decisions:
  - "DDB detail page is 2-tab (Items, Configuration); no Triggers/Test tab — DDB has no equivalent surface (locked divergence from Phase 4 Lambda 4-tab)."
  - "ItemsTab stores LEK as `DdbItem[]` stack, not stringified tokens (Pitfall 7.2.2). Filter change resets the stack — preserves backend invariant that ESK must be valid for the current FilterExpression."
  - "PutItemModal's JSON mode bypasses usePutItem and calls ddbJsonCall directly rather than creating a new putItemRaw hook. Rationale: raw-JSON Put is an escape hatch for complex types (L/M/SS/NS/BS), not a primary API worth its own reusable hook. Predicate invalidation is mirrored inline."
  - "Form↔JSON round-trip: JSON→Form is safe only when every top-level value is a scalar AttributeValue; otherwise a warning banner appears and the editor stays in JSON mode (D-06 boundary)."
  - "D-07 JSON diff preview intentionally skipped for native DDB page per 05-CONTEXT.md D-07 scope ('native pages skip preview — forms already specific')."
  - "Delete compound-key confirm string: Object.values(itemKey).map(renderAttributeValue).join('#') — '#' separator because DDB attribute values never contain it by themselves in MiniStack fixtures; sufficient mnemonic disambiguator."

metrics:
  tasks_completed: 3
  commits:
    - 42d3200 feat(05-05): DDB routes + TableListPage + Create/Delete table modals (DDB-01)
    - 9cc94d9 feat(05-05): TableDetailPage 2-tab shell + ItemsTab + ConfigurationTab (DDB-02)
    - 8761144 feat(05-05): ItemForm (D-06) + PutItemModal (D-03 toggle) + DeleteItemModal + wire (DDB-03)
  files_created: 23
  files_modified: 2
  test_count_full_ddb_suite: 96
  test_count_new_this_plan: 39
  typescript_errors: 0
  npm_deps_added: 0
  duration_hours: ~1.5
  completed_date: 2026-04-24
---

# Phase 5 Plan 05: DynamoDB UI Summary

**One-liner:** DynamoDB UI surface — list/create/delete tables + 2-tab detail with LEK-stack scan pagination and D-03 form/JSON toggle per-item CRUD, powered by the Plan 05-04 hook layer.

## What shipped

### DDB-01 — Table list & lifecycle (Task 1, commit 42d3200)

- `/services/ddb` route inserted BEFORE `services/:serviceKey` wildcard (Pitfall C-1). `awk` invariant L=143 < S=158.
- `TableListPage`: Cloudscape `Table` + `useCollection` + `TextFilter` + `CollectionPreferences`. Columns = Name (Link), Status, Items (locale-formatted), Size, Created (`RelativeTime` reuse from Phase 4).
- `useQueries` fan-out of `DescribeTable` populates per-row status / items / size / created from the same cache keys (`ddbKeys.table(name)`) that the detail page uses — a table visited from the list hits cache.
- `CreateTableModal`: Table name regex `/^[a-zA-Z0-9_.-]{3,255}$/`, PK (name + S/N/B) + optional SK toggle + BillingMode `RadioGroup` (`PAY_PER_REQUEST` default, conditional RCU/WCU under `PROVISIONED`). Reset-on-open (`useEffect([visible])`) per Plan 03-03 Rule 2 learning. Dispatches through `useCreateTable` whose input shape is `{TableName, hashKey: {name,type}, sortKey?, billingMode?, rcu?, wcu?}` — **not** pre-marshaled AttributeDefinitions/KeySchema (the hook owns that translation).
- `DeleteTableModal`: type-to-confirm exact table-name match, mirrors `DeleteFunctionModal`.

### DDB-02 — Detail page + scan (Task 2, commit 9cc94d9)

- `TableDetailPage` replaces Task 1 stub. Renders BreadcrumbGroup + H1 with `CopyToClipboard` + Cloudscape `Tabs` with **exactly two** tabs — `items`, `configuration`. No Triggers/Test tab (DDB has no equivalent surface; divergence from Phase 4 Lambda 4-tab structure is intentional and locked).
- `ItemsTab`:
  - Scan controls: `FilterExpression` Input + `Run scan` Button. Typing doesn't refetch — only committing via Run does.
  - **LEK stack pagination** (`stack: DdbItem[]`). Current ESK = `stack[stack.length-1]`. Prev pops, Next pushes `data.LastEvaluatedKey`. Filter change resets the stack to `[]` (Pitfall 7.2.2 — ESK valid under filter A isn't valid under filter B).
  - Dynamic columns via `buildItemColumns(keySchema, observedAttrs)` — key attrs first with `(key)` suffix, then union of observed attr names alpha-sorted.
  - Row selection opens SplitPanel with `JSON.stringify(row, null, 2)` — raw wire shape preserved so power users see `N`-as-string truth (Pitfall 7.2.1).
- `ConfigurationTab`: read-only KeyValuePairs (status, billing, creation time via `RelativeTime`, ARN, items/size, conditional RCU/WCU) + KeySchema Table (HASH/RANGE StatusIndicators) + AttributeDefinitions Table + GSI section ("No secondary indexes" when empty). **Zero** `onClick`/`onSubmit` handlers — strict read-only per 05-CONTEXT deferred ideas.

### DDB-03 — Per-item CRUD (Task 3, commit 8761144)

- `ItemForm` (D-06 scalars-only): EXACTLY 5 type options (S, N, B, BOOL, NULL) — source-level doc comment asserts scope; grep invariant `grep -cE '"L"|"M"|"SS"|"NS"|"BS"' == 0`. Fixed (name-disabled) rows per KeySchema entry + free-form `Add attribute` rows (default type S per Pitfall 7.10). Per-type value controls: S→text Input, N→numeric Input (value STORED as string — Pitfall 7.2.1, no `Number(value)`), B→text Input, BOOL→Toggle, NULL→inactive Box. Emits `{ [name]: {type, value} }` map + validity via `onChange` callback.
- `ItemJsonEditor`: Cloudscape Textarea + realtime `JSON.parse` validation. Fires `onChange(text, parsed, valid)` on every edit and once on mount (initial validity).
- `PutItemModal`: SegmentedControl `Form | JSON` (D-03).
  - Form→JSON transition seeds Textarea with `JSON.stringify(formToItem(formValues), null, 2)` — users can tweak wire shape.
  - JSON→Form transition succeeds only when every top-level value is a scalar AttributeValue (`'S'|'N'|'B'|'BOOL'|'NULL'` key with one-key shape). Otherwise the UI stays in JSON mode and surfaces a warning banner.
  - Form submit → `usePutItem().mutate(formValues)` (hook marshals; N preserved as string).
  - JSON submit → `ddbJsonCall('PutItem', {TableName, Item: parsed})` direct, then inline `qc.invalidateQueries({predicate: ddb prefix + tableName})` mirroring `usePutItem`'s C-3 invalidation.
  - D-07 JSON diff preview intentionally skipped per CONTEXT D-07 scope ("native pages skip preview").
- `DeleteItemModal`: type-to-confirm by `Object.values(itemKey).map(renderAttributeValue).join('#')` — compound-key stringification. Disables Delete until exact match.
- `ItemsTab` wires Put/Edit/Delete buttons + Flashbar via `useFlashNotifications`.

## Architecture notes

### Why `useQueries` fan-out in TableListPage
Backend `ListTables` returns only `TableNames[]`. Columns demand status/items/size/created which live in `DescribeTable.Table`. `useQueries` with `ddbKeys.table(name)` keys yields:
- Shared cache with TableDetailPage's `useTable(name)` — navigating into a table that was visible in the list is instant.
- Per-row loading doesn't block the list; names render immediately, columns populate as each DescribeTable resolves.
- `staleTime: 10_000` avoids stampeding re-fetches when the list is refocused.

### Why divergence from Phase 4's 4-tab structure
Lambda tabs (Configuration / Environment / Triggers / Test) map to distinct concerns — function metadata, runtime env vars, event-source mappings, and invocation. DDB has no equivalent of Triggers (DDB Streams are deferred per CONTEXT) or Test (there's no concept of "invoke a table"). Two tabs — Items (the data) and Configuration (the schema) — match the surface one-to-one.

### Why the LEK is a map, not a string
AWS SDKs treat `LastEvaluatedKey` as an opaque token in many languages, but the DDB wire protocol requires a MAP of `AttributeValue`s. Stringifying the LEK for URL/state and then parsing it back was tempting but error-prone — round-tripping through `JSON.stringify/parse` works only if the wire shape is pure JSON (which DDB's is, but binary attrs are base64 already). To avoid future footguns (and to match the shape `useScan` emits), the stack stores the map verbatim. `ddbKeys.scan` stringifies **only for the query key** (to keep it stable) — the body sees the map.

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 2 — Missing API adaptation] `CreateTableInput` shape**
- **Found during:** Task 1 (CreateTableModal wiring)
- **Issue:** The plan's `<interfaces>` spec showed `useCreateTable` taking pre-marshaled `{TableName, AttributeDefinitions, KeySchema, BillingMode, ProvisionedThroughput?}`, but the actual Plan 05-04 hook takes a higher-level `{TableName, hashKey: {name, type}, sortKey?, billingMode?, rcu?, wcu?}` — the hook owns AttributeDefinitions/KeySchema construction internally.
- **Fix:** Adapted CreateTableModal to send the simpler shape.
- **Files modified:** `web/src/services/ddb/components/CreateTableModal.tsx`
- **Commit:** 42d3200

**2. [Rule 2 — Missing API adaptation] SplitPanel context API**
- **Found during:** Task 2 (ItemsTab wiring)
- **Issue:** Plan assumed `splitPanel.setContent(node)`, but the existing `SplitPanelContext` exports `setPanel(panel, header)` plus `useSplitPanel()` hook (not a raw context consumer).
- **Fix:** Used `useSplitPanel().setPanel(<pre>…</pre>, 'Item details')`.
- **Files modified:** `web/src/services/ddb/components/ItemsTab.tsx`
- **Commit:** 9cc94d9

**3. [Rule 2 — Missing API adaptation] Flash notifications method names**
- **Found during:** Task 1
- **Issue:** Plan used `pushSuccess`/`pushError`; actual `useFlashNotifications` exports `addSuccess`/`addError`.
- **Fix:** Used `add*` throughout.
- **Files modified:** TableListPage, ItemsTab
- **Commits:** 42d3200, 8761144

### Documented Deviations (Rule 2)

**4. No `putItemRaw.ts` hook file**
- **Reason:** Raw-JSON Put is an escape hatch for complex AttributeValue types (L/M/SS/NS/BS) that the scalar form blocks. It's not a primary API worth a dedicated hook — a one-line `ddbJsonCall('PutItem', ...)` + inline predicate invalidation mirroring `usePutItem`'s C-3 pattern keeps the file count at 12 and avoids a thin wrapper.
- **Files:** `web/src/services/ddb/components/PutItemModal.tsx` (JSON branch)
- **Consistent with:** plan's `<deviation_framework>` Rule 2 which explicitly sanctioned this choice.

### Not deviations — plan-spec compliance

- CreateTableModal uses `RadioGroup` for BillingMode (plan permitted `Tiles` alternative under Rule 1).
- PutItemModal uses `SegmentedControl` for Form/JSON toggle (plan permitted `Tabs` alternative under Rule 1).

## Verification evidence

### Automated

- `cd web && npm run test -- src/services/ddb --run` — **96/96 passed** (24 test files, 39 new assertions this plan).
- `cd web && npx tsc --noEmit -p tsconfig.json` — **0 errors**.
- Registry Safety: `git diff 0e93b52..HEAD -- web/package.json` → empty.
- `grep -cE "Monaco|CodeMirror|@rjsf|fast-xml-parser|aws-sdk" web/src/services/ddb/` → **0** (no forbidden deps).

### Grep invariants

| Check | Expected | Actual |
|-------|----------|--------|
| Route ordering (awk DDB-before-wildcard) | pass | pass (L=143, S=158) |
| `services/ddb` references in routes.tsx | ≥2 | 4 |
| `ddb:` namespace in copy.ts | ≥1 | 1 |
| `RelativeTime` in columns.ts | ≥1 | 1 |
| `renderAttributeValue` in columns.ts | ≥1 | 1 |
| 2-tab shell (`id: 'items'`/`id: 'configuration'`) | ≥2 | 2 |
| No `id: 'triggers'`/`id: 'test'` | 0 | 0 |
| `setStack([])` in ItemsTab (filter reset) | ≥1 | 1 |
| `LastEvaluatedKey` in ItemsTab | ≥1 | 4 |
| `buildItemColumns` in ItemsTab | ≥1 | 2 |
| `onClick`/`onSubmit` in ConfigurationTab (read-only) | 0 | 0 |
| `scalars-only` doc comment in ItemForm | ≥1 | 1 |
| `"L"\|"M"\|"SS"\|"NS"\|"BS"` literals in ItemForm | 0 | 0 |
| `Number(value)` in ItemForm (Pitfall 7.2.1) | 0 | 0 |
| `useDeleteItem` in DeleteItemModal | ≥1 | 2 |
| `PutItemModal`/`DeleteItemModal` wired in ItemsTab | ≥2 | 4 |

### Regression tests (new)

- **ItemsTab LEK map invariant:** `expect((esk as {pk:{S:string}}).pk).toEqual({S:'a'})` verifies Next click sends `ExclusiveStartKey` as a MAP, not a stringified token (Pitfall 7.2.2).
- **ItemsTab filter-reset regression:** After Next (ESK set) → change filter + Run scan → third request has **no** `ExclusiveStartKey` key.
- **CreateTableModal billing modes:** Default submit has no `ProvisionedThroughput`; switching to PROVISIONED sends `{ReadCapacityUnits:5, WriteCapacityUnits:5}`.
- **PutItemModal N-as-string:** Form submit with initialItem `{total:{N:'42'}}` sends body Item with `total: {N: '42'}` (string, not number).
- **DeleteItemModal compound-key confirm:** Typing `c-1#2026-04-01` enables Delete for `{pk:{S:'c-1'}, sk:{S:'2026-04-01'}}`.

## Deferred Issues

None. All plan acceptance criteria satisfied.

## Known Stubs

None. Every component's data source is wired to a real hook or context.

## Self-Check: PASSED

Verified via file existence + commit log:

- All 23 created files exist under `web/src/services/ddb/`.
- `web/src/app/routes.tsx` and `web/src/shared/copy.ts` modified (extended, not replaced).
- Commits 42d3200, 9cc94d9, 8761144 all present in `git log --oneline`.
- `git diff 0e93b52..HEAD -- web/package.json` empty (Registry Safety).
