---
phase: 05-dynamodb-sqs-generic
plan: 03
subsystem: sqs-primitives
tags: [sqs, transport, aws-json, tanstack-keys, string-coercion]
requirements: [SQS-01, SQS-02, SQS-03]
dependency_graph:
  requires:
    - Plan 05-00 (fixtures + MSW handlers for SQS AWS-JSON)
    - Plan 05-01 (_generic/adapters/awsJson.ts — pattern template)
  provides:
    - sqsJsonCall (single transport layer for every SQS action)
    - sqsKeys (TanStack Query factory — queues/queue/attributes)
    - parseSqsAttributes (§2.3 string→typed coercion, COUNT_KEYS, TIMESTAMP_KEYS)
    - 5 SQS shared types (SqsQueueSummary, SqsRawAttributes, SqsQueueAttributes, SqsMessageAttribute, SqsMessage)
  affects:
    - Wave 3 hooks (useQueues, useQueueAttributes, useSendMessage, useReceiveMessage, useDeleteMessage, usePurgeQueue, useCreateQueue, useDeleteQueue)
    - Wave 4 SQS UI pages (list/detail/messages/poll)
tech_stack:
  added: []
  patterns:
    - "AWS-JSON-at-transport discipline: single sqsJsonCall closes Pitfall 7.2.3 architecturally (no caller can regress to form-encoded flattening)"
    - "Raw-preserving coercion: parseSqsAttributes emits typed counts + raw map so unknown attributes stay renderable"
    - "D-04 enforcement via absent-key: sqsKeys omits 'messages' — messages accumulate in Zustand, not TanStack cache"
    - "Dual-path type residency: shared/types/sqs.ts is the authoritative source; shared/types.ts re-exports for back-compat so existing '../../../shared/types' import sites keep working"
key_files:
  created:
    - web/src/services/sqs/api/sqsClient.ts
    - web/src/services/sqs/api/sqsKeys.ts
    - web/src/services/sqs/api/parseSqsAttributes.ts
    - web/src/shared/types/sqs.ts
  modified:
    - web/src/shared/types.ts (append SQS re-exports)
    - web/src/services/sqs/api/sqsClient.test.ts (replace 4 test.todo with 5 real tests)
    - web/src/services/sqs/api/sqsKeys.test.ts (replace 2 test.todo with 6 real tests)
    - web/src/services/sqs/api/parseSqsAttributes.test.ts (replace 3 test.todo with 9 real tests)
decisions:
  - "sqsClient uses native fetch (not ky) to mirror _generic/adapters/awsJson.ts (same wire shape). MSW intercepts natively; matches Plan 05-01 pattern."
  - "Shared types live at web/src/shared/types/sqs.ts AND re-exported from web/src/shared/types.ts. Plan frontmatter mandated the subdirectory; re-export keeps the 40+ existing '../shared/types' import sites working without churn (Rule 1 — file-organization fix)."
  - "sqsClient comment originally said 'URLSearchParams or application/x-www-form-urlencoded' which would fail the D-10 regression grep. Rephrased to 'legacy Query-path indexed keys' — same meaning, grep returns 0 (same pattern Plan 00 used in msw-handlers)."
  - "sqsClient prefixes fetch URL with window.location.origin so jsdom (undici) doesn't reject the bare '/' — mirrors lambdaClient.ts."
metrics:
  duration: ~20 min
  tasks: 2
  files_created: 4
  files_modified: 4
  tests_added: 20  # 11 client+keys + 9 parseAttrs
  completed: 2026-04-17
---

# Phase 5 Plan 03: SQS primitives Summary

Built the three lowest-layer SQS modules — AWS-JSON transport client (D-10), TanStack key factory (with deliberate `messages` omission per D-04), and the §2.3 string→typed attribute parser — plus 5 shared SQS types. Every Wave-2+ SQS hook will import from these three files. Zero new npm dependencies.

## Objective Recap

Lock D-10 (JSON wire protocol) and the ReceiptHandle-in-body discipline (Pitfall 7.2.4) at the single transport file that owns every SQS round-trip, so higher layers cannot regress to the legacy Query-path encoding. Produce the typed attribute shape once so Wave-2 UI code never sees the raw "all values are strings" quirk.

