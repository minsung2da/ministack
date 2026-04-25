---
phase: 05-dynamodb-sqs-generic
plan: 04
subsystem: hooks-layer
tags: [tanstack, zustand, ddb-hooks, sqs-hooks, generic-hooks, preview-send-parity]
requirements: [DDB-01, DDB-02, DDB-03, SQS-01, SQS-02, SQS-03, GEN-01, GEN-02, GEN-03]
dependency_graph:
  requires:
    - Plan 05-01 (_generic adapters, buildRequest, genericKeys, registry skeleton)
    - Plan 05-02 (ddbJsonCall, ddbKeys, marshalScalar/unmarshalScalar, DDB types)
    - Plan 05-03 (sqsJsonCall, sqsKeys, parseSqsAttributes, SQS types)
  provides:
    - 10 DDB hooks (useTables/useTable/useScan/useDdbQuery/useItem + 5 mutations)
    - 8 SQS hooks (useQueues/useQueueAttributes + 6 mutations)
    - Zustand messageStore (D-04 — cache-neutral accumulating list)
    - 3 generic hooks (useDescriptorList/useDescriptorItem/useDescriptorMutation with preview/send parity)
    - Shared hook harness (web/src/test/hookWrapper.ts — .ts-compatible, createElement-based)
  affects:
    - Plan 05-05 (DDB UI) consumes DDB hooks
    - Plan 05-06 (SQS UI + Generic UI) consumes SQS hooks + generic hooks + messageStore
tech_stack:
  added: []
  patterns:
    - "Predicate-based invalidateQueries for multi-key single-call invalidation (Pitfall C-3 — usePutItem/useUpdateItem/useDeleteItem)"
    - "Zustand slice as TanStack-adjacent state (D-04 — messages accumulate outside the cache)"
    - "preview()/send() parity via shared specToBuildInput helper (Pitfall 7.2.6)"
    - "Singleton-aware routing: kind:'singleton' disables list, enables item on empty id (STS)"
    - "createElement-based hook harness — keeps test.todo stub files as .ts (no JSX rename churn)"
key_files:
  created:
    - web/src/services/ddb/api/useTables.ts
    - web/src/services/ddb/api/useTable.ts
    - web/src/services/ddb/api/useScan.ts
    - web/src/services/ddb/api/useQuery.ts
    - web/src/services/ddb/api/useItem.ts
    - web/src/services/ddb/api/useCreateTable.ts
    - web/src/services/ddb/api/useDeleteTable.ts
    - web/src/services/ddb/api/usePutItem.ts
    - web/src/services/ddb/api/useUpdateItem.ts
    - web/src/services/ddb/api/useDeleteItem.ts
    - web/src/services/sqs/store/messageStore.ts
    - web/src/services/sqs/store/messageStore.test.ts
    - web/src/services/sqs/api/useQueues.ts
    - web/src/services/sqs/api/useQueueAttributes.ts
    - web/src/services/sqs/api/useCreateQueue.ts
    - web/src/services/sqs/api/useDeleteQueue.ts
    - web/src/services/sqs/api/useSendMessage.ts
    - web/src/services/sqs/api/useReceiveMessage.ts
    - web/src/services/sqs/api/useDeleteMessage.ts
    - web/src/services/sqs/api/usePurgeQueue.ts
    - web/src/services/_generic/hooks/useGenericList.ts
    - web/src/services/_generic/hooks/useGenericItem.ts
    - web/src/services/_generic/hooks/useGenericMutation.ts
    - web/src/test/hookWrapper.ts
  modified:
    # 21 test.todo stubs → real passing tests
    - web/src/services/ddb/api/useTables.test.ts
    - web/src/services/ddb/api/useTable.test.ts
    - web/src/services/ddb/api/useScan.test.ts
    - web/src/services/ddb/api/useQuery.test.ts
    - web/src/services/ddb/api/useItem.test.ts
    - web/src/services/ddb/api/useCreateTable.test.ts
    - web/src/services/ddb/api/useDeleteTable.test.ts
    - web/src/services/ddb/api/usePutItem.test.ts
    - web/src/services/ddb/api/useUpdateItem.test.ts
    - web/src/services/ddb/api/useDeleteItem.test.ts
    - web/src/services/sqs/api/useQueues.test.ts
    - web/src/services/sqs/api/useQueueAttributes.test.ts
    - web/src/services/sqs/api/useCreateQueue.test.ts
    - web/src/services/sqs/api/useDeleteQueue.test.ts
    - web/src/services/sqs/api/useSendMessage.test.ts
    - web/src/services/sqs/api/useReceiveMessage.test.ts
    - web/src/services/sqs/api/useDeleteMessage.test.ts
    - web/src/services/sqs/api/usePurgeQueue.test.ts
    - web/src/services/_generic/hooks/useGenericList.test.ts
    - web/src/services/_generic/hooks/useGenericItem.test.ts
    - web/src/services/_generic/hooks/useGenericMutation.test.ts
