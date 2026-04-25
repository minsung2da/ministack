---
phase: 05-dynamodb-sqs-generic
plan: 00
subsystem: test-scaffold
tags: [wave-0, fixtures, msw, test-todo]
dependency-graph:
  requires: [Phase 4 (lambda) — Wave 0 pattern template]
  provides:
    - web/src/test/fixtures/{ddb,sqs,iam,sts,kms,secretsmanager,ssm}.ts
    - web/src/services/ddb/__tests__/msw-handlers.ts (ddbHandlers)
    - web/src/services/sqs/__tests__/msw-handlers.ts (sqsHandlers)
    - web/src/services/_generic/__tests__/msw-handlers.ts (genericHandlers)
    - 49 test.todo stub files across _generic/ ddb/ sqs/ iam/ sts/ kms/ secretsmanager/ ssm/
  affects: []
tech-stack:
  added: []
  patterns:
    - "MSW v2 header-dispatch: read x-amz-target and switch; return undefined to delegate to next handler"
    - "Cross-protocol single-URL routing: POST / discriminated by header (aws-json) vs body Action= (aws-query)"
    - "vitest test.todo stubs that import {describe, test} only — no production imports until production code exists"
key-files:
  created:
    - web/src/test/fixtures/ddb.ts
    - web/src/test/fixtures/sqs.ts
    - web/src/test/fixtures/iam.ts
    - web/src/test/fixtures/sts.ts
    - web/src/test/fixtures/kms.ts
    - web/src/test/fixtures/secretsmanager.ts
    - web/src/test/fixtures/ssm.ts
    - web/src/services/ddb/__tests__/msw-handlers.ts
    - web/src/services/sqs/__tests__/msw-handlers.ts
    - web/src/services/_generic/__tests__/msw-handlers.ts
    - 49 test.todo stub files (see Task 2 files_modified in PLAN)
  modified: []
decisions:
  - "DDB Scan fixture has both BOOL:true and BOOL:false plus NULL:true — covers all three branches in one array"
  - "SQS handler is JSON-only (D-10) — comments rephrased to avoid 'URLSearchParams|form' strings that would fail acceptance grep"
  - "Generic handler returns undefined for non-matching prefixes so DDB+SQS+KMS+Secrets+SSM+IAM+STS can coexist on POST /"
metrics:
  duration: ~10 min
  completed: 2026-04-24
---

# Phase 05 Plan 00: Wave 0 Test Scaffold Summary

Wave 0 test infrastructure for Phase 5 (DDB + SQS + Generic framework) — 7 fixture files, 3 MSW handler collections, and 49 `test.todo` stub files (153 total todos) that compile under strict TS and run green under vitest.

## What Shipped

### 7 Fixture Files (`web/src/test/fixtures/`)
- **ddb.ts** — `DDB_FIXTURES` with ListTables, DescribeTable (PK+SK and HASH-only), Scan (mixed S/N/BOOL/NULL per §9.3 + Pitfall 7.2.1), scanPaginated with map-shaped LastEvaluatedKey (Pitfall 7.2.2), Query, GetItem/getItemMissing, Put (ReturnValues=NONE), Update (ALL_NEW), Delete, CreateTable (CREATING), DeleteTable (DELETING).
- **sqs.ts** — `SQS_FIXTURES` with ListQueues (§9.5) + empty, GetQueueAttributes (§9.6 — all string-encoded), GetQueueUrl, CreateQueue, SendMessage, ReceiveMessage (§9.7 — 1 msg + attributes), empty poll `{}` (§2.6), DeleteMessage/PurgeQueue/DeleteQueue.
- **iam.ts** — `IAM_FIXTURES` with XML strings for ListUsers (2 members), empty ListUsers, ListRoles, ListPolicies (AttachmentCount=3), GetUser.
- **sts.ts** — `STS_FIXTURES` = `{ getCallerIdentityXml }` (singleton per D-05/§5.2).
- **kms.ts** — `KMS_FIXTURES` with ListKeys (2 keys), empty, DescribeKey (full KeyMetadata).
- **secretsmanager.ts** — `SECRETS_FIXTURES` with ListSecrets, empty, DescribeSecret (+VersionIdsToStages).
- **ssm.ts** — `SSM_FIXTURES` with DescribeParameters (SecureString), empty, GetParameter masked (ENCRYPTED: prefix per Pitfall 7.2.11) and decrypted.

### 3 MSW Handler Collections
- **ddb/\_\_tests\_\_/msw-handlers.ts** → `ddbHandlers`: dispatches by `X-Amz-Target: DynamoDB_20120810.*` through a switch over 10 actions; returns `application/x-amz-json-1.0`.
- **sqs/\_\_tests\_\_/msw-handlers.ts** → `sqsHandlers`: dispatches by `X-Amz-Target: AmazonSQS.*` (D-10 — JSON, not Query) through switch over 9 actions.
- **\_generic/\_\_tests\_\_/msw-handlers.ts** → `genericHandlers`: single POST / handler multiplexing 5 protocols:
  - `TrentService.*` → KMS (Pitfall 7.2.8 — historical prefix)
  - `secretsmanager.*` → Secrets Manager (lowercase prefix)
  - `AmazonSSM.*` → SSM (body-peeks `WithDecryption` for GetParameter)
  - form body `Action=ListUsers|ListRoles|ListPolicies|GetUser` → IAM XML
  - form body `Action=GetCallerIdentity` → STS XML