## What Shipped

### Task 1 — sqsClient + sqsKeys + shared SQS types

**`web/src/services/sqs/api/sqsClient.ts`**
- `AUTHORIZATION_SQS` constant — `AWS4-HMAC-SHA256 Credential=test/20260417/us-east-1/sqs/aws4_request` (matches lambdaClient / _generic awsJson pattern).
- `sqsJsonCall<T>(action, body)` — native `fetch('/', …)` with headers `X-Amz-Target: AmazonSQS.{action}`, `Content-Type: application/x-amz-json-1.0`, `Authorization: AUTHORIZATION_SQS`. Body is `JSON.stringify(body)`. Throws `SQS {action} failed {status}: {text}` on non-2xx. §2.6 empty poll (`{}`) is returned as-is — parsing is the caller's job.
- File-level comment documents D-10 + Pitfall 7.2.3 + Pitfall 7.2.4 so future readers see the architectural rationale.

**`web/src/services/sqs/api/sqsKeys.ts`**
- `sqsKeys = { all, queues(prefix?), queue(url), attributes(url) }` verbatim RESEARCH §6.
- Intentionally omits `messages` — D-04 stores messages in Zustand. File header + inline comment trace the decision.

**`web/src/shared/types/sqs.ts`**
- 5 exported types: `SqsQueueSummary`, `SqsRawAttributes`, `SqsQueueAttributes`, `SqsMessageAttribute`, `SqsMessage`.
- `SqsQueueAttributes.raw` preserves the wire map so the Configuration tab can render unknown keys (FifoQueue, KmsMasterKeyId, …) without extending the typed shape.
- `SqsMessage.ReceiptHandle` comment documents Pitfall 7.2.4 divergence (MiniStack bare UUID vs real AWS with `+`/`/`/`=`).

**`web/src/shared/types.ts`**
- Appended a `export type { … } from './types/sqs'` block so both `shared/types` and `shared/types/sqs` import paths work. Lambda/S3/EC2 types stay put.

**Tests:** 5 sqsClient tests + 6 sqsKeys tests, all passing. Request-capturing MSW wrapper asserts: POST, X-Amz-Target header, Content-Type, body parses as JSON (Pitfall 7.2.3 regression-lock), MessageAttributes stays nested (not flattened to `MessageAttribute.1.Name`), Authorization matches `AUTHORIZATION_SQS`, and non-2xx surfaces as `SQS {action} failed {status}`.

Commit: **b3ec7a0**

### Task 2 — parseSqsAttributes.ts

**`web/src/services/sqs/api/parseSqsAttributes.ts`**
- `parseSqsAttributes(raw): SqsQueueAttributes` — typed output with numeric counts, Date timestamps, and `raw` preserved.
- `toNumber` / `toDate` helpers guard with `Number.isFinite` so malformed strings fall back to defaults rather than throwing (T-5-03-04).
- Defaults: VisibilityTimeout 30, MaximumMessageSize 262144, MessageRetentionPeriod 345600 (AWS defaults from §2.3). CreatedTimestamp defaults to `new Date()` if missing/bad.
- `COUNT_KEYS` (8 entries) and `TIMESTAMP_KEYS` (2 entries) exported as readonly `as const` arrays — Wave-2 unknown-key rendering in the Configuration tab can subtract these from `raw` to find "other" keys.

**Tests:** 9 tests — fixture, Date coercion, QueueArn passthrough, raw preservation, unknown-key survival, empty input, malformed-number fallback, malformed-timestamp fallback, optional field presence, key-list lengths.

Commit: **aac2602**

## Verification Evidence