decisions:
  - "usePutItem/useUpdateItem/useDeleteItem use a predicate-based invalidateQueries (single call matching ['ddb', <op>, tableName, …]) to satisfy Pitfall C-3 while covering BOTH scan pages and item details in one call."
  - "useItem returns `DdbItem | null` instead of `DdbItem | undefined` — TanStack Query v5 rejects `undefined` as a queryFn return value, so §1.7 'missing item' normalizes to null. Test updated accordingly."
  - "useReceiveMessage is cache-neutral — writes messages into Zustand messageStore, does NOT invalidate sqsKeys.attributes (would thrash counts on rapid poll). Configuration tab refreshes on its own cadence."
  - "useDeleteMessage + usePurgeQueue run TWO side-effects (store mutation + invalidateQueries) but only ONE invalidateQueries — Pitfall C-3 counts invalidate calls, not total side effects."
  - "Created shared hook harness at web/src/test/hookWrapper.ts using createElement so all 21 touched .test.ts stub files can stay .ts without renaming to .tsx."
  - "messageStore.append dedupes by MessageId keeping the FIRST occurrence's ReceiptHandle — under visibility-timeout churn the user-facing Delete action stays actionable against the handle they already saw."
metrics:
  duration: ~14 minutes
  tasks: 3
  files_created: 24
  tests_added: 57 + 46 + 10 = 113 passing in touched paths
  completed: 2026-04-17
---

# Phase 5 Plan 04: Hooks Layer Summary

Wired the full TanStack/Zustand hooks layer across DDB, SQS, and the generic framework — 21 new hook modules + Zustand messageStore — on top of Plans 01/02/03 primitives. Every wire-facing pitfall (7.2.1 N-as-string, 7.2.2 ESK-as-map, 7.2.3 MessageAttribute nested, 7.2.4 ReceiptHandle in body, 7.2.6 preview-send parity, 7.2.12 parallel GetQueueAttributes, C-3 single invalidate) is now closed at the layer that owns HTTP + cache. Plans 05 / 06 consume ready-made hooks and never re-implement marshalling, encoding, or invalidation logic.

## Tasks Completed

| Task | Name                                                                                  | Commit   | Files                                                                                                    |
| ---- | ------------------------------------------------------------------------------------- | -------- | -------------------------------------------------------------------------------------------------------- |
| 1    | DDB hooks — 5 queries + 5 mutations                                                   | f9a9d23  | 10 ddb hook sources + 10 real tests + shared hookWrapper                                                 |
| 2    | SQS Zustand messageStore + 2 query hooks + 6 mutation hooks                           | 9672a2d  | messageStore + 8 sqs hooks + 9 real tests                                                                |
| 3    | Generic framework hooks (useDescriptorList/useDescriptorItem/useDescriptorMutation)   | 7c5c40c  | 3 hook sources + 3 real tests                                                                            |

## What Shipped

### Task 1 — DynamoDB hooks (10 files)

**Query hooks** (`ddbKeys`-scoped, all reuse `ddbJsonCall` from Plan 02):
- `useTables()` — ListTables with `TableNames ?? []` normalization.
- `useTable(name)` — DescribeTable; adds derived `hashKey` / `sortKey` from KeySchema for UI labels.
- `useScan(name, filter, eskMap)` — Pitfall 7.2.2: eskMap rides in the body as a MAP; `JSON.stringify(esk)` is used ONLY for the query key.
- `useDdbQuery(name, pkName, pkValue, esk)` — base-table only, KeyConditionExpression `#pk = :pk` with ExpressionAttributeNames/Values.
- `useItem(name, key)` — §1.7 "missing item" normalized to `null` (TanStack v5 rejects `undefined`).