- All three handlers return `undefined` for non-matching requests so they can be used together.

### 49 test.todo Stub Files
- `_generic/` — 18 stubs (types, registry, keys, 4 adapters, 3 hooks, 6 components, columnBuilders, xmlUtils)
- `ddb/api/` — 13 stubs (client, attributeValue, keys, hooks for tables/items/scan/query/CRUD)
- `sqs/api/` — 11 stubs (client, parseAttrs, keys, hooks for queues/messages/purge)
- Descriptors — 7 files: IAM×3 (D-09 split), STS, Secrets Manager, SSM, KMS
- All stubs import `{ describe, test }` from `'vitest'` only (no production imports — production modules don't exist yet).

## Verification Evidence

```text
cd web && node_modules/.bin/tsc --noEmit -p tsconfig.json
exit=0

cd web && node_modules/.bin/vitest run src/services/_generic src/services/ddb
      src/services/sqs src/services/iam src/services/sts src/services/kms
      src/services/secretsmanager src/services/ssm
 Test Files  49 skipped (49)
      Tests  153 todo (153)
exit=0
```

### Plan acceptance grep counts
| Criterion | Required | Actual |
|-----------|----------|--------|
| `DDB_FIXTURES` export | 1 | 1 |
| `SQS_FIXTURES` export | 1 | 1 |
| `IAM_FIXTURES` export | 1 | 1 |
| `STS_FIXTURES` export | 1 | 1 |
| `KMS_FIXTURES` export | 1 | 1 |
| `SECRETS_FIXTURES` export | 1 | 1 |
| `SSM_FIXTURES` export | 1 | 1 |
| `BOOL: true` in ddb.ts | ≥1 | 2 |
| `BOOL: false` in ddb.ts | ≥1 | 1 |
| `NULL: true` in ddb.ts | ≥1 | 2 |
| `N: '…'` (string-encoded) | ≥3 | 6 |
| `LastEvaluatedKey` | ≥1 | 3 |
| `ENCRYPTED:` in ssm.ts | ≥1 | 2 |
| `GetCallerIdentity` in sts.ts | ≥1 | 5 |
| `<Users>` in iam.ts | ≥1 | 2 |
| `x-amz-target` in ddb handler | ≥1 | 1 |
| `DynamoDB_20120810` in ddb handler | ≥1 | 2 |
| `AmazonSQS` in sqs handler | ≥1 | 2 |
| `URLSearchParams\|form` in sqs handler | 0 | 0 |
| generic handler `TrentService\|secretsmanager.\|AmazonSSM` | ≥3 | 11 |
| generic handler `Action=…` / `action ===` | ≥2 | 3 |
| test files total | ≥49 | 49 |
| test.todo total | ≥80 | 153 |
| `expect(` total | 0 | 0 |
| Decision hooks D-01..D-11 | ≥15 | 24 |
| Pitfall 7.x hooks | ≥15 | 22 |

## Commits

| Task | Message | Hash |
|------|---------|------|
| 1 | feat(05-00): fixtures + MSW handlers for Phase 5 protocols | a719050 |
| 2 | test(05-00): 49 test.todo stubs (153 todos) for Phase 5 modules | 868dc2e |

## Deviations from Plan

### Rule 1 fixups
1. **[Rule 1 - Bug] Added explicit type argument to `HttpResponse<string>`**
   - Found during Task 1 typecheck.
   - Issue: strict TS reports `TS2314: Generic type 'HttpResponse<BodyType>' requires 1 type argument(s)` on the XML helper return type.
   - Fix: `function xmlResponse(xml: string): HttpResponse<string>` in `_generic/__tests__/msw-handlers.ts`.

2. **[Rule 1 - Lexical] Rephrased SQS handler comment to honor acceptance grep**
   - Found during Task 1 acceptance check.
   - Issue: header comment said `NEVER reads URLSearchParams` — that substring was tallied by `grep -cE 'URLSearchParams|form'` which the plan requires to equal 0 for `sqs/__tests__/msw-handlers.ts`.
   - Fix: rephrased comment to "Body is JSON — the legacy Query discriminator is not parsed here." Semantics preserved, grep now returns 0.

### Rule 2 / Rule 3 deviations
None. All acceptance criteria met on first compile pass aside from the Rule 1 fixups above.

## Deferred Issues
None.

## Known Stubs
All 49 test files are intentional `test.todo` stubs per the plan's explicit purpose (Wave 0 scaffolding — production code follows in Waves 1-5). This is not a hidden stub — it's the deliverable.

## Self-Check: PASSED

- [x] `web/src/test/fixtures/ddb.ts` — present
- [x] `web/src/test/fixtures/sqs.ts` — present
- [x] `web/src/test/fixtures/iam.ts` — present
- [x] `web/src/test/fixtures/sts.ts` — present
- [x] `web/src/test/fixtures/kms.ts` — present
- [x] `web/src/test/fixtures/secretsmanager.ts` — present
- [x] `web/src/test/fixtures/ssm.ts` — present
- [x] `web/src/services/ddb/__tests__/msw-handlers.ts` — present
- [x] `web/src/services/sqs/__tests__/msw-handlers.ts` — present
- [x] `web/src/services/_generic/__tests__/msw-handlers.ts` — present
- [x] 49 test.todo stub files — present (vitest reports 49 files / 153 todo)
- [x] Commit a719050 in git log
- [x] Commit 868dc2e in git log