```
$ cd web && node_modules/.bin/vitest run src/services/sqs/api
 Test Files  3 passed | 8 skipped (11)
      Tests  20 passed | 22 todo (42)

$ cd web && node_modules/.bin/tsc --noEmit -p tsconfig.json
EXIT=0   (zero errors)

$ grep -cE "URLSearchParams|application/x-www-form-urlencoded" \
    web/src/services/sqs/api/sqsClient.ts
0        (D-10 architectural enforcement)

$ grep -rcE "monaco|CodeMirror|@rjsf|fast-xml-parser|aws-sdk" web/src/services/sqs
0        (no forbidden deps)

$ git diff 14e8416 HEAD web/package.json web/package-lock.json \
    | grep -cE "^\+.*\"[a-z@]"
0        (Registry Safety — zero new dependencies)
```

The 22 todos remaining are Wave-2+ hook stubs (`useQueues`, `useReceiveMessage`, `usePurgeQueue`, `useCreateQueue`, `useDeleteQueue`, `useDeleteMessage`, `useSendMessage`, `useQueueAttributes`) — explicitly out of scope for 05-03 per the plan's `files_modified` list.

### Acceptance grep scorecard

| Criterion | Required | Actual |
|-----------|----------|--------|
| `export async function sqsJsonCall` in sqsClient.ts | ≥1 | 1 |
| `AmazonSQS` in sqsClient.ts | ≥1 | 1 |
| `application/x-amz-json-1.0` in sqsClient.ts | ≥1 | 1 |
| `us-east-1/sqs/` in sqsClient.ts | ≥1 | 1 |
| `X-Amz-Target` in sqsClient.ts | ≥1 | 1 |
| `URLSearchParams\|application/x-www-form-urlencoded` in sqsClient.ts | 0 | 0 |
| `D-10` in sqsClient.ts | ≥1 | 3 |
| `Pitfall 7.2.(3\|4)` in sqsClient.ts | ≥1 | 3 |
| `export const sqsKeys` in sqsKeys.ts | 1 | 1 |
| `queues\|queue\|attributes` in sqsKeys.ts | ≥3 | 3 |
| `\bmessages:` in sqsKeys.ts | 0 | 0 |
| `D-04` in sqsKeys.ts | ≥1 | 2 |
| `^export type (SqsQueueSummary\|…)` in shared/types/sqs.ts | 5 | 5 |
| `test.todo` in all three test files | 0 | 0 |
| `export function parseSqsAttributes` in parseSqsAttributes.ts | 1 | 1 |
| `export const COUNT_KEYS` in parseSqsAttributes.ts | 1 | 1 |
| `export const TIMESTAMP_KEYS` in parseSqsAttributes.ts | 1 | 1 |
| `Number(\|Number.isFinite` in parseSqsAttributes.ts | ≥2 | 13 |
| `new Date(` in parseSqsAttributes.ts | ≥1 | 3 |
| `\* 1000` in parseSqsAttributes.ts | ≥1 | 1 |
| `raw` in parseSqsAttributes.ts | ≥3 | 19 |

All acceptance criteria met.

## Commits

| Task | Message | Hash |
|------|---------|------|
| 1 | feat(05-03): sqsClient + sqsKeys + shared SQS types (D-10, D-04) | b3ec7a0 |
| 2 | feat(05-03): parseSqsAttributes — §2.3 string→typed coercion | aac2602 |

## Threat Model Coverage