**Mutation hooks** (all exactly one invalidateQueries per Pitfall C-3):
- `useCreateTable()` — hash-only / hash+range / BillingMode default PAY_PER_REQUEST / Provisioned defaults {5,5}. Invalidates `ddbKeys.tables()`.
- `useDeleteTable()` — single invalidate `ddbKeys.tables()`.
- `usePutItem(tableName)` — D-06 marshal at the hook boundary via `marshalScalar`; predicate-based single invalidate `(q) => q.queryKey[0]==='ddb' && q.queryKey[2]===tableName` covers scan + item entries.
- `useUpdateItem(tableName)` — §1.9 SET-only UpdateExpression with `#n_<k> = :v_<k>` placeholders (reserved-word safe). ReturnValues: 'ALL_NEW'. Same predicate invalidate.
- `useDeleteItem(tableName)` — body `{TableName, Key}`. Same predicate invalidate.

### Task 2 — SQS Zustand messageStore + 8 hooks

**messageStore** (Zustand, keyed by QueueUrl):
- `append(url, msgs)` — D-04 accumulating list; dedupe by MessageId keeping FIRST ReceiptHandle.
- `remove(url, receiptHandle)` / `clear(url)` / `get(url)`.
- All transitions spread — immutability verified (test asserts new `byQueue` reference after each op).

**Query hooks**:
- `useQueues(prefix?)` — ListQueues + `useQueries` fan-out for GetQueueAttributes (Pitfall 7.2.12). Returns `{ url, attributes }[]` shape.
- `useQueueAttributes(url)` — runs `parseSqsAttributes` on the response.

**Mutation hooks** (6 total):
- `useCreateQueue()` — invalidates queues list.
- `useDeleteQueue()` — invalidates queues list.
- `useSendMessage(url)` — D-10 plain-JSON body; Pitfall 7.2.3 regression-locked by test asserting raw body does NOT contain `MessageAttribute.1.Name`. Invalidates attributes.
- `useReceiveMessage(url)` — D-04 manual poll with `WaitTimeSeconds: 0` / `MaxNumberOfMessages: 10` defaults. `res.Messages ?? []` for §2.6 empty poll. Writes into Zustand, NOT the cache. Cache-neutral (grep `invalidateQueries` on this file returns 0).
- `useDeleteMessage(url)` — Pitfall 7.2.4: `ReceiptHandle` rides in JSON body verbatim (test seeds `raw+handle/with=chars` and asserts raw request text contains it unencoded). Removes from store + invalidates attributes (single invalidate).
- `usePurgeQueue(url)` — clears messageStore + invalidates attributes (single invalidate).

### Task 3 — Generic framework hooks (3 files)

All accept an optional `registryOverride` so tests inject inline descriptors without polluting `GENERIC_DESCRIPTORS`.

- `useDescriptorList(serviceKey)` — dispatches by `descriptor.list.endpoint.adapter` to `awsJsonCall / awsQueryCall / restCall`. Disabled when `descriptor.kind === 'singleton'` (STS).
- `useDescriptorItem(serviceKey, id)` — singleton routes fire on mount with empty id; non-singleton require non-empty id.
- `useDescriptorMutation(serviceKey, op)` — exposes BOTH:
  * `preview(input)` — PURE; `buildRequest(specToBuildInput(spec, input))` — the D-07 "Review request" modal renders this.
  * `send(input)` / `sendAsync(input)` — identical `specToBuildInput` pipeline → adapter call. Pitfall 7.2.6 test captures the outgoing MSW request body and asserts it matches `preview.body` byte-for-byte.
  * Missing `mutations[op]` → `isSupported: false` + `preview()` throws `OperationNotSupportedError` (D-02 UI gate).
  * onSuccess: single `invalidateQueries({queryKey: genericKeys.list(serviceKey)})`.

## Verification Evidence