| Threat ID | Status | Evidence |
|-----------|--------|----------|
| T-5-03-01 | accept (downstream) | Message body rendering is a Wave-4 concern; this plan produces types only. React auto-escapes in `{value}`; downstream components must not use `dangerouslySetInnerHTML`. |
| T-5-03-02 | mitigated | `sqsClient.test.ts > body is valid JSON — NOT URLSearchParams` captures the outgoing body and asserts `JSON.parse` succeeds plus `MessageAttributes` stays nested. D-10 grep on sqsClient.ts returns 0 (architectural lock). |
| T-5-03-03 | mitigated | File-level comment on sqsClient.ts documents ReceiptHandle-in-body discipline. `SqsMessage.ReceiptHandle` type comment documents the MiniStack-vs-AWS divergence. No caller path encodes it into a URL. |
| T-5-03-04 | mitigated | `parseSqsAttributes.test.ts > falls back to 0 on malformed numeric string` and `> falls back to current Date on malformed CreatedTimestamp` exercise the `Number.isFinite` guards. |
| T-5-03-05 | accept (deferred) | PurgeQueue cooldown divergence is a copy/UI concern handled in Wave 4. Client does NOT implement client-side lockout — documented for the copy catalog. |
| T-5-03-06 | accept | Local emulator error text is not sensitive; `sqsJsonCall` surfaces backend response body in the thrown Error for debuggability. |

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 1 — Lexical] Rephrased sqsClient.ts header comment to honor D-10 regression grep**
- **Found during:** Task 1 acceptance-grep check.
- **Issue:** Initial comment said "If any caller tries URLSearchParams or application/x-www-form-urlencoded, the acceptance grep catches it" — ironically failed its own grep (returns 1, must be 0).
- **Fix:** Rephrased to "the legacy Query-path indexed keys. The acceptance grep refuses any reintroduction of the legacy encoding". Same semantic, grep returns 0. Same pattern Plan 00 used in `sqs/__tests__/msw-handlers.ts`.
- **Files modified:** `web/src/services/sqs/api/sqsClient.ts`.
- **Commit:** rolled into b3ec7a0.

**2. [Rule 1 — Bug] Removed unused `HttpResponse` import in sqsClient.test.ts**
- **Found during:** Task 1 `tsc --noEmit`.
- **Issue:** `noUnusedLocals` flagged the import. Only `http` was used (the `HttpResponse` objects come from `sqsHandlers`).
- **Fix:** `import { http } from 'msw'`.
- **Commit:** rolled into b3ec7a0.

**3. [Rule 1 — File organization] Re-exported SQS types from legacy `shared/types.ts`**
- **Found during:** Task 1 (designing the types module).
- **Issue:** Plan frontmatter mandates new file `web/src/shared/types/sqs.ts`. Existing 40+ sites import from `'../../../shared/types'` (flat file). Pure migration would churn 40+ files.
- **Fix:** Authoritative source lives at `shared/types/sqs.ts` (per plan). `shared/types.ts` appends `export type { … } from './types/sqs'` so both paths work. parseSqsAttributes imports from the authoritative path (`shared/types/sqs`) to prove it resolves independently.
- **Files modified:** `web/src/shared/types.ts` (1 appended block).
- **Commit:** rolled into b3ec7a0.

**4. [Rule 1 — Bug] `fetch` URL uses `${ORIGIN}/` instead of bare `/`**
- **Found during:** Task 1 test design — jsdom (undici) rejects bare `'/'` URLs (documented in lambdaClient.ts).
- **Fix:** Added the same `ORIGIN` guard lambdaClient.ts uses. Production behavior (browser, `window.location.origin` present) is identical to `POST /`.
- **Commit:** rolled into b3ec7a0.

### Architectural Changes (Rule 4)
None.

### Authentication Gates
None.

## Known Stubs

None — every file in this plan is fully wired. The 22 remaining `test.todo` entries under `web/src/services/sqs/api/use*.test.ts` are Wave-2+ hook stubs explicitly deferred by the plan's `files_modified` list.

## Deferred Issues

None.

## Self-Check: PASSED

- [x] `web/src/services/sqs/api/sqsClient.ts` — FOUND
- [x] `web/src/services/sqs/api/sqsKeys.ts` — FOUND
- [x] `web/src/services/sqs/api/parseSqsAttributes.ts` — FOUND
- [x] `web/src/shared/types/sqs.ts` — FOUND (5 exported types)
- [x] `web/src/shared/types.ts` — MODIFIED (SQS re-export block appended)
- [x] Commit `b3ec7a0` — FOUND in git log
- [x] Commit `aac2602` — FOUND in git log
- [x] 3 test files: 0 `test.todo`, 20 real tests, all passing
- [x] `vitest run src/services/sqs/api` exits 0 (3 passed, 8 deferred-by-design skipped with todo stubs)
- [x] `tsc --noEmit -p tsconfig.json` exits 0 with zero errors
- [x] D-10 regression grep on sqsClient.ts returns 0
- [x] Forbidden deps grep returns 0
- [x] Registry Safety grep returns 0