```
$ cd web && node_modules/.bin/vitest run src/services/ddb/api src/services/sqs src/services/_generic/hooks
Test Files  28 passed (28)
     Tests  113 passed (113)   # DDB 57 + SQS 46 + Generic 10

$ cd web && node_modules/.bin/tsc --noEmit -p tsconfig.json
EXIT=0  (zero errors)

# Pitfall C-3 one-invalidate audit (expect 11, one per mutation file)
$ grep -rcE "invalidateQueries\(" \
    web/src/services/ddb/api/{useCreateTable,useDeleteTable,usePutItem,useUpdateItem,useDeleteItem}.ts \
    web/src/services/sqs/api/{useCreateQueue,useDeleteQueue,useSendMessage,useDeleteMessage,usePurgeQueue}.ts \
    web/src/services/_generic/hooks/useGenericMutation.ts \
    | awk -F: '{s+=$2} END {print s}'
11

# D-04 cache-neutrality (expect 0)
$ grep -cE "invalidateQueries" web/src/services/sqs/api/useReceiveMessage.ts
0

# Pitfall 7.2.4 no-URL-encoding audit (expect 0)
$ grep -cE "encodeURIComponent.*ReceiptHandle|ReceiptHandle.*URLSearchParams" \
    web/src/services/sqs/api/useDeleteMessage.ts
0

# Registry Safety (expect 0 — no new deps)
$ git diff db2d3a3 HEAD web/package.json web/package-lock.json | grep -cE '^\+.*"[a-z@]'
0

# Forbidden deps (expect 0)
$ grep -rcE "monaco|CodeMirror|@rjsf|fast-xml-parser|aws-sdk" \
    web/src/services/ddb web/src/services/sqs web/src/services/_generic \
    | awk -F: '{s+=$2} END {print s+0}'
0

# test.todo leftovers in touched test files (expect 0)
$ grep -rc "test.todo" \
    web/src/services/ddb/api/ web/src/services/sqs/api/ \
    web/src/services/sqs/store/ web/src/services/_generic/hooks/ \
    | awk -F: '{s+=$2} END {print s+0}'
0
```

### Acceptance Grep Scorecard

| Criterion                                                                                     | Required | Actual |
| --------------------------------------------------------------------------------------------- | -------- | ------ |
| Pitfall C-3 mutation invalidate total across 11 files                                         | 11       | 11     |
| `marshalScalar` in usePutItem.ts                                                              | ≥1       | 1      |
| `marshalScalar` in useUpdateItem.ts                                                           | ≥1       | 1      |
| `UpdateExpression` in useUpdateItem.ts                                                        | ≥1       | 1      |
| `SET ` in useUpdateItem.ts                                                                    | ≥1       | 1      |
| `REMOVE \| ADD \| DELETE ` in useUpdateItem.ts (§1.9 deferred)                                | 0        | 0      |
| `ReturnValues` in useUpdateItem.ts                                                            | ≥1       | 1      |
| `IndexName` in useQuery.ts (base-table only)                                                  | 0        | 0      |
| `ExclusiveStartKey` in useScan.ts                                                             | ≥1       | 1      |
| `zustand` import in messageStore.ts                                                           | ≥1       | 1      |
| spread operators (immutability) in messageStore.ts                                            | ≥3       | 7      |
| `MessageId` in messageStore.ts (dedupe key)                                                   | ≥1       | 2      |
| `useSqsMessageStore` in useReceiveMessage / useDeleteMessage / usePurgeQueue                  | ≥1 each  | 1 each |
| `useQueryClient\|invalidateQueries` in useReceiveMessage.ts (D-04 cache-neutral)              | 0        | 0      |
| `useQueries` in useQueues.ts (Pitfall 7.2.12)                                                 | ≥1       | 1      |
| `WaitTimeSeconds` in useReceiveMessage.ts                                                     | ≥1       | 1      |
| URL-encoding of ReceiptHandle in useDeleteMessage.ts                                          | 0        | 0      |
| `export function useDescriptorList\|Item\|Mutation`                                           | 1 each   | 1 each |
| `awsJsonCall\|awsQueryCall\|restCall` in useGenericList.ts                                    | ≥3       | 3      |
| `buildRequest` in useGenericMutation.ts                                                       | ≥1       | 1      |
| `preview` in useGenericMutation.ts                                                            | ≥2       | 7      |
| `OperationNotSupportedError` in useGenericMutation.ts                                         | ≥1       | 3      |
| `invalidateQueries\(` in useGenericMutation.ts                                                | 1        | 1      |
| `singleton` in useGenericList.ts                                                              | ≥1       | 2      |
| `singleton` in useGenericItem.ts                                                              | ≥1       | 2      |
| `D-07\|Pitfall 7\.2\.6` in useGenericMutation.ts                                              | ≥1       | 3      |

## Commits

| Task | Message                                                                                           | Hash    |
| ---- | ------------------------------------------------------------------------------------------------- | ------- |
| 1    | feat(05-04): DDB hooks — 5 queries + 5 mutations (D-06, Pitfall C-3)                              | f9a9d23 |
| 2    | feat(05-04): SQS hooks + Zustand messageStore (D-04, D-10, Pitfalls 7.2.3/7.2.4/7.2.12)           | 9672a2d |
| 3    | feat(05-04): generic framework hooks — list/item/mutation with D-07 preview (Pitfall 7.2.6)       | 7c5c40c |

## Threat Model Coverage

| Threat ID  | Status    | Evidence                                                                                                                                         |
| ---------- | --------- | ------------------------------------------------------------------------------------------------------------------------------------------------ |
| T-5-04-01  | mitigate  | `usePutItem.test.ts` asserts captured body is `{total: {N: '42'}}` for numeric input — `marshalScalar` String()s via Plan 02.                    |
| T-5-04-02  | mitigate  | `useScan.test.ts` — LastEvaluatedKey round-trip: `captured.body.ExclusiveStartKey` equals the MAP input; typeof is `object`.                      |
| T-5-04-03  | mitigate  | `useSendMessage.test.ts` asserts raw body does NOT match `/MessageAttribute\.1\.Name/` and MessageAttributes stays nested.                       |
| T-5-04-04  | mitigate  | `useDeleteMessage.test.ts` seeds `raw+handle/with=chars`; asserts raw request text contains it verbatim, NOT `%2B` / `%2F` / `%3D`.              |
| T-5-04-05  | mitigate  | `useGenericMutation.test.ts` — preview+sendAsync on same input; MSW-captured raw body equals `preview.body` byte-for-byte.                       |
| T-5-04-06  | mitigate  | All 11 mutation test files spy `client.invalidateQueries` and assert call count === 1. Audit grep returns 11.                                    |
| T-5-04-07  | accept    | messageStore is in-memory only — browser tab close / purge / delete clears it. No persistence.                                                   |
| T-5-04-08  | mitigate  | `messageStore.test.ts` dedupe test: append same MessageId twice → length 1. `useReceiveMessage.test.ts` repeats the poll and asserts the same.   |
| T-5-04-09  | mitigate  | `useReceiveMessage.test.ts` → empty `{}` returns `[]` and doesn't touch the store. `res.Messages ?? []` covers §2.6.                             |

No new threat surface introduced.

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 1 — Bug] `useItem` returns `null`, not `undefined`, for §1.7 missing items**
- **Found during:** Task 1 test run — initial implementation returned `res.Item` which is `undefined` for a missing item. TanStack Query v5 treats `undefined` returns as invalid and keeps the query in a non-success state (`isSuccess === false`). The waitFor guard timed out.
- **Fix:** Normalize to `null`: `return res.Item ?? null`. Test assertion updated from `toBeUndefined()` to `toBeNull()`. Semantics are equivalent — the detail component renders the "not found" state from a null sentinel just as cleanly.
- **Files modified:** `web/src/services/ddb/api/useItem.ts`, `web/src/services/ddb/api/useItem.test.ts`.
- **Commit:** rolled into f9a9d23.

**2. [Rule 1 — Bug] Removed unused `sqsKeys` import in useCreateQueue.ts**
- **Found during:** Task 2 `tsc --noEmit`.
- **Issue:** `noUnusedLocals` flagged the import — the file uses the literal `['sqs', 'queues']` queryKey directly (sqsKeys.queues() would require handling the optional prefix parameter; hard-coding the prefix-less tuple is cleaner here).
- **Fix:** Removed the unused import.
- **Commit:** rolled into 9672a2d.

**3. [Rule 3 — Env blocker] Worktree had no `node_modules/`**
- **Found during:** post-Task-1 verification attempt.
- **Issue:** Worktree was populated from git but never ran `npm install`, so vitest and tsc weren't executable.
- **Fix:** Ran `npm install` in `web/` (no new deps — matched lockfile). Registry Safety grep still returns 0.
- **Commit:** not part of plan commits (environmental).

**4. [Rule 2 — File organization] Shared hook harness at `web/src/test/hookWrapper.ts`**
- **Found during:** Task 1 test design.
- **Issue:** All 21 touched test files are Plan 00 stubs as `.test.ts` (no JSX). Hook tests need `QueryClientProvider` + spying on `invalidateQueries`. Duplicating a `.tsx` rename for all 21 would be churn; each duplicated wrapper block would accumulate.
- **Fix:** Created a shared `makeHookHarness()` returning `{ client, Wrapper }` using `React.createElement` — stays `.ts`-compatible. 21 tests import from one place. Acceptance criterion "touch test files = moved from todo to passing" is satisfied without file-extension changes.
- **Files created:** `web/src/test/hookWrapper.ts`.
- **Commit:** included in f9a9d23.

### Architectural Changes (Rule 4)

None.

### Authentication Gates

None.

## Known Stubs

None. Every hook is fully wired. No `test.todo` remains in the 21 touched test files (audit grep returns 0).

The 7 placeholder descriptors in `_generic/registry.ts` are out of scope for this plan (Plan 06 wires them); those stubs are explicitly tracked in 05-01-SUMMARY.md.

## Deferred Issues

None. All 113 tests in this plan's scope pass. No pre-existing test failures were introduced or left unfixed.

## Self-Check: PASSED

Source files exist:
```
FOUND: web/src/services/ddb/api/useTables.ts
FOUND: web/src/services/ddb/api/useTable.ts
FOUND: web/src/services/ddb/api/useScan.ts
FOUND: web/src/services/ddb/api/useQuery.ts
FOUND: web/src/services/ddb/api/useItem.ts
FOUND: web/src/services/ddb/api/useCreateTable.ts
FOUND: web/src/services/ddb/api/useDeleteTable.ts
FOUND: web/src/services/ddb/api/usePutItem.ts
FOUND: web/src/services/ddb/api/useUpdateItem.ts
FOUND: web/src/services/ddb/api/useDeleteItem.ts
FOUND: web/src/services/sqs/store/messageStore.ts
FOUND: web/src/services/sqs/api/useQueues.ts
FOUND: web/src/services/sqs/api/useQueueAttributes.ts
FOUND: web/src/services/sqs/api/useCreateQueue.ts
FOUND: web/src/services/sqs/api/useDeleteQueue.ts
FOUND: web/src/services/sqs/api/useSendMessage.ts
FOUND: web/src/services/sqs/api/useReceiveMessage.ts
FOUND: web/src/services/sqs/api/useDeleteMessage.ts
FOUND: web/src/services/sqs/api/usePurgeQueue.ts
FOUND: web/src/services/_generic/hooks/useGenericList.ts
FOUND: web/src/services/_generic/hooks/useGenericItem.ts
FOUND: web/src/services/_generic/hooks/useGenericMutation.ts
FOUND: web/src/test/hookWrapper.ts
```

Commits:
```
FOUND: f9a9d23 feat(05-04): DDB hooks — 5 queries + 5 mutations (D-06, Pitfall C-3)
FOUND: 9672a2d feat(05-04): SQS hooks + Zustand messageStore (D-04, D-10, Pitfalls 7.2.3/7.2.4/7.2.12)
FOUND: 7c5c40c feat(05-04): generic framework hooks — list/item/mutation with D-07 preview (Pitfall 7.2.6)
```

Verification commands re-run at end of plan:
- `vitest run src/services/ddb/api src/services/sqs src/services/_generic/hooks` — 113/113 passing
- `tsc --noEmit -p tsconfig.json` — 0 errors
- Registry Safety grep — 0
- Forbidden-deps grep — 0
- Pitfall C-3 mutation invalidate audit — 11 (expected 11)
- D-04 cache-neutrality grep — 0 (expected 0)
- Pitfall 7.2.4 no-URL-encoding grep — 0 (expected 0)
- test.todo leftover grep in touched tests — 0 (expected 0)
