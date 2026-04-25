# Phase 5: DynamoDB, SQS & Generic Service Framework — Research

**Researched:** 2026-04-17
**Domain:** Browser UI for three distinct backend protocols on one SPA — DynamoDB (AWS-JSON 1.0 via `X-Amz-Target`), SQS (Query API, `x-www-form-urlencoded` POST), and five read-heavy services (IAM/STS XML Query, Secrets Manager/SSM/KMS JSON) unified behind a schema-driven generic framework.
**Confidence:** HIGH — CONTEXT locks 7 decisions; all three backend modules inspected line-by-line; every REST verb the UI needs already exists; Phase 3/4 S3/Lambda patterns are direct analogs for the service-specific pages; the new work is the `ServiceDescriptor` adapter abstraction.

## Summary

Phase 5 ships three UI subsystems on a single SPA that already has React 19 + Cloudscape 3 + TanStack Query 5 + Zustand 5 + ky 1.x plumbing from Phases 1–4 [CITED: Phase 4 RESEARCH §Standard Stack]. **Zero new npm dependencies.** The subsystems are:

1. **DynamoDB** — dedicated pages for tables + items. Backend is AWS-JSON: every call is `POST /` with header `X-Amz-Target: DynamoDB_20120810.{Action}` and a JSON body (`dynamodb.py:164–202`). The UI's hardest job is **marshaling/unmarshaling AttributeValues**: the wire form is `{"S":"str"}`, `{"N":"42"}` (number kept as string!), `{"BOOL":true}`, `{"NULL":true}`, `{"B":"<base64>"}`. Scan's `LastEvaluatedKey` is a **map of attribute values**, not an opaque string — client must JSON-stringify it for storage.

2. **SQS** — dedicated pages for queues + messages + manual poll. Backend accepts both JSON (`X-Amz-Target: AmazonSQS.*`, `sqs.py:98–104`) **and** legacy Query (`sqs.py:107–115`). CONTEXT doesn't lock which wire format the client uses, but the JSON path is dramatically simpler — same body shape for both, but JSON skips `MessageAttribute.1.Name` style flattening. **Recommendation: use JSON for Phase 5.** Query/form-encoded path remains as a documented fallback only if a future dependency requires it.

3. **Generic framework** — a `ServiceDescriptor` TypeScript module per service. Five descriptors ship in Phase 5 (IAM, STS, Secrets Manager, SSM, KMS — CONTEXT D-05). The framework must handle three *wire adapters* because the five services split into two camps: **IAM + STS speak XML Query** (`iam_sts.py:97–107, 1289–1296`); **Secrets Manager + SSM + KMS speak AWS-JSON via `X-Amz-Target`** (`secretsmanager.py:128–135`, `ssm.py:72–80`, `kms.py:805–813`). One descriptor must not know the other's protocol — that's the `adapter` field's job.

The net-new technical surface is therefore (a) DDB AttributeValue codec (~80 lines, pure functions, trivially testable), (b) an XML-response parser for IAM+STS (DOMParser, ~50 lines, similar to Phase 3 S3 ListBuckets XML parser [CITED: Phase 3 s3Client.ts]), and (c) the descriptor type + three adapters. Everything else (Cloudscape Table/Form/Modal/Tabs, TanStack Query, route ordering, type-to-confirm, Wave 0 MSW stubs) is a direct port of established Phase 3/4 patterns.

**Primary recommendation:** Build three independent service folders — `web/src/services/ddb/`, `web/src/services/sqs/`, `web/src/services/_generic/` — plus one descriptor file per generic service. Ship in ~6 waves: Wave 0 tests/MSW; Wave 1 generic framework skeleton; Wave 2–3 DDB; Wave 4 SQS; Wave 5 five descriptors; Wave 6 polish/copy/final UAT.

## User Constraints (from CONTEXT.md)

### Locked Decisions

- **D-01** — Schema format: TypeScript descriptor modules. Each opt-in service exports `ServiceDescriptor` from `web/src/services/{svc}/descriptor.ts`. Type-checked at compile time. Rebuild required to pick up new descriptors (acceptable — local dev tool).
- **D-02** — Generic framework scope: CRUD **when** `descriptor.mutations` is declared. Absent mutations → read-only (list + JSON detail). Presence of `mutations.create` → Create button + form from `bodyShape`. Presence of `mutations.delete` → row-actions Delete with type-to-confirm.
- **D-03** — DDB item editor: per-attribute form controls typed by the scalar kind (D-06), with a **JSON mode toggle** as the escape hatch for complex types.
- **D-04** — SQS receive: **manual "Poll" button**, one click = one `ReceiveMessage(MaxNumberOfMessages=10, WaitTimeSeconds=0)`. New messages **append** to a running list (not replace). Per-row Delete via `DeleteMessage`.
- **D-05** — Generic-framework service set = 5: **IAM, STS, Secrets Manager, SSM, KMS**. All other services deferred.
- **D-06** — DDB types in scope for the schema-based form = scalars only: **S, N, B, BOOL, NULL**. Complex types (L, M, SS/NS/BS) → JSON mode.
- **D-07** — Generic CRUD safety: **always show JSON diff preview** before write. User confirms with "Send". DDB/SQS native pages skip the preview (their forms are already domain-specific).

### Claude's Discretion

- Test scaffolding approach (Wave 0 test stub pattern matches Phase 3/4 03-00/04-00)
- MSW fixture JSON structure (just enough to exercise parsers)
- Exact small-file split under `_generic/`
- Error flashbar / empty-state copy (match Phase 2+ catalog style)
- Whether SQS client uses JSON or form-encoded wire format (research recommends JSON)

### Deferred Ideas (OUT OF SCOPE)

- DDB complex attribute types (L, M, SS/NS/BS) beyond the JSON toggle
- DDB conditional expressions UI
- DDB GSI/LSI query UI (choose index)
- DDB Streams UI
- SQS FIFO + DLQ redrive, MessageGroupId/DeduplicationId form fields
- SQS message body transformations (auto-pretty JSON, base64 binary toggle)
- Generic framework coverage expansion (Cognito, Route53, SNS, CloudFormation, Athena, Glue, etc.)
- Descriptor hot-reload (requires full Vite rebuild in Phase 5)
- Backend `--dry-run` for the generic write preview
- Cross-service resource graphs

## Phase Requirements

| ID | Description | Research Support |
|----|-------------|------------------|
| DDB-01 | Table list + detail (key schema, indexes) | `ListTables` (§1.1) + `DescribeTable` (§1.2). Cloudscape `Table` + `Tabs` — same pattern as Phase 4 `FunctionDetailPage`. |
| DDB-02 | Scan / query items and view as JSON | `Scan` (§1.5) + `Query` (§1.6) + `GetItem` (§1.7). AttributeValue unmarshal (§3) for display. |
| DDB-03 | Create / modify / delete items | `PutItem` (§1.8) + `UpdateItem` (§1.9) + `DeleteItem` (§1.10). Schema-based form D-03/D-06 driven by `AttributeDefinitions` from `DescribeTable`. |
| SQS-01 | Queue list with message count + in-flight | `ListQueues` (§2.1) returns URLs only — must enrich per-row via `GetQueueAttributes(AttributeNames=['ApproximateNumberOfMessages','ApproximateNumberOfMessagesNotVisible'])` (§2.3). |
| SQS-02 | Send + receive (poll) messages | `SendMessage` (§2.5) + `ReceiveMessage` (§2.6) + `DeleteMessage` (§2.7). Manual poll + append list (D-04). |
| SQS-03 | Purge queue | `PurgeQueue` (§2.8). Backend clears immediately (`sqs.py:459–463`) — no 60s lock in this implementation (see Pitfall 7.4). |
| GEN-01 | Schema-driven generic list | `ServiceDescriptor.list` + `GenericListPage` (§5). |
| GEN-02 | Generic detail as JSON | `ServiceDescriptor.detail` + `GenericDetailPanel` (§5). |
| GEN-03 | Add descriptor → new service UI | Registry + route wildcard (§5.3). Rebuild required (D-01 accepted). |

## Project Constraints (from CLAUDE.md)

- **Stack lock:** React 19 + Cloudscape 3 (`3.0.1266` pinned) + TypeScript 5.7+ + Vite 6 + React Router 7 library mode + TanStack Query 5 + Zustand 5 + ky 1.x. **Do not bump.**
- **Zero new npm dependencies in Phase 5** (Registry Safety — inherited from Phases 3/4). No `json-schema-form`, no `react-json-view`, no `fast-xml-parser` (use the existing DOMParser util pattern from Phase 3), no SQS/DDB SDK (speak the REST wire ourselves through `ky`).
- **No Tailwind / CSS Modules; no hex or px literals in components** — Cloudscape design tokens only.
- **Python backend minimal-dependency philosophy** — **no backend changes expected** in Phase 5. All needed REST surface already exists.
- **Light mode only** (dark mode = Phase 5's sibling workstream DIFF-02, separate plan).
- **Desktop only** (≥ 720 px).
- **GSD workflow** enforced; direct edits outside a GSD command are forbidden.
- **Golden principles:** immutability (spread over mutation), small files (< 800 lines / <50 lines per function), validate at boundaries (JSON payload + descriptor input schema), TDD (RED → GREEN → IMPROVE), surgical changes.
- **CRITICAL per CLAUDE.md → Web Fetching:** never use the built-in WebFetch in this project — use `mcp__jina-reader__*` or `mcp__fetch__fetch`. (N/A to Phase 5 runtime — applies to future research sessions.)

## Standard Stack

**No new libraries — inherited from Phase 1/2/3/4.**

### Core
| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| `@cloudscape-design/components` | 3.0.1266 | `Table`, `Modal`, `Tabs`, `Form`, `FormField`, `Input`, `Textarea`, `Select`, `RadioGroup`, `Toggle`, `KeyValuePairs`, `Alert`, `Spinner`, `CopyToClipboard`, `Flashbar`, `BreadcrumbGroup`, `AppLayout`, `SpaceBetween`, `Button`, `ButtonDropdown` | AWS's own design system [CITED: Phase 1 STATE.md] |
| `@cloudscape-design/collection-hooks` | (pinned) | `useCollection` for table filter/sort | Phase 3 S3/Phase 4 Lambda precedent |
| `@tanstack/react-query` | 5.x | All server state (tables, queues, descriptors, attributes) | Phase 2 pattern |
| `ky` | 1.14.3 | HTTP for all three subsystems | Already installed |
| `zustand` | 5.x | UI state: payload draft, prefix/filter state, last-poll timestamp | `uiStore.ts` pattern |
| `react-router-dom` | 7.x library mode | Routes `/services/dynamodb`, `/services/sqs`, `/services/:serviceKey` (generic) | Already wired |

### Supporting — browser-native APIs (no npm)
| API | Purpose | When to Use |
|-----|---------|-------------|
| `JSON.parse` / `JSON.stringify` | AttributeValue marshal/unmarshal; descriptor `bodyShape` round-trip; payload preview (D-07) | DDB item codec; generic write preview |
| `DOMParser` | Parse IAM/STS XML responses into typed rows | IAM descriptor; STS descriptor |
| `TextEncoder` + `btoa(String.fromCharCode(...Uint8Array))` | DDB `B` (binary) attribute encode | PutItem with binary attribute (D-06 scope) |
| `atob` + `Uint8Array` | DDB `B` decode for display | Scan/GetItem rendering |
| `URLSearchParams` | Build `application/x-www-form-urlencoded` bodies if SQS form-encoded path is used | Only fallback — primary is JSON (§2) |
| `crypto.randomUUID` | Descriptor-driven form client-side keys | Ephemeral — never sent |

### Alternatives Considered (all rejected)
| Instead of | Could Use | Tradeoff |
|------------|-----------|----------|
| Per-attribute Cloudscape form (D-03) | `@rjsf/core` (JSON-Schema Form) | Violates Registry Safety. Cloudscape Form + conditional FormField covers scalar types with ~100 lines. |
| DOMParser for IAM XML | `fast-xml-parser` | Phase 3 already proved DOMParser sufficient for AWS XML shapes. No new dep. |
| Raw ky per descriptor | `aws-sdk/client-*` (one per service) | Each SDK is ~300 kB+, and we need only 1–3 ops per service. A 40-line adapter function is smaller and type-safe via the descriptor. |
| SQS form-encoded POST | JSON (`X-Amz-Target: AmazonSQS.*`) | Backend supports **both** (`sqs.py:98,107`). JSON is simpler to construct from TypeScript — no `MessageAttribute.1.Name` flattening. **Recommend JSON.** |
| Monaco/CodeMirror for JSON mode toggle | Cloudscape `Textarea` + inline JSON.parse validation | Phase 4 D-04 precedent. No new dep. |
| `react-json-view` for detail panel | `<pre>{JSON.stringify(data, null, 2)}</pre>` + CopyToClipboard | One-line render; collapse = out of scope for Phase 5 (DISP-01 is a separate requirement). |

**Installation:** None. All libraries already installed from Phase 1.

**Version verification:** Not applicable — zero new npm additions. Existing lockfile already pinned in Phase 1.

## Backend REST Inventory

All DDB calls are `POST /` on the AWS endpoint (same-origin). SQS calls are `POST /` (JSON) or `POST /` (form-encoded) — both with optional path-embedded queue URL. IAM/STS calls are `POST /` with form-encoded body (query API). Secrets Manager, SSM, KMS are AWS-JSON (`POST /` + `X-Amz-Target`).

Same-origin routing: the SPA is served from the MiniStack gateway (`:4566`), so all these calls land at `ministack.app.app(scope,...)` which dispatches via `detect_service` (router.py) based on `Authorization` credential scope + `X-Amz-Target` + host.

**Authorization header pattern (required for routing):** Use a dummy SigV4 header with the correct service scope, per existing `lambdaClient.ts`:

```
Authorization: AWS4-HMAC-SHA256 Credential=test/20260417/us-east-1/{SERVICE}/aws4_request
```

Where `{SERVICE}` is `dynamodb`, `sqs`, `iam`, `sts`, `secretsmanager`, `ssm`, or `kms`.

---

### 1. DynamoDB REST Inventory

**Protocol:** AWS-JSON 1.0.
**Verb:** always `POST`.
**Path:** `/` (root). Router sees `X-Amz-Target` prefix `DynamoDB_20120810` → dispatches to `dynamodb.handle_request` (`app.py:97` + `dynamodb.py:164`).
**Headers (all requests):**
```
Authorization: AWS4-HMAC-SHA256 Credential=test/.../dynamodb/aws4_request
X-Amz-Target: DynamoDB_20120810.{Action}
Content-Type: application/x-amz-json-1.0
```

Action dispatch table: `dynamodb.py:173–197` (`handlers` dict).

#### 1.1 ListTables
- **Target:** `DynamoDB_20120810.ListTables`
- **Handler:** `_list_tables` — `dynamodb.py:281–291`
- **Request body:**
  ```json
  { "Limit": 100, "ExclusiveStartTableName": "<last-name-from-prev-page>" }
  ```
  Both fields optional. `Limit` defaults to 100.
- **Response body:**
  ```json
  {
    "TableNames": ["orders", "users"],
    "LastEvaluatedTableName": "users"
  }
  ```
  `LastEvaluatedTableName` present only when page == Limit (line 289–290).

#### 1.2 DescribeTable
- **Target:** `DynamoDB_20120810.DescribeTable`
- **Handler:** `_describe_table` + `_table_description` — `dynamodb.py:274, 331–362`
- **Request:** `{ "TableName": "orders" }`
- **Response:**
  ```json
  {
    "Table": {
      "TableName": "orders",
      "KeySchema": [{"AttributeName":"pk","KeyType":"HASH"},
                    {"AttributeName":"sk","KeyType":"RANGE"}],
      "AttributeDefinitions": [{"AttributeName":"pk","AttributeType":"S"},
                               {"AttributeName":"sk","AttributeType":"S"}],
      "TableStatus": "ACTIVE",
      "CreationDateTime": 1713350000.0,
      "ItemCount": 0,
      "TableSizeBytes": 0,
      "TableArn": "arn:aws:dynamodb:us-east-1:000000000000:table/orders",
      "TableId": "<uuid>",
      "ProvisionedThroughput": {"ReadCapacityUnits":5,"WriteCapacityUnits":5},
      "BillingModeSummary": {"BillingMode":"PROVISIONED"},
      "GlobalSecondaryIndexes": [ /* if any */ ],
      "LocalSecondaryIndexes": [ /* if any */ ],
      "WarmThroughput": {"ReadUnitsPerSecond":0,"WriteUnitsPerSecond":0,"Status":"ACTIVE"}
    }
  }
  ```
- **UI consumption:** `AttributeDefinitions` drives the D-03/D-06 form: each entry maps to a typed FormField (S → Input text, N → Input numeric, B → FileUpload/base64 textarea, BOOL → Toggle, NULL → checkbox). **Attributes not in `AttributeDefinitions` are user-added columns** — the form defaults them to `S` per Pitfall 7.10.

#### 1.3 CreateTable
- **Target:** `DynamoDB_20120810.CreateTable`
- **Handler:** `_create_table` — `dynamodb.py:209–258`
- **Request:**
  ```json
  {
    "TableName": "orders",
    "KeySchema": [
      {"AttributeName":"pk","KeyType":"HASH"},
      {"AttributeName":"sk","KeyType":"RANGE"}
    ],
    "AttributeDefinitions": [
      {"AttributeName":"pk","AttributeType":"S"},
      {"AttributeName":"sk","AttributeType":"S"}
    ],
    "BillingMode": "PAY_PER_REQUEST"
  }
  ```
  `BillingMode` accepted values: `PROVISIONED` (default) or `PAY_PER_REQUEST` (line 254). `ProvisionedThroughput` required only when billing mode is `PROVISIONED` — backend accepts it as optional (defaults applied).
- **Response:** `{ "TableDescription": { ...same shape as DescribeTable.Table... } }`
- **UI scope:** Phase 5 CreateTable modal asks only for TableName, one PK (name + type), optional SK (name + type), BillingMode. GSI/LSI **deferred** per CONTEXT.

#### 1.4 DeleteTable
- **Target:** `DynamoDB_20120810.DeleteTable`
- **Handler:** `_delete_table` — `dynamodb.py:261–271`
- **Request:** `{ "TableName": "orders" }`
- **Response:** `{ "TableDescription": { ...with TableStatus:"DELETING"... } }`
- **UI:** Type-to-confirm modal per Phase 3 pattern.

#### 1.5 Scan
- **Target:** `DynamoDB_20120810.Scan`
- **Handler:** `_scan` — `dynamodb.py:573–629`
- **Request:**
  ```json
  {
    "TableName": "orders",
    "Limit": 50,
    "FilterExpression": "#status = :st",
    "ExpressionAttributeNames": {"#status":"status"},
    "ExpressionAttributeValues": {":st":{"S":"pending"}},
    "ExclusiveStartKey": {"pk":{"S":"..."},"sk":{"S":"..."}}
  }
  ```
- **Response:**
  ```json
  {
    "Items": [ { "pk":{"S":"abc"}, "name":{"S":"x"}, "count":{"N":"3"} } ],
    "Count": 1,
    "ScannedCount": 1,
    "LastEvaluatedKey": {"pk":{"S":"..."},"sk":{"S":"..."}}
  }
  ```
  `LastEvaluatedKey` is **a map of attribute values** — NOT a token string (line 626). Client must `JSON.stringify` it for URL/state storage (Pitfall 7.2).

#### 1.6 Query
- **Target:** `DynamoDB_20120810.Query`
- **Handler:** `_query` — `dynamodb.py:498–570`
- **Request:**
  ```json
  {
    "TableName": "orders",
    "KeyConditionExpression": "#pk = :pkv",
    "ExpressionAttributeNames": {"#pk":"pk"},
    "ExpressionAttributeValues": {":pkv":{"S":"customer-1"}},
    "Limit": 50
  }
  ```
  Optional: `IndexName` (GSI/LSI — **NOT exercised by Phase 5 UI** per CONTEXT Deferred Ideas); `ScanIndexForward`; `ExclusiveStartKey`; `FilterExpression`; `Select:"COUNT"`.
- **Response:** Same shape as Scan. `LastEvaluatedKey` also a map.
- **UI scope for Phase 5:** Query is reachable from the Items tab only if the table has a sort key (per-table capability detection from `DescribeTable.KeySchema`). The index selector UI is deferred — client always queries the base table.

#### 1.7 GetItem
- **Target:** `DynamoDB_20120810.GetItem`
- **Handler:** `_get_item` — `dynamodb.py:398–414`
- **Request:**
  ```json
  { "TableName": "orders",
    "Key": {"pk":{"S":"abc"}, "sk":{"S":"2026-04-17"}} }
  ```
- **Response:**
  ```json
  { "Item": {"pk":{"S":"abc"}, "sk":{"S":"..."}, "name":{"S":"..."}} }
  ```
  Missing item → `{}` with no `Item` key (line 411 conditional).

#### 1.8 PutItem
- **Target:** `DynamoDB_20120810.PutItem`
- **Handler:** `_put_item` — `dynamodb.py:369–395`
- **Request:**
  ```json
  {
    "TableName": "orders",
    "Item": {"pk":{"S":"abc"},"sk":{"S":"..."},"count":{"N":"5"},"ok":{"BOOL":true}},
    "ReturnValues": "NONE"
  }
  ```
  `ConditionExpression` **deferred** per CONTEXT. Phase 5 sends `ReturnValues: "NONE"` for create, `"ALL_OLD"` for edit if server-side echo needed.
- **Response:** `{}` (when ReturnValues=NONE) or `{ "Attributes": {...} }` (ALL_OLD).

#### 1.9 UpdateItem
- **Target:** `DynamoDB_20120810.UpdateItem`
- **Handler:** `_update_item` — `dynamodb.py:446–491`
- **Request:**
  ```json
  {
    "TableName": "orders",
    "Key": {"pk":{"S":"abc"},"sk":{"S":"..."}},
    "UpdateExpression": "SET #n = :n, #c = :c",
    "ExpressionAttributeNames": {"#n":"name","#c":"count"},
    "ExpressionAttributeValues": {":n":{"S":"updated"},":c":{"N":"6"}},
    "ReturnValues": "ALL_NEW"
  }
  ```
  **Phase 5 simplification:** the schema-based edit form (D-03) constructs its own `UpdateExpression` with `SET` only (no `REMOVE`, `ADD`, `DELETE`). One SET clause per dirty field.
- **Response:** `{ "Attributes": {...all new attributes...} }` when ReturnValues=ALL_NEW.

#### 1.10 DeleteItem
- **Target:** `DynamoDB_20120810.DeleteItem`
- **Handler:** `_delete_item` — `dynamodb.py:417–443`
- **Request:** `{ "TableName":"orders", "Key":{"pk":{"S":"abc"},"sk":{"S":"..."}} }`
- **Response:** `{}` (or `{"Attributes": ...}` if `ReturnValues:"ALL_OLD"`).

---

### 2. SQS REST Inventory

**Protocol:** The backend supports **both** JSON (`sqs.py:98–104`) and legacy Query (`sqs.py:107–115`). **Recommendation: client uses JSON** for Phase 5.

**Verb:** `POST`
**Path:** `/` (root). `X-Amz-Target: AmazonSQS.{Action}` selects JSON path.
**Headers:**
```
Authorization: AWS4-HMAC-SHA256 Credential=test/.../sqs/aws4_request
X-Amz-Target: AmazonSQS.{Action}
Content-Type: application/x-amz-json-1.0
```

If the client ever needs the Query path (not in Phase 5 plan), body is `application/x-www-form-urlencoded` with `Action={name}&QueueUrl=...&MessageBody=...` and nested lists flattened as `MessageAttribute.1.Name=foo&MessageAttribute.1.Value.DataType=String&MessageAttribute.1.Value.StringValue=bar`.

Action dispatch table: `sqs.py:548–566`.

#### 2.1 ListQueues
- **Target:** `AmazonSQS.ListQueues`
- **Handler:** `_act_list_queues` — `sqs.py:220–225`
- **Request:** `{ "QueueNamePrefix": "dev-", "MaxResults": 1000 }` (both optional)
- **Response:** `{ "QueueUrls": ["http://localhost:4566/000000000000/dev-orders", ...] }`
- **UI enrichment:** list page fans out one `GetQueueAttributes` per URL in parallel (`useQueries`) to show counts for SQS-01.

#### 2.2 GetQueueUrl
- **Target:** `AmazonSQS.GetQueueUrl`
- **Handler:** `_act_get_queue_url` — `sqs.py:228–234`
- **Request:** `{ "QueueName": "dev-orders" }`
- **Response:** `{ "QueueUrl": "http://localhost:4566/000000000000/dev-orders" }`
- **UI use:** recovering URL from name when user navigates directly to `/services/sqs/<name>`.

#### 2.3 GetQueueAttributes (critical for SQS-01)
- **Target:** `AmazonSQS.GetQueueAttributes`
- **Handler:** `_act_get_queue_attributes` — `sqs.py:433–443` + `_refresh_counts` at `sqs.py:608–621`
- **Request:**
  ```json
  { "QueueUrl": "http://localhost:4566/000000000000/dev-orders",
    "AttributeNames": ["ApproximateNumberOfMessages",
                       "ApproximateNumberOfMessagesNotVisible",
                       "ApproximateNumberOfMessagesDelayed",
                       "QueueArn",
                       "CreatedTimestamp",
                       "VisibilityTimeout",
                       "MaximumMessageSize",
                       "MessageRetentionPeriod"] }
  ```
  Or `["All"]` for everything.
- **Response:**
  ```json
  {
    "Attributes": {
      "QueueArn": "arn:aws:sqs:us-east-1:000000000000:dev-orders",
      "CreatedTimestamp": "1713350000",
      "ApproximateNumberOfMessages": "5",
      "ApproximateNumberOfMessagesNotVisible": "1",
      "ApproximateNumberOfMessagesDelayed": "0",
      "VisibilityTimeout": "30",
      "MaximumMessageSize": "262144",
      "MessageRetentionPeriod": "345600",
      "DelaySeconds": "0",
      "ReceiveMessageWaitTimeSeconds": "0"
    }
  }
  ```
  All values are strings (line 205 `str(v)`), even the counts. Client parses `Number()` for display.

#### 2.4 CreateQueue
- **Target:** `AmazonSQS.CreateQueue`
- **Handler:** `_act_create_queue` — `sqs.py:161–209`
- **Request:**
  ```json
  { "QueueName": "dev-orders",
    "Attributes": { "VisibilityTimeout": "30",
                    "MessageRetentionPeriod": "345600" } }
  ```
  FIFO if `QueueName` ends with `.fifo` OR `Attributes.FifoQueue == "true"` (line 168). FIFO UI **deferred** per CONTEXT.
- **Response:** `{ "QueueUrl": "http://localhost:4566/000000000000/dev-orders" }`

#### 2.5 SendMessage
- **Target:** `AmazonSQS.SendMessage`
- **Handler:** `_act_send_message` — `sqs.py:239–319`
- **Request:**
  ```json
  {
    "QueueUrl": "http://localhost:4566/000000000000/dev-orders",
    "MessageBody": "hello",
    "DelaySeconds": 0,
    "MessageAttributes": {
      "trace-id": { "DataType": "String", "StringValue": "abc-123" },
      "retry":    { "DataType": "Number", "StringValue": "2" }
    }
  }
  ```
  In JSON wire form the attributes are a plain object. **Flattened form (`MessageAttribute.1.Name=…`) is only for the Query path.**
- **Response:** `{ "MessageId":"<uuid>", "MD5OfMessageBody":"...", "MD5OfMessageAttributes":"..." }`

#### 2.6 ReceiveMessage (critical for SQS-02 / D-04)
- **Target:** `AmazonSQS.ReceiveMessage`
- **Handler:** `_act_receive_message` — `sqs.py:324–366`
- **Request per D-04:**
  ```json
  { "QueueUrl": "http://localhost:4566/000000000000/dev-orders",
    "MaxNumberOfMessages": 10,
    "WaitTimeSeconds": 0,
    "VisibilityTimeout": 30,
    "MessageAttributeNames": ["All"],
    "AttributeNames": ["All"] }
  ```
  `WaitTimeSeconds: 0` is the key D-04 knob — no long-poll blocking.
- **Response (when at least one message visible):**
  ```json
  {
    "Messages": [
      { "MessageId":"<uuid>",
        "ReceiptHandle":"<uuid>",
        "MD5OfBody":"...",
        "Body":"hello",
        "Attributes": { "SenderId":"000000000000","SentTimestamp":"1713350000000" },
        "MessageAttributes": {
          "trace-id":{"DataType":"String","StringValue":"abc-123"}
        },
        "MD5OfMessageAttributes":"..."
      }
    ]
  }
  ```
  Empty poll returns `{}` with **no `Messages` key** (line 366).

#### 2.7 DeleteMessage
- **Target:** `AmazonSQS.DeleteMessage`
- **Handler:** `_act_delete_message` — `sqs.py:371–385`
- **Request:**
  ```json
  { "QueueUrl":"http://localhost:4566/000000000000/dev-orders",
    "ReceiptHandle":"<uuid>" }
  ```
  ReceiptHandle in THIS backend is a bare UUID (line 635 `new_uuid()`), so URL-encoding is not strictly required — but AWS produces URL-unsafe tokens in production. **Client should URL-encode defensively** (Pitfall 7.4) so the code works against both.
- **Response:** `{}`

#### 2.8 PurgeQueue
- **Target:** `AmazonSQS.PurgeQueue`
- **Handler:** `_act_purge_queue` — `sqs.py:459–463`
- **Request:** `{ "QueueUrl":"..." }`
- **Response:** `{}`
- **Backend note:** MiniStack's purge is **immediate** — it just clears the list (line 462). It does **not** enforce the AWS 60-second cooldown (no `PurgeInProgress` error). **UI must be defensive** and show the flashbar success but **not assume** cooldown in this environment (Pitfall 7.4); documentation should nonetheless warn users that against real AWS a 60s cooldown applies.

#### 2.9 DeleteQueue
- **Target:** `AmazonSQS.DeleteQueue`
- **Handler:** `_act_delete_queue` — `sqs.py:212–217`
- **Request:** `{ "QueueUrl":"..." }`
- **Response:** `{}`
- **UI:** type-to-confirm modal (Phase 3 pattern).

---

### 3. DynamoDB AttributeValue Wire Format

Every item attribute in requests and responses is a **tagged union** with exactly one of these keys:

| Tag | Wire shape | TS model type | Form input (D-06) |
|-----|------------|---------------|-------------------|
| `S` | `{"S":"hello"}` | `{ S: string }` | `Input` (text) |
| `N` | `{"N":"42"}` — **number kept as string** to preserve DDB's arbitrary-precision semantics | `{ N: string }` | `Input` (numeric) — client validates `Number(x)` finite |
| `BOOL` | `{"BOOL":true}` | `{ BOOL: boolean }` | `Toggle` |
| `NULL` | `{"NULL":true}` | `{ NULL: true }` | checkbox |
| `B` | `{"B":"<base64>"}` | `{ B: string }` | `FileUpload` + base64 encode, OR textarea labelled "base64" |
| `L` | `{"L":[{"S":"a"},...]}` | `{ L: AttributeValue[] }` | **JSON mode only** (D-06) |
| `M` | `{"M":{"k":{"S":"v"}}}` | `{ M: Record<string,AttributeValue> }` | **JSON mode only** |
| `SS` | `{"SS":["a","b"]}` | `{ SS: string[] }` | **JSON mode only** |
| `NS` | `{"NS":["1","2"]}` | `{ NS: string[] }` | **JSON mode only** |
| `BS` | `{"BS":["<b64>","<b64>"]}` | `{ BS: string[] }` | **JSON mode only** |

**Marshal/unmarshal contract (what the codec module exposes):**
```ts
type AttributeValue =
  | { S: string } | { N: string } | { BOOL: boolean } | { NULL: true }
  | { B: string }
  | { L: AttributeValue[] } | { M: Record<string, AttributeValue> }
  | { SS: string[] } | { NS: string[] } | { BS: string[] }

type Item = Record<string, AttributeValue>

// For the form: convert a native JS value + declared type -> AttributeValue
export function marshalScalar(value: string | number | boolean | null,
                              type: 'S' | 'N' | 'BOOL' | 'NULL' | 'B'): AttributeValue

// For display: flatten AttributeValue -> string for table cells
export function renderAttributeValue(av: AttributeValue): string
```

Backend never *coerces* numeric strings back to numbers (`dynamodb.py` passes through). Client must format on display.

---

### 4. Generic Framework — 5 Descriptor Services

The five descriptors split by wire adapter. Every backend file below was verified to expose at minimum ListX + GetX for the descriptor to populate list and detail views.

#### 4.1 IAM (adapter: `aws-query` XML)

**Wire:** `POST /` with body `application/x-www-form-urlencoded`, body shape: `Action={Op}&Version=2010-05-08&{params}`. Authorization scope `iam`. Router: `iam_sts.py:97–107`. Response is **XML**.

- **ListUsers** — `_list_users` (`iam_sts.py:152–162`). Body: `Action=ListUsers&PathPrefix=/`. Response XML:
  ```xml
  <ListUsersResponse xmlns="...">
   <ListUsersResult>
    <Users>
     <member>
      <UserName>alice</UserName>
      <UserId>AIDA...</UserId>
      <Arn>arn:aws:iam::000000000000:user/alice</Arn>
      <Path>/</Path>
      <CreateDate>2026-04-17T...</CreateDate>
     </member>
    </Users>
    <IsTruncated>false</IsTruncated>
   </ListUsersResult>
  </ListUsersResponse>
  ```
  Descriptor `parseResponse` walks `//ListUsersResult/Users/member` via DOMParser.
- **ListRoles** — `_list_roles` (`iam_sts.py:218–228`). Similar shape; members include `AssumeRolePolicyDocument` URL-encoded.
- **ListPolicies** — `_list_policies` (`iam_sts.py:408–421`). Members contain `PolicyName`, `Arn`, `AttachmentCount`.
- **GetUser** — `_get_user` (`iam_sts.py:132–149`). Body: `Action=GetUser&UserName=alice`.
- **GetRole** — `_get_role` (`iam_sts.py:208–215`).
- **GetPolicy** — `_get_policy` (`iam_sts.py:309–316`). Body uses `PolicyArn`.

**Phase 5 scope:** Users + Roles + Policies as three separate descriptor modules under `services/iam/` — or one descriptor with three resource types. **Recommendation: single descriptor per resource TYPE** because the generic framework's list page operates on one list endpoint at a time. IAM ships three descriptors (`iamUsersDescriptor`, `iamRolesDescriptor`, `iamPoliciesDescriptor`) registered under sub-keys `iam.users`, `iam.roles`, `iam.policies`. See §5.3 for registry routing.

Helpers required by the `aws-query` adapter:
- `encodeFormBody(params: Record<string,string>): string` — `URLSearchParams` serialization.
- `parseAwsQueryListMembers(xml: string, resultTag: string, collectionTag: string, memberFields: string[]): Row[]` — single reusable function for every AWS XML Query response.

#### 4.2 STS (adapter: `aws-query` XML, **singleton** resource)

**Wire:** same as IAM, credential scope `sts`. Router: `iam_sts.py:1289–1296`.

- **GetCallerIdentity** — `iam_sts.py:1297–1304`. Body `Action=GetCallerIdentity`. Response:
  ```xml
  <GetCallerIdentityResponse xmlns="...">
   <GetCallerIdentityResult>
    <Arn>arn:aws:iam::000000000000:root</Arn>
    <UserId>000000000000</UserId>
    <Account>000000000000</Account>
   </GetCallerIdentityResult>
  </GetCallerIdentityResponse>
  ```

STS has no "list" — the whole service is one singleton record. The descriptor framework must **handle this case**: either via a `detailOnly: true` flag on the descriptor, or by modeling the list as a one-row synthetic list. **Recommendation:** add an optional `descriptor.kind: 'list' | 'singleton'` discriminant (default `'list'`). When `singleton`, the generic framework skips the list page and routes `/services/sts` directly to `GenericDetailPanel` backed by `detail.endpoint`.

#### 4.3 Secrets Manager (adapter: `aws-json`)

**Wire:** `POST /` + `X-Amz-Target: secretsmanager.{Action}` (note: lowercase `secretsmanager` prefix per `router.py:52` pattern). Credential scope `secretsmanager`. Router: `secretsmanager.py:128–135`. JSON in, JSON out.

- **ListSecrets** — `_list_secrets` (`secretsmanager.py:282–331`). Request: `{"MaxResults":100}`. Response:
  ```json
  {
    "SecretList": [
      { "ARN":"arn:aws:secretsmanager:...:secret:db-creds-a1b2c3",
        "Name":"db-creds",
        "Description":"",
        "CreatedDate": 1713350000.0,
        "LastChangedDate": 1713350000.0,
        "LastAccessedDate": null,
        "Tags": [],
        "SecretVersionsToStages": {"<vid>":["AWSCURRENT"]},
        "RotationEnabled": false }
    ],
    "NextToken": "<base64>"
  }
  ```
- **DescribeSecret** — `_describe_secret` (`secretsmanager.py:430`). Request: `{"SecretId":"db-creds"}` (name or ARN). Response: same per-secret shape plus `VersionIdsToStages`.
- **GetSecretValue** — `_get_secret_value` (`secretsmanager.py:209`). **Phase 5 scope note:** secrets are plaintext in the local emulator; D-05 UI shows metadata only by default. A "Reveal value" action (read-only) MAY be exposed via `GetSecretValue`. **Safest default: descriptor detail = DescribeSecret (metadata only), with optional "Reveal" button wired to GetSecretValue.** Out of v1 scope if contentious.

#### 4.4 SSM (adapter: `aws-json`)

**Wire:** `POST /` + `X-Amz-Target: AmazonSSM.{Action}`. Credential scope `ssm`. Router: `ssm.py:72–80`.

- **DescribeParameters** — `_describe_parameters` (`ssm.py:263–313`). Request: `{"MaxResults":50}`. Response:
  ```json
  {
    "Parameters": [
      { "Name":"/app/db/password",
        "Type":"SecureString",
        "Version":1,
        "LastModifiedDate": 1713350000.0,
        "LastModifiedUser":"arn:aws:iam::000000000000:root",
        "ARN":"arn:aws:ssm:us-east-1:000000000000:parameter/app/db/password",
        "DataType":"text",
        "Description":"",
        "Tier":"Standard" }
    ],
    "NextToken":"..."
  }
  ```
- **GetParameter** — `_get_parameter` (`ssm.py:173–181`). Request: `{"Name":"/app/db/password","WithDecryption":false}`. Response: `{ "Parameter": { Name, Type, Value, Version, LastModifiedDate, ARN, DataType } }`.
  **SecureString values are prefixed `ENCRYPTED:<base64>`** when not decrypted (`ssm.py:125`). UI shows a masked value for SecureString unless the user opts in.

#### 4.5 KMS (adapter: `aws-json`)

**Wire:** `POST /` + `X-Amz-Target: TrentService.{Action}` — note the `TrentService` prefix (not `KMS`; `kms.py:805` + `router.py`). Credential scope `kms`.

- **ListKeys** — `_list_keys` (`kms.py:217–223`). Request: `{"Limit":1000}`. Response:
  ```json
  { "Keys":[ {"KeyId":"<uuid>", "KeyArn":"arn:aws:kms:us-east-1:000000000000:key/<uuid>"} ],
    "Truncated": false }
  ```
- **DescribeKey** — `_describe_key` (`kms.py:226–231`). Request: `{"KeyId":"<uuid>"}`. Response:
  ```json
  { "KeyMetadata": {
      "KeyId":"<uuid>",
      "Arn":"arn:aws:kms:us-east-1:000000000000:key/<uuid>",
      "CreationDate": 1713350000.0,
      "Enabled": true,
      "Description":"",
      "KeyUsage":"ENCRYPT_DECRYPT",
      "KeyState":"Enabled",
      "Origin":"AWS_KMS",
      "KeyManager":"CUSTOMER",
      "KeySpec":"SYMMETRIC_DEFAULT",
      "EncryptionAlgorithms":["SYMMETRIC_DEFAULT"],
      "SigningAlgorithms":[]
  }}
  ```

**KMS key ID format:** `kms.py` creates KeyId via `new_uuid()` (standard v4 UUID with hyphens). Descriptor `parseResponse` must **treat `KeyId` as an opaque string** — no validation beyond non-empty.

---

### 5. ServiceDescriptor Type — Concrete Proposal

#### 5.1 Adapter discriminant

Three wire protocols, enumerated:
```ts
export type Adapter = 'rest' | 'aws-json' | 'aws-query'
```
- `aws-json`: DDB/SecretsManager/SSM/KMS-style. Caller provides `target` (X-Amz-Target); adapter sends `POST /` with JSON body + correct `Content-Type: application/x-amz-json-1.0` and credential scope.
- `aws-query`: IAM/STS-style. Caller provides `action`; adapter sends `POST /` with `application/x-www-form-urlencoded` body and parses XML response.
- `rest`: reserved for future services (e.g., Route53 `GET /2013-04-01/hostedzone`). Not used by Phase 5's five descriptors but kept in the union for forward compatibility.

#### 5.2 Full descriptor interface

```ts
// web/src/services/_generic/types.ts

export type ColumnDefinition<Row = unknown> = {
  id: string
  header: string
  cell: (row: Row) => React.ReactNode
  sortingField?: string
  width?: number
}

export type ListEndpoint =
  | {
      adapter: 'aws-json'
      target: string                    // X-Amz-Target full value
      credentialScope: string           // e.g. 'kms', 'secretsmanager'
      defaultBody?: Record<string, unknown>
    }
  | {
      adapter: 'aws-query'
      action: string                    // e.g. 'ListUsers'
      version: string                   // e.g. '2010-05-08'
      credentialScope: string           // 'iam' or 'sts'
      defaultParams?: Record<string, string>
    }
  | {
      adapter: 'rest'
      method: 'GET' | 'POST'
      path: string
      credentialScope: string
    }

export type DetailEndpoint =
  | (ListEndpoint & { adapter: 'aws-json'; buildBody: (id: string) => object })
  | (ListEndpoint & { adapter: 'aws-query'; buildParams: (id: string) => Record<string, string> })
  | (ListEndpoint & { adapter: 'rest'; buildPath: (id: string) => string })

export type MutationSpec =
  | { adapter: 'aws-json'; target: string; credentialScope: string
      bodyShape: JsonBodyShape }                           // for generated form
  | { adapter: 'aws-query'; action: string; version: string
      credentialScope: string; paramShape: ParamShape }
  | { adapter: 'rest'; method: 'POST'|'PUT'|'DELETE'; path: string
      credentialScope: string; bodyShape?: JsonBodyShape }

export type JsonBodyShape = {
  // Field order preserved for form rendering. Exactly one field per UI input.
  fields: Array<{
    name: string
    kind: 'string' | 'number' | 'boolean' | 'json'
    required: boolean
    label: string
    placeholder?: string
  }>
}

export type ServiceDescriptor<Row = Record<string, unknown>> = {
  serviceKey: string                 // URL slug: 'iam.users', 'kms', 'sts', ...
  displayName: string                // Sidebar label
  kind?: 'list' | 'singleton'        // default 'list'; 'singleton' = STS
  idField: string                    // Row field that uniquely identifies — e.g. 'UserName', 'KeyId'
  list: {
    endpoint: ListEndpoint
    parseResponse: (raw: unknown) => Row[]
    columns: ColumnDefinition<Row>[]
    emptyStateCopy?: { title: string; subtitle: string }
  }
  detail?: {
    endpoint: DetailEndpoint
    parseResponse: (raw: unknown) => Record<string, unknown>
  }
  mutations?: {
    create?: MutationSpec & { successFlashbar: string }
    delete?: { endpoint: MutationSpec; typeToConfirmField: keyof Row & string
               successFlashbar: string }
  }
}
```

The `parseResponse` function lives on the **descriptor** (not the framework), because the shape of each service's list response is service-specific. The adapter merely delivers the raw payload (parsed JSON or raw XML string) to the parser.

#### 5.3 Registry, routing, dynamic import

```ts
// web/src/services/_generic/registry.ts
import type { ServiceDescriptor } from './types'
import { iamUsersDescriptor }    from '../iam/descriptor.users'
import { iamRolesDescriptor }    from '../iam/descriptor.roles'
import { iamPoliciesDescriptor } from '../iam/descriptor.policies'
import { stsDescriptor }         from '../sts/descriptor'
import { secretsDescriptor }     from '../secretsmanager/descriptor'
import { ssmDescriptor }         from '../ssm/descriptor'
import { kmsDescriptor }         from '../kms/descriptor'

export const GENERIC_DESCRIPTORS: Record<string, ServiceDescriptor> = {
  'iam.users':       iamUsersDescriptor,
  'iam.roles':       iamRolesDescriptor,
  'iam.policies':    iamPoliciesDescriptor,
  'sts':             stsDescriptor,
  'secretsmanager':  secretsDescriptor,
  'ssm':             ssmDescriptor,
  'kms':             kmsDescriptor,
}
```

**Route ordering (CRITICAL — Pitfall 6.1):**
```tsx
// web/src/router.tsx (or equivalent)
<Routes>
  <Route path="/services/s3/*"       element={<S3Layout/>}/>
  <Route path="/services/ec2/*"      element={<EC2Layout/>}/>
  <Route path="/services/lambda/*"   element={<LambdaLayout/>}/>
  <Route path="/services/dynamodb/*" element={<DDBLayout/>}/>       {/* NEW Phase 5 */}
  <Route path="/services/sqs/*"      element={<SQSLayout/>}/>       {/* NEW Phase 5 */}
  {/* Generic wildcard MUST be last — matches any other serviceKey */}
  <Route path="/services/:serviceKey/*" element={<GenericServiceRouter/>}/>
</Routes>
```

`GenericServiceRouter` reads the `:serviceKey` param, looks up `GENERIC_DESCRIPTORS[serviceKey]`, and renders:
- `kind === 'singleton'` → `GenericDetailPanel` only.
- `kind === 'list'` → `GenericListPage` at index, `GenericDetailPanel` at `/services/:serviceKey/:id`.

IAM must expose three sidebar entries under the `IAM` service heading — the sidebar config reads from `GENERIC_DESCRIPTORS` keys prefixed `iam.`. **Alternative considered and rejected:** one IAM descriptor with a `tabs: ResourceTab[]` array. Rejected because it specializes the framework for IAM's multi-resource case and bloats the descriptor type. Three independent descriptors keep the framework orthogonal.

#### 5.4 Worked example: IAM Users descriptor

```ts
// web/src/services/iam/descriptor.users.ts
import type { ServiceDescriptor } from '../_generic/types'

type IamUserRow = { UserName: string; UserId: string; Arn: string
                    Path: string; CreateDate: string }

export const iamUsersDescriptor: ServiceDescriptor<IamUserRow> = {
  serviceKey: 'iam.users',
  displayName: 'IAM · Users',
  kind: 'list',
  idField: 'UserName',
  list: {
    endpoint: {
      adapter: 'aws-query',
      action: 'ListUsers',
      version: '2010-05-08',
      credentialScope: 'iam',
    },
    parseResponse: (raw) => {
      // raw is string (XML). Framework delivers it as-is for aws-query.
      const doc = new DOMParser().parseFromString(raw as string, 'application/xml')
      const members = Array.from(doc.querySelectorAll('ListUsersResult > Users > member'))
      return members.map((m): IamUserRow => ({
        UserName:  m.querySelector('UserName')?.textContent ?? '',
        UserId:    m.querySelector('UserId')?.textContent ?? '',
        Arn:       m.querySelector('Arn')?.textContent ?? '',
        Path:      m.querySelector('Path')?.textContent ?? '/',
        CreateDate: m.querySelector('CreateDate')?.textContent ?? '',
      }))
    },
    columns: [
      { id: 'UserName', header: 'User name', cell: (r) => r.UserName,
        sortingField: 'UserName' },
      { id: 'Path', header: 'Path', cell: (r) => r.Path },
      { id: 'Arn', header: 'ARN', cell: (r) => r.Arn },
      { id: 'CreateDate', header: 'Created', cell: (r) => r.CreateDate },
    ],
    emptyStateCopy: {
      title: 'No IAM users',
      subtitle: 'Create a user to get started.',
    },
  },
  detail: {
    endpoint: {
      adapter: 'aws-query',
      action: 'GetUser',
      version: '2010-05-08',
      credentialScope: 'iam',
      buildParams: (userName) => ({ UserName: userName }),
    },
    parseResponse: (raw) => {
      const doc = new DOMParser().parseFromString(raw as string, 'application/xml')
      const u = doc.querySelector('GetUserResult > User')
      return {
        UserName:  u?.querySelector('UserName')?.textContent ?? '',
        UserId:    u?.querySelector('UserId')?.textContent ?? '',
        Arn:       u?.querySelector('Arn')?.textContent ?? '',
        Path:      u?.querySelector('Path')?.textContent ?? '/',
        CreateDate: u?.querySelector('CreateDate')?.textContent ?? '',
      }
    },
  },
  mutations: {
    create: {
      adapter: 'aws-query',
      action: 'CreateUser',
      version: '2010-05-08',
      credentialScope: 'iam',
      paramShape: {
        fields: [
          { name: 'UserName', kind: 'string', required: true, label: 'User name' },
          { name: 'Path',     kind: 'string', required: false, label: 'Path',
            placeholder: '/' },
        ],
      },
      successFlashbar: 'User created.',
    },
    delete: {
      endpoint: {
        adapter: 'aws-query',
        action: 'DeleteUser',
        version: '2010-05-08',
        credentialScope: 'iam',
        paramShape: {
          fields: [
            { name: 'UserName', kind: 'string', required: true, label: 'User name' },
          ],
        },
      },
      typeToConfirmField: 'UserName',
      successFlashbar: 'User deleted.',
    },
  },
}
```

#### 5.5 Worked example: KMS Keys descriptor

```ts
// web/src/services/kms/descriptor.ts
import type { ServiceDescriptor } from '../_generic/types'

type KmsKeyRow = { KeyId: string; KeyArn: string }

export const kmsDescriptor: ServiceDescriptor<KmsKeyRow> = {
  serviceKey: 'kms',
  displayName: 'KMS',
  kind: 'list',
  idField: 'KeyId',
  list: {
    endpoint: {
      adapter: 'aws-json',
      target: 'TrentService.ListKeys',
      credentialScope: 'kms',
      defaultBody: { Limit: 1000 },
    },
    parseResponse: (raw) => {
      const data = raw as { Keys?: KmsKeyRow[] }
      return data.Keys ?? []
    },
    columns: [
      { id: 'KeyId',  header: 'Key ID', cell: (r) => r.KeyId },
      { id: 'KeyArn', header: 'ARN',    cell: (r) => r.KeyArn },
    ],
    emptyStateCopy: { title: 'No KMS keys', subtitle: 'Create a key from the CLI.' },
  },
  detail: {
    endpoint: {
      adapter: 'aws-json',
      target: 'TrentService.DescribeKey',
      credentialScope: 'kms',
      buildBody: (keyId) => ({ KeyId: keyId }),
    },
    parseResponse: (raw) => (raw as { KeyMetadata: Record<string, unknown> }).KeyMetadata,
  },
  // No mutations → KMS is read-only in Phase 5 per D-02.
}
```

#### 5.6 Adapter signatures

```ts
// web/src/services/_generic/adapters/awsJson.ts
export async function awsJsonCall(args: {
  target: string
  credentialScope: string
  body: object
}): Promise<unknown>       // returns parsed JSON

// web/src/services/_generic/adapters/awsQuery.ts
export async function awsQueryCall(args: {
  action: string
  version: string
  credentialScope: string
  params: Record<string, string>
}): Promise<string>        // returns raw XML string (descriptor parses)

// web/src/services/_generic/adapters/rest.ts
export async function restCall(args: {
  method: 'GET'|'POST'|'PUT'|'DELETE'
  path: string
  credentialScope: string
  body?: unknown
  searchParams?: Record<string, string>
}): Promise<unknown>
```

Each adapter **only** handles transport. Parsing stays on the descriptor. This keeps the adapter boundary crisp and testable in isolation.

---

### 6. TanStack Query Keys (proposal)

```ts
// web/src/services/ddb/api/ddbKeys.ts
export const ddbKeys = {
  all:                                 ['ddb'] as const,
  tables:            ()                => ['ddb', 'tables'] as const,
  table:             (name: string)    => ['ddb', 'table', name] as const,
  scan: (name: string,
         filter: string | null,
         eskJson: string | null)      => ['ddb', 'scan', name, filter ?? null,
                                           eskJson ?? null] as const,
  query: (name: string,
          pkValue: string,
          eskJson: string | null)     => ['ddb', 'query', name, pkValue,
                                           eskJson ?? null] as const,
  item: (name: string, pkJson: string)
                                       => ['ddb', 'item', name, pkJson] as const,
} as const
```

```ts
// web/src/services/sqs/api/sqsKeys.ts
export const sqsKeys = {
  all:                             ['sqs'] as const,
  queues: (prefix?: string)        => ['sqs', 'queues', prefix ?? null] as const,
  queue:  (url: string)            => ['sqs', 'queue', url] as const,
  attributes: (url: string)        => ['sqs', 'attributes', url] as const,
  // Messages are NOT queried — D-04 append-on-poll means messages live in Zustand
  // (uiStore.sqsMessages[url]: Message[]), not in TanStack Query cache.
} as const
```

```ts
// web/src/services/_generic/keys.ts
export const genericKeys = {
  all:                                      ['generic'] as const,
  list: (serviceKey: string)               => ['generic', serviceKey, 'list'] as const,
  item: (serviceKey: string, id: string)   => ['generic', serviceKey, 'item', id] as const,
} as const
```

**Pitfall 6.3 applies:** after a mutation, invalidate **exactly one** key bucket — do not blanket-invalidate `['ddb']`. E.g., PutItem invalidates `ddbKeys.scan(name, ...)` family by prefix, not the entire DDB tree.

---

### 7. Pitfalls

#### 7.1 Carried from Phase 3 / 4
1. **Route ordering.** The generic wildcard `/services/:serviceKey/*` **MUST** be registered last — after `s3`, `ec2`, `lambda`, `dynamodb`, `sqs`. A wildcard that matches first silently defeats the dedicated pages. (Pitfall 2 in Phase 3 RESEARCH.)
2. **Registry Safety.** No new npm dependencies in Phase 5. `npm ls` before and after each wave must be diff-clean. Phase 4 shipped zero new deps; Phase 5 must do the same.
3. **Single `invalidateQueries` per mutation success.** Over-invalidation causes table re-fetch storms. (Phase 4 Pitfall.) E.g., `sqsKeys.attributes(url)` after PurgeQueue — not all of `['sqs']`.
4. **Payload state reset across navigation.** D-04 SQS message list must reset on queue-URL change; DDB JSON-mode editor must reset when the user switches items. Phase 4 `FunctionDetailPage` lifts payload state to the page and `useEffect([routeParam])` resets it — clone the pattern.
5. **Log/header UTF-8 decoding** — not directly applicable (DDB/SQS are JSON in body, no header tricks like Lambda's `X-Amz-Log-Result`). However the DDB `B` AttributeValue IS base64 over `Uint8Array` — the atob/btoa+TextDecoder pattern from Phase 4 transfers directly.

#### 7.2 New — Phase 5 specific

1. **DDB AttributeValue `N` is a string on the wire.** `{"N":"42"}` — forgetting this breaks sorting and numeric comparison in the UI. The renderer must `Number(value)` at display time only; marshaling accepts number OR string and always stringifies. *Regression to watch:* `Number("01")` vs `"01"` in sort order.

2. **DDB Scan `LastEvaluatedKey` is a map of AttributeValues, not an opaque token.** (Verified: `dynamodb.py:626` returns `_build_key(...)` which is `{pk:{S:...}, sk:{S:...}}`.) Unlike S3's `NextContinuationToken` (a string), this cannot be passed back raw through a URL or Zustand without serialization. Client must `JSON.stringify` to store, `JSON.parse` to restore, and place the object on the next request's `ExclusiveStartKey`. *Test:* round-trip through Zustand; open devtools and verify the serialized state is legible.

3. **SQS form-encoded flattening pitfall (only if Query path is used).** Nested list attributes map to keys `MessageAttribute.1.Name`, `.1.Value.DataType`, `.1.Value.StringValue`, `.2.Name`, ... It is easy to start indexing at 0 (boto3-style off-by-one: AWS uses 1-based). **Mitigation: Phase 5 client uses AWS-JSON path, where attributes are a plain object** — side-stepping this entire class of bug. Only relevant if a future phase reverts to Query for some reason.

4. **SQS ReceiptHandle URL-encoding and PurgeQueue cooldown.**
   - ReceiptHandle in MiniStack is a bare UUID; in real AWS it can contain `+`, `/`, `=`. Always `encodeURIComponent(handle)` when embedding in a URL; when placing in a JSON body no encoding is needed. **Recommendation:** Phase 5 sends ReceiptHandle only in JSON bodies (never URL parameters), eliminating the encoding concern for this phase.
   - PurgeQueue: MiniStack has **no 60s cooldown** (verified: `sqs.py:459–463` is an unconditional `.clear()`). The UI should not implement a client-side lockout either — successful flashbar + invalidate `sqsKeys.attributes(url)` is sufficient. But documentation must note that against real AWS a `PurgeInProgress` error within 60s is expected; users of the MiniStack UI might be surprised when the same operation fails in production.

5. **Generic descriptor rebuild requirement.** CONTEXT D-01 accepts this: a new descriptor module requires `npm run build` (or Vite dev-server HMR trigger). The Human UAT script must include a step: "Add `web/src/services/hypothetical/descriptor.ts`; confirm it appears after a page reload." Descriptor hot-reload is deferred.

6. **Generic CRUD JSON preview must match exactly what the adapter sends.** D-07: the "Review request" panel displays the literal request body. If the adapter subsequently mutates the body (e.g., adds `Version=2010-05-08` to IAM Query params), the preview is a lie. **Enforcement:** the adapter exposes a `buildRequest(spec, input): { url, headers, body }` pure function separate from the transport call — the preview panel calls `buildRequest` and then the "Send" click calls `fetch(buildRequest.url, ...)` with the same object. Never preview-then-rebuild.

7. **STS singleton vs list-pattern assumption.** The framework's default code path assumes a list page exists. STS has none. The `kind: 'singleton'` discriminant (§5.2) routes `/services/sts` straight to `GenericDetailPanel`. Forgetting this branch will either (a) render an empty table or (b) crash on `parseResponse` receiving the Get response shape instead of a List shape.

8. **KMS key IDs are opaque.** Backend uses `new_uuid()` (36-char UUID v4). Real AWS can use shorter strings or ARNs interchangeably. Descriptor must only **pass `KeyId` through** — never parse it, never assume format. `DescribeKey` accepts `KeyId`, `Arn`, or `alias/X`; pass whatever `idField` returns.

9. **DDB form input type inference from `AttributeDefinitions`.** `DescribeTable` returns `AttributeDefinitions` listing only **key and index** attributes (`pk`, `sk`, GSI keys). The vast majority of item attributes are user-authored and NOT declared. The form must:
   - Read `AttributeDefinitions` for known-typed fields (render typed input).
   - For all other fields, default to type `S` with an adjacent Select to override to N/BOOL/NULL/B.
   - Default ordering: declared keys first, then alphabetical.

10. **Secrets Manager "Reveal value" UX ambiguity.** D-05 spec says "GetSecretValue (or just metadata)". Research recommendation: detail shows **metadata only** (from DescribeSecret); a secondary button labelled "Reveal current value" calls GetSecretValue on demand and displays in a confirmation modal. Prevents unintended secret exposure in the detail JSON blob.

11. **SSM SecureString masking.** `ssm.py:125` stores SecureString values prefixed `ENCRYPTED:<b64>`. `GetParameter` with `WithDecryption: false` returns the prefixed string; with `true` the backend still returns the plaintext (`_param_out` in `ssm.py:490–509` handles the decode). UI should **default to masked** (`WithDecryption:false`) and require a Reveal click to show the decrypted value.

12. **Parallel `GetQueueAttributes` fan-out (SQS-01).** `useQueries` with 50+ queues will fire 50+ concurrent requests. MiniStack is single-process and can handle it, but UX-wise the list should render optimistically with count "—" and fill in per queue as responses arrive. Alternative: serial via `useQuery` + `enabled` gating (slower UX). **Recommend parallel** for MiniStack — the backend is local and latency is sub-ms.

13. **Cloudscape `Toggle` for DDB BOOL vs `NULL` type.** BOOL is boolean; NULL is a marker that the attribute exists but has no value. A single Toggle cannot express NULL. **Solution:** each D-06 form field has an adjacent Select (S/N/B/BOOL/NULL). When NULL is selected, the value input hides and the wire form emits `{NULL:true}`.

---

### 8. File / Module Inventory Proposal

Target: 50+ source + 50+ test files across three service roots. Each source file ≤ 200 lines typical, 400 max; each gets a sibling `.test.ts` / `.test.tsx` per Phase 3/4 Wave 0 convention. Planner will slice into 5–7 waves.

#### 8.1 `web/src/services/_generic/` (new — shared framework)

Source:
- `types.ts` — `ServiceDescriptor`, `ColumnDefinition`, `MutationSpec`, etc.
- `registry.ts` — descriptor map (imports all 7 descriptors)
- `GenericServiceRouter.tsx` — resolves `:serviceKey` to descriptor, branches on `kind`
- `GenericListPage.tsx` — table + empty state + create button
- `GenericDetailPanel.tsx` — `<pre>{JSON.stringify}</pre>` + CopyToClipboard
- `GenericCreateModal.tsx` — form rendered from `mutations.create.bodyShape`/`paramShape`
- `GenericDeleteModal.tsx` — type-to-confirm + JSON preview
- `GenericDiffPreviewModal.tsx` — D-07 "Review request" panel (reusable for create/delete)
- `columnBuilders.ts` — arn, timestamp, copyable-id helpers
- `adapters/awsJson.ts` — AWS-JSON transport
- `adapters/awsQuery.ts` — AWS-Query transport (form-encoded body, XML response)
- `adapters/rest.ts` — REST transport (Phase 5 unused but reserved)
- `adapters/buildRequest.ts` — pure request-assembly (for D-07 preview)
- `hooks/useGenericList.ts` — wraps `useQuery` + adapter + `parseResponse`
- `hooks/useGenericItem.ts` — wraps `useQuery` for detail endpoint
- `hooks/useGenericMutation.ts` — wraps `useMutation` with preview/send split

Tests: one `.test.ts(x)` per source file. MSW handlers in `_generic/__mocks__/`.

#### 8.2 `web/src/services/ddb/` (new — dedicated)

Source:
- `api/ddbClient.ts` — `ddbJsonCall(target, body)` helper (uses ky; same shape as `lambdaClient`)
- `api/ddbKeys.ts` — TanStack query key factory (§6)
- `api/attributeValue.ts` — marshal/unmarshal AttributeValue (§3)
- `api/useTables.ts` — ListTables
- `api/useTable.ts` — DescribeTable
- `api/useScan.ts` — Scan (with ESK pagination)
- `api/useQuery.ts` — Query (base-table only; no index)
- `api/useItem.ts` — GetItem
- `api/useCreateTable.ts` — mutation
- `api/useDeleteTable.ts` — mutation
- `api/usePutItem.ts` — mutation
- `api/useUpdateItem.ts` — mutation
- `api/useDeleteItem.ts` — mutation
- `DDBLayout.tsx` — AppLayout with breadcrumbs
- `TableListPage.tsx` — Cloudscape Table of tables; Create button
- `TableDetailPage.tsx` — Tabs: Items | Configuration
- `components/ItemsTab.tsx` — scan/query controls + items table
- `components/ConfigurationTab.tsx` — KeySchema / AttributeDefinitions / indexes / BillingMode
- `components/ItemForm.tsx` — per-attribute form (D-03/D-06 scalars)
- `components/ItemJsonEditor.tsx` — JSON advanced-mode Textarea
- `components/ItemTypeSelect.tsx` — S/N/B/BOOL/NULL select widget
- `components/CreateTableModal.tsx`
- `components/DeleteTableModal.tsx` — type-to-confirm
- `components/DeleteItemModal.tsx` — type-to-confirm (on PK+SK string)
- `components/ScanFilterInput.tsx` — filter expression builder (text input for now)
- `copy.ts` — phrases per CLAUDE.md convention

Tests: 1:1 for each file above (~25 tests).

#### 8.3 `web/src/services/sqs/` (new — dedicated)

Source:
- `api/sqsClient.ts` — `sqsJsonCall(target, body)` helper
- `api/sqsKeys.ts` — TanStack query key factory (§6)
- `api/useQueues.ts` — ListQueues + fan-out GetQueueAttributes via `useQueries`
- `api/useQueueAttributes.ts` — single-queue GetQueueAttributes
- `api/useCreateQueue.ts`, `useDeleteQueue.ts`, `useSendMessage.ts`, `useReceiveMessage.ts`, `useDeleteMessage.ts`, `usePurgeQueue.ts`
- `SQSLayout.tsx`
- `QueueListPage.tsx`
- `QueueDetailPage.tsx` — Tabs: Messages | Configuration
- `components/MessagesTab.tsx` — Poll button + accumulating Table (D-04)
- `components/MessageRow.tsx` — message display with Delete action
- `components/ConfigurationTab.tsx` — attributes as `KeyValuePairs`
- `components/SendMessageModal.tsx` — MessageBody textarea + attributes KV editor
- `components/PurgeQueueModal.tsx` — type-to-confirm ("purge")
- `components/CreateQueueModal.tsx`
- `components/DeleteQueueModal.tsx`
- `store/messageStore.ts` — Zustand slice keyed by QueueUrl → `Message[]` (accumulated poll results)
- `copy.ts`

Tests: 1:1 (~18 tests).

#### 8.4 Per-service descriptor modules (new — thin files)

Source (each ~100 lines):
- `web/src/services/iam/descriptor.users.ts`
- `web/src/services/iam/descriptor.roles.ts`
- `web/src/services/iam/descriptor.policies.ts`
- `web/src/services/sts/descriptor.ts`
- `web/src/services/secretsmanager/descriptor.ts`
- `web/src/services/ssm/descriptor.ts`
- `web/src/services/kms/descriptor.ts`
- `web/src/services/_generic/xmlUtils.ts` — reusable `parseMembers(xml, root, collection, fields)` helper for the three IAM descriptors

Tests: 1:1 for each descriptor (covering parseResponse against a golden XML/JSON fixture). 7 descriptor tests + `xmlUtils.test.ts`.

#### 8.5 Router/shell edits

Mutations to existing files (surgical):
- `web/src/router.tsx` (or wherever routes live) — add `/services/dynamodb/*`, `/services/sqs/*`, and the generic wildcard **last**.
- Sidebar / service category config — add sidebar children for `iam.users`, `iam.roles`, `iam.policies` under the IAM heading; ensure STS / Secrets / SSM / KMS appear under correct categories (already defined in `console/registry.py`).
- `web/src/shared/copy.ts` — append Phase 5 phrases.

#### 8.6 Wave slicing (planner's job — this is a suggestion)

- **Wave 0:** MSW handlers + `test.todo` stubs for all ~60 files. Golden XML/JSON fixtures (§9).
- **Wave 1:** Generic framework scaffolding — `types.ts`, adapters, `GenericServiceRouter`, `GenericListPage`, `GenericDetailPanel`.
- **Wave 2:** DDB list + detail (`TableListPage`, `TableDetailPage` shell, Configuration tab).
- **Wave 3:** DDB items — scan/query, AttributeValue codec, ItemForm (D-03/D-06), ItemJsonEditor, Put/Update/Delete item.
- **Wave 4:** SQS list + detail + messages (send/poll/delete/purge), message Zustand store.
- **Wave 5:** Five descriptors — IAM (×3), STS, SecretsManager, SSM, KMS. Generic CRUD modals + D-07 preview wired into IAM Users create/delete.
- **Wave 6:** Copy catalog, empty states, flashbar phrasing, final Human UAT script.

---

### 9. Sample JSON / XML Fixtures (for Wave 0 MSW handlers)

Minimum viable fixtures exercising parsers and shape-binding. All values compact but valid.

#### 9.1 DDB ListTables
```json
{"TableNames":["orders","users"]}
```

#### 9.2 DDB DescribeTable (PK+SK)
```json
{"Table":{"TableName":"orders","KeySchema":[{"AttributeName":"pk","KeyType":"HASH"},{"AttributeName":"sk","KeyType":"RANGE"}],"AttributeDefinitions":[{"AttributeName":"pk","AttributeType":"S"},{"AttributeName":"sk","AttributeType":"S"}],"TableStatus":"ACTIVE","CreationDateTime":1713350000,"ItemCount":3,"TableSizeBytes":512,"TableArn":"arn:aws:dynamodb:us-east-1:000000000000:table/orders","TableId":"11111111-1111-1111-1111-111111111111","ProvisionedThroughput":{"ReadCapacityUnits":5,"WriteCapacityUnits":5},"BillingModeSummary":{"BillingMode":"PAY_PER_REQUEST"}}}
```

#### 9.3 DDB Scan (3 items, mixed types incl. BOOL)
```json
{"Items":[
 {"pk":{"S":"c-1"},"sk":{"S":"2026-04-01"},"total":{"N":"42"},"paid":{"BOOL":true}},
 {"pk":{"S":"c-1"},"sk":{"S":"2026-04-02"},"total":{"N":"7"},"paid":{"BOOL":false}},
 {"pk":{"S":"c-2"},"sk":{"S":"2026-04-01"},"total":{"N":"19"},"paid":{"NULL":true}}
],"Count":3,"ScannedCount":3}
```

#### 9.4 DDB PutItem (ReturnValues=NONE)
```json
{}
```

#### 9.5 SQS ListQueues
```json
{"QueueUrls":[
 "http://localhost:4566/000000000000/dev-orders",
 "http://localhost:4566/000000000000/dev-events"
]}
```

#### 9.6 SQS GetQueueAttributes
```json
{"Attributes":{
 "QueueArn":"arn:aws:sqs:us-east-1:000000000000:dev-orders",
 "CreatedTimestamp":"1713350000",
 "ApproximateNumberOfMessages":"5",
 "ApproximateNumberOfMessagesNotVisible":"1",
 "ApproximateNumberOfMessagesDelayed":"0",
 "VisibilityTimeout":"30",
 "MaximumMessageSize":"262144",
 "MessageRetentionPeriod":"345600"
}}
```

#### 9.7 SQS ReceiveMessage (1 message + attribute)
```json
{"Messages":[
 {"MessageId":"22222222-2222-2222-2222-222222222222",
  "ReceiptHandle":"33333333-3333-3333-3333-333333333333",
  "MD5OfBody":"5d41402abc4b2a76b9719d911017c592",
  "Body":"hello",
  "Attributes":{"SenderId":"000000000000","SentTimestamp":"1713350000000"},
  "MessageAttributes":{"trace-id":{"DataType":"String","StringValue":"abc-123"}},
  "MD5OfMessageAttributes":"deadbeef"}
]}
```

#### 9.8 IAM ListUsers (XML)
```xml
<?xml version="1.0"?>
<ListUsersResponse xmlns="https://iam.amazonaws.com/doc/2010-05-08/">
 <ListUsersResult>
  <Users>
   <member>
    <UserName>alice</UserName>
    <UserId>AIDAALICE00000000</UserId>
    <Arn>arn:aws:iam::000000000000:user/alice</Arn>
    <Path>/</Path>
    <CreateDate>2026-04-10T00:00:00Z</CreateDate>
   </member>
   <member>
    <UserName>bob</UserName>
    <UserId>AIDABOB00000000000</UserId>
    <Arn>arn:aws:iam::000000000000:user/bob</Arn>
    <Path>/</Path>
    <CreateDate>2026-04-11T00:00:00Z</CreateDate>
   </member>
  </Users>
  <IsTruncated>false</IsTruncated>
 </ListUsersResult>
</ListUsersResponse>
```

#### 9.9 STS GetCallerIdentity (XML, singleton)
```xml
<?xml version="1.0"?>
<GetCallerIdentityResponse xmlns="https://sts.amazonaws.com/doc/2011-06-15/">
 <GetCallerIdentityResult>
  <Arn>arn:aws:iam::000000000000:root</Arn>
  <UserId>000000000000</UserId>
  <Account>000000000000</Account>
 </GetCallerIdentityResult>
</GetCallerIdentityResponse>
```

#### 9.10 KMS ListKeys
```json
{"Keys":[
 {"KeyId":"44444444-4444-4444-4444-444444444444","KeyArn":"arn:aws:kms:us-east-1:000000000000:key/44444444-4444-4444-4444-444444444444"},
 {"KeyId":"55555555-5555-5555-5555-555555555555","KeyArn":"arn:aws:kms:us-east-1:000000000000:key/55555555-5555-5555-5555-555555555555"}
],"Truncated":false}
```

#### 9.11 Secrets Manager ListSecrets
```json
{"SecretList":[
 {"ARN":"arn:aws:secretsmanager:us-east-1:000000000000:secret:db-creds-a1b2c3",
  "Name":"db-creds","Description":"","CreatedDate":1713350000,"LastChangedDate":1713350000,
  "LastAccessedDate":null,"Tags":[],"SecretVersionsToStages":{"v1":["AWSCURRENT"]},
  "RotationEnabled":false}
]}
```

#### 9.12 SSM DescribeParameters
```json
{"Parameters":[
 {"Name":"/app/db/password","Type":"SecureString","Version":1,
  "LastModifiedDate":1713350000,
  "LastModifiedUser":"arn:aws:iam::000000000000:root",
  "ARN":"arn:aws:ssm:us-east-1:000000000000:parameter/app/db/password",
  "DataType":"text","Description":"","Tier":"Standard"}
]}
```

---

## Validation Architecture

### Test Framework
| Property | Value |
|----------|-------|
| Framework | Vitest + React Testing Library + MSW (inherited from Phase 1) |
| Config file | `web/vitest.config.ts` (existing) |
| Quick run command | `cd web && npm test -- --run` |
| Full suite command | `cd web && npm test -- --run --coverage` |

### Phase Requirements → Test Map
| Req ID | Behavior | Test Type | Automated Command | File Exists? |
|--------|----------|-----------|-------------------|-------------|
| DDB-01 | List tables, describe with KeySchema | unit + integration | `npm test -- ddb/api/useTables useTable` | ❌ Wave 0 |
| DDB-02 | Scan/query returns items with AttributeValue | unit | `npm test -- ddb/api/useScan attributeValue` | ❌ Wave 0 |
| DDB-03 | Put/Update/Delete item round-trip | unit | `npm test -- ddb/api/usePutItem useUpdateItem useDeleteItem` | ❌ Wave 0 |
| SQS-01 | Queue list with counts | unit | `npm test -- sqs/api/useQueues useQueueAttributes` | ❌ Wave 0 |
| SQS-02 | Send, poll, delete message flow | unit | `npm test -- sqs/api/useSendMessage useReceiveMessage useDeleteMessage` | ❌ Wave 0 |
| SQS-03 | PurgeQueue clears message list | unit | `npm test -- sqs/api/usePurgeQueue` | ❌ Wave 0 |
| GEN-01 | List page renders from descriptor | unit | `npm test -- _generic/GenericListPage` | ❌ Wave 0 |
| GEN-02 | Detail JSON panel | unit | `npm test -- _generic/GenericDetailPanel` | ❌ Wave 0 |
| GEN-03 | New descriptor → UI without code edits | integration | `npm test -- _generic/registry` (+ fixture descriptor) | ❌ Wave 0 |

### Sampling Rate
- **Per task commit:** `cd web && npm test -- --run <changed-area>`
- **Per wave merge:** `cd web && npm test -- --run`
- **Phase gate:** Full suite green before `/gsd-verify-work`.

### Wave 0 Gaps
- [ ] `web/src/services/ddb/__tests__/` — scaffold per file listed in §8.2
- [ ] `web/src/services/sqs/__tests__/` — scaffold per file listed in §8.3
- [ ] `web/src/services/_generic/__tests__/` — scaffold per file listed in §8.1
- [ ] `web/src/services/{iam,sts,secretsmanager,ssm,kms}/__tests__/descriptor.test.ts` — golden-fixture tests
- [ ] MSW handlers in `web/src/test/msw/handlers.ts` covering every fixture in §9
- [ ] Fixture files in `web/src/test/fixtures/{ddb,sqs,iam,sts,kms,secretsmanager,ssm}/`

No framework install needed — Vitest + MSW already in `package.json` from Phase 1.

## Security Domain

### Applicable ASVS Categories (local dev tool — security_enforcement inherited from Phase 1 stance)

| ASVS Category | Applies | Standard Control |
|---------------|---------|-----------------|
| V2 Authentication | no | Local emulator; dummy SigV4 header only (`lambdaClient.ts` pattern). No real auth. |
| V3 Session Management | no | Same-origin SPA, no sessions. |
| V4 Access Control | no | Local tool — no multi-tenant boundary. |
| V5 Input Validation | yes | Descriptor field validation, JSON.parse guarding, AttributeValue type coercion at boundary. |
| V6 Cryptography | no | MiniStack KMS is a stub. Never assume crypto confidentiality from this emulator. |

### Known Threat Patterns for local SPA + local AWS gateway

| Pattern | STRIDE | Standard Mitigation |
|---------|--------|---------------------|
| XSS via unescaped JSON field rendered as HTML | Tampering | Cloudscape components escape by default; custom `<pre>` uses `{JSON.stringify(...)}` — inherently escaped as text. |
| Arbitrary JSON injection via the descriptor `bodyShape` write path | Tampering | D-07 mandates JSON-diff preview; user cannot submit blindly. |
| Accidental secret exposure in DOM | Information disclosure | SSM SecureString + Secrets Manager values default **masked**; reveal requires explicit click (Pitfall 7.10/7.11). |
| Malformed XML from backend crashing DOMParser | DoS (of UI) | Descriptor `parseResponse` wrapped in try/catch by framework; render Alert on parse failure. |
| URL-unsafe ReceiptHandle in query string | Tampering | Phase 5 sends ReceiptHandle in JSON bodies only; URL encoding not required (Pitfall 7.4). |

## Architecture Patterns

### Recommended Project Structure (Phase 5 additions)
```
web/src/
├── services/
│   ├── _generic/            # NEW — shared descriptor framework
│   │   ├── types.ts
│   │   ├── registry.ts
│   │   ├── GenericServiceRouter.tsx
│   │   ├── GenericListPage.tsx
│   │   ├── GenericDetailPanel.tsx
│   │   ├── GenericCreateModal.tsx
│   │   ├── GenericDeleteModal.tsx
│   │   ├── GenericDiffPreviewModal.tsx
│   │   ├── xmlUtils.ts
│   │   ├── adapters/
│   │   │   ├── awsJson.ts
│   │   │   ├── awsQuery.ts
│   │   │   ├── rest.ts
│   │   │   └── buildRequest.ts
│   │   └── hooks/
│   │       ├── useGenericList.ts
│   │       ├── useGenericItem.ts
│   │       └── useGenericMutation.ts
│   ├── ddb/                 # NEW — dedicated
│   ├── sqs/                 # NEW — dedicated
│   ├── iam/                 # NEW — 3 descriptors
│   ├── sts/                 # NEW — singleton descriptor
│   ├── secretsmanager/      # NEW — descriptor
│   ├── ssm/                 # NEW — descriptor
│   └── kms/                 # NEW — descriptor
```

### Pattern 1: Descriptor as pure data + pure parsers
**What:** each descriptor is a single `const` export with only pure functions (`parseResponse`, `buildParams`, `cell` renderers). No side effects, no hooks.
**When:** every service wired through the generic framework.
**Why:** pure descriptors are trivially testable with golden fixtures; the framework/hooks consume them without coupling.

### Pattern 2: Separate `buildRequest` from `send` (D-07 enforcement)
**What:** adapter exposes `buildRequest(spec, input)` returning `{url, headers, body}` and `send(request)` performing transport. Preview UI calls `buildRequest` only. Submit UI calls `send(request)`.
**Why:** the preview text is guaranteed to match the wire bytes.

### Pattern 3: Typed Union for AttributeValue
**What:** `type AttributeValue = {S:string} | {N:string} | {BOOL:boolean} | {NULL:true} | {B:string} | ...`
**When:** every DDB Item read/write.
**Why:** TypeScript exhaustiveness checks catch missing cases in switch statements when new types are added.

### Anti-Patterns to Avoid
- **Descriptor emitting React components.** Keep descriptors pure-data; React stays in the framework.
- **Sharing a single adapter for all three protocols via string enum switch inside it.** One adapter file per protocol — keeps test files focused.
- **Auto-polling SQS.** Explicitly rejected by D-04.
- **Dynamic import of descriptors.** D-01 accepts rebuild; don't over-engineer a dynamic loader.
- **Caching SQS messages in TanStack Query.** D-04 says append-on-poll — use Zustand for that state so refetch does not replace it.

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| XML parsing | Regex-based member extractor | `DOMParser.parseFromString(..., 'application/xml')` | Built into the browser. Already proven in Phase 3 S3 client. |
| Form-encoded body | Manual `&key=${encodeURIComponent(v)}` strings | `new URLSearchParams(obj).toString()` | Handles nested keys, `+` vs `%20`, empty values correctly. |
| Base64 ↔ Uint8Array | Hand-crafted bit-shifting | `btoa`/`atob` + `Uint8Array.from(atob(s), c => c.charCodeAt(0))` | Browser-native, covered in Phase 4 for log decoding. |
| AttributeValue marshaling | Recursive map with dynamic `typeof` branches all over the app | Single `attributeValue.ts` module exporting `marshal/unmarshal` | 80-line pure module; one code path to audit. |
| Type-to-confirm modal | New per-service implementation | Phase 2 `DeleteModal` / Phase 3 `DeleteBucketModal` template | Proven pattern, same copy style. |
| Timestamp formatting | New helper per component | Phase 4's inline `Intl.RelativeTimeFormat` (D-10) — promoted to `shared/format/time.ts` opportunistically | Consistency. Out-of-scope extraction if it balloons; keep inline otherwise. |

**Key insight:** every "parse this AWS response" problem looks one-off until the third service. The generic framework's parsers, adapters, and XML utils must be deliberately shared across all seven descriptors.

## Assumptions Log

| # | Claim | Section | Risk if Wrong |
|---|-------|---------|---------------|
| A1 | AWS-JSON path on the DDB client (`X-Amz-Target: DynamoDB_20120810.*`) is supported — verified via `dynamodb.py:164,199` [VERIFIED]. | §1 | None — verified. |
| A2 | SQS JSON path (`X-Amz-Target: AmazonSQS.*`) supported — verified `sqs.py:98–104` [VERIFIED]. | §2 | None — verified. |
| A3 | IAM / STS remain XML Query only (no JSON facade) — verified `iam_sts.py:97–107, 1289–1296` [VERIFIED]. | §4.1, §4.2 | None — verified. Confirms need for `aws-query` adapter. |
| A4 | Secrets Manager target prefix is lowercase `secretsmanager.*` per router pattern in `router.py` [CITED: router.py §48–52]. AWS SDKs actually use `secretsmanager.{Action}` for target header. | §4.3 | LOW — if the backend dispatches by action suffix only (`data.split(".")[-1]`, verified at `secretsmanager.py:130`), prefix is irrelevant. Works either way. |
| A5 | KMS target prefix is `TrentService.{Action}` (AWS canonical) — verified implicitly by `router.py` prefixes pattern and `kms.py:806` splitting on `.`. | §4.5 | LOW — backend uses suffix dispatch, would tolerate `KMS.ListKeys` too. |
| A6 | `GetQueueAttributes` parallel fan-out (§7.12) is acceptable UX-wise for up to ~50 queues [ASSUMED]. | §7.12 | MEDIUM — if users commonly have 100+ queues this could be janky. Mitigation: serialize via `concurrencyLimit` of 10 if UAT reveals a problem. |
| A7 | Secrets Manager / SSM values should default **masked** in the detail panel with explicit reveal click [ASSUMED based on best practice]. | §7.10, §7.11 | MEDIUM — user may prefer immediate visibility in a local dev tool. **Confirm in discuss-phase or planner review.** |
| A8 | IAM is split into three descriptors (Users, Roles, Policies) registered as `iam.users`, `iam.roles`, `iam.policies` [ASSUMED preference]. | §4.1, §5.3 | LOW — alternative is one descriptor with tabs; either works. Framework stays cleaner with multiple descriptors. **Confirm with planner.** |
| A9 | SQS client uses JSON wire format over form-encoded Query [RECOMMENDED]. | §2 | LOW — both paths are backend-supported; JSON is strictly simpler. **Confirm with planner; research recommends JSON.** |
| A10 | DDB UpdateItem form constructs `SET`-only `UpdateExpression` [ASSUMED scope simplification]. | §1.9 | LOW — removes `REMOVE`/`ADD`/`DELETE` which matches D-03's "scalar form" scope. Users who need those operators drop to JSON mode (same escape hatch as complex types). |
| A11 | MiniStack PurgeQueue has no 60s cooldown unlike real AWS — verified `sqs.py:459–463` [VERIFIED]. UI matches backend (no client-side lockout). | §7.4 | None — verified. Documentation note for users remains. |

**Table says 7 assumptions (A6–A10) need planner / discuss-phase confirmation.** Others verified against source.

## Open Questions

1. **Secrets Manager / SSM default visibility (mask vs reveal).**
   - What we know: backend returns plaintext (MiniStack is local, no crypto boundary).
   - What's unclear: does the user want default-masked with a Reveal button, or default-visible?
   - Recommendation: default-masked + Reveal button. Local tool, but the masking practice costs nothing and prevents accidental screen-share leaks.

2. **IAM descriptor granularity.**
   - What we know: IAM has 3 distinct resource types (Users, Roles, Policies) with independent CRUD.
   - What's unclear: one descriptor with tabs, or three sibling descriptors under sub-keys?
   - Recommendation: **three descriptors.** Keeps the framework orthogonal; `Record<serviceKey, ServiceDescriptor>` registry stays flat.

3. **SQS wire format (JSON vs Query).**
   - What we know: backend accepts both.
   - What's unclear: is there a reason to prefer Query?
   - Recommendation: **JSON.** Simpler client code, no flattening pitfall.

4. **Generic `mutations.update`.**
   - What we know: D-02 lists `create` and `delete` only.
   - What's unclear: does IAM Update {Role, AssumeRolePolicy} fit Phase 5?
   - Recommendation: **out of scope — deferred.** D-02 explicitly enumerates Create/Delete as the CRUD toggle. Update via the generic framework is a Phase 6 addition.

5. **DDB JSON-mode editor — is a plain Textarea sufficient, or must it auto-format?**
   - What we know: Phase 4 D-04 accepted Textarea + realtime `JSON.parse` validation as sufficient for Lambda payload.
   - What's unclear: do users expect pretty-print on load?
   - Recommendation: call `JSON.stringify(item, null, 2)` when switching from form to JSON mode. Validate + inline error on submit. Same pattern as Phase 4 Invoke payload.

6. **Route `/services/iam` with no suffix — what renders?**
   - What we know: IAM has three descriptors at `iam.users`, `iam.roles`, `iam.policies`.
   - What's unclear: landing at `/services/iam` — redirect to `iam.users`? Hub page listing the three?
   - Recommendation: redirect to `/services/iam/users` (default). Hub would duplicate the sidebar.

## Environment Availability

| Dependency | Required By | Available | Version | Fallback |
|------------|------------|-----------|---------|----------|
| Node.js | Vite build + tests | ✓ (existing Phase 1) | ≥ 20 | — |
| npm | Package manager | ✓ | — | — |
| Vitest | Test runner | ✓ | from package.json | — |
| MSW | Test mocks | ✓ | from package.json | — |
| MiniStack Python backend (running) | Dev & Human UAT | ✓ (Phase 1 dev loop) | local | — |

No external tools or new services needed.

## Code Examples

Verified patterns to clone.

### Example 1 — ky client with scoped Authorization (DDB variant)

```ts
// web/src/services/ddb/api/ddbClient.ts
import { apiClient } from '../../../shared/api/client'

const ORIGIN = typeof window !== 'undefined' && window.location?.origin
  ? window.location.origin : ''

export const DDB_AUTH =
  'AWS4-HMAC-SHA256 Credential=test/20260417/us-east-1/dynamodb/aws4_request'

export async function ddbJsonCall<T>(target: string, body: object): Promise<T> {
  return apiClient
    .post(`${ORIGIN}/`, {
      headers: {
        Authorization: DDB_AUTH,
        'X-Amz-Target': target,
        'Content-Type': 'application/x-amz-json-1.0',
      },
      body: JSON.stringify(body),
    })
    .json<T>()
}
```
Source pattern: `web/src/services/lambda/api/lambdaClient.ts` [VERIFIED].

### Example 2 — AttributeValue codec (scalar-only per D-06)

```ts
// web/src/services/ddb/api/attributeValue.ts
export type AttributeValueScalar =
  | { S: string } | { N: string } | { BOOL: boolean } | { NULL: true }
  | { B: string }

// Convert typed form input to AttributeValue (scalar types only).
export function marshalScalar(
  raw: string | number | boolean | null,
  type: 'S' | 'N' | 'BOOL' | 'NULL' | 'B',
): AttributeValueScalar {
  switch (type) {
    case 'S':    return { S: String(raw) }
    case 'N':    return { N: String(raw) }           // DDB keeps N as string on wire
    case 'BOOL': return { BOOL: Boolean(raw) }
    case 'NULL': return { NULL: true }
    case 'B':    return { B: String(raw) }            // already base64 from caller
  }
}

// For table cell display.
export function renderAttributeValue(av: unknown): string {
  if (!av || typeof av !== 'object') return ''
  const v = av as Record<string, unknown>
  if ('S' in v)    return String(v.S)
  if ('N' in v)    return String(v.N)
  if ('BOOL' in v) return v.BOOL ? 'true' : 'false'
  if ('NULL' in v) return '(null)'
  if ('B' in v)    return `bin(${String(v.B).slice(0, 16)}…)`
  if ('L' in v)    return `[${(v.L as unknown[]).length}]`
  if ('M' in v)    return `{${Object.keys(v.M as object).length}}`
  if ('SS' in v)   return `ss(${(v.SS as unknown[]).length})`
  return JSON.stringify(av)
}
```

### Example 3 — Generic list hook

```ts
// web/src/services/_generic/hooks/useGenericList.ts
import { useQuery } from '@tanstack/react-query'
import { genericKeys } from '../keys'
import { awsJsonCall } from '../adapters/awsJson'
import { awsQueryCall } from '../adapters/awsQuery'
import { restCall } from '../adapters/rest'
import type { ServiceDescriptor } from '../types'

export function useGenericList<Row>(descriptor: ServiceDescriptor<Row>) {
  return useQuery({
    queryKey: genericKeys.list(descriptor.serviceKey),
    queryFn: async () => {
      const ep = descriptor.list.endpoint
      let raw: unknown
      if (ep.adapter === 'aws-json') {
        raw = await awsJsonCall({ target: ep.target,
                                  credentialScope: ep.credentialScope,
                                  body: ep.defaultBody ?? {} })
      } else if (ep.adapter === 'aws-query') {
        raw = await awsQueryCall({ action: ep.action, version: ep.version,
                                   credentialScope: ep.credentialScope,
                                   params: ep.defaultParams ?? {} })
      } else {
        raw = await restCall({ method: ep.method, path: ep.path,
                               credentialScope: ep.credentialScope })
      }
      return descriptor.list.parseResponse(raw)
    },
  })
}
```

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| Per-service hand-rolled pages | Descriptor-driven generic framework | Phase 5 (this phase) | 30+ future services ship as a descriptor-only PR. |
| Form-encoded SQS Query body | AWS-JSON `X-Amz-Target: AmazonSQS.*` | Phase 5 recommendation | Eliminates `Name.1.Value.X` flattening; cleaner client. |
| Axios / aws-sdk per service | `ky` + pure adapter per wire protocol | Phases 1–5 | Smaller bundle; uniform transport layer. |

**Deprecated/outdated:**
- Treating DDB's `N` as a JavaScript number: breaks arbitrary-precision — always string on wire.
- Long-polling SQS Receive from the browser: blocks the fetch, holds the TCP connection; manual poll (D-04) is the current pattern.

## Out of Scope Reminder

From CONTEXT Deferred Ideas (re-listed here so planner does not propose tasks for them):

- DDB complex attribute types (L, M, SS/NS/BS) as first-class form UI
- DDB ConditionExpression UI
- DDB GSI/LSI query UI (IndexName selector)
- DDB Streams UI
- SQS FIFO + DLQ redrive + MessageGroupId form
- SQS message body pretty-printing and base64 toggles
- Generic framework coverage expansion (Cognito, Route53, SNS, CloudFormation, etc.)
- Descriptor hot-reload (Vite HMR on descriptor change)
- Backend `--dry-run` endpoint for generic write preview
- Cross-service resource graph

These remain tracked in ROADMAP backlog.

## Sources

### Primary (HIGH confidence — verified in this session)
- `ministack/services/dynamodb.py:1–629` — lines 164–202 (router), 209–291 (tables), 369–491 (items), 498–629 (Scan/Query), 331–362 (Table description) [VERIFIED]
- `ministack/services/sqs.py:1–670` — lines 92–115 (dual-protocol entry), 161–319 (create/send), 324–366 (receive), 371–463 (delete/purge), 433–443 (attributes), 548–566 (handler registration) [VERIFIED]
- `ministack/services/iam_sts.py:97–422, 1289–1380` — IAM XML Query handlers + STS GetCallerIdentity [VERIFIED]
- `ministack/services/secretsmanager.py:128–331, 430` — JSON dispatch + ListSecrets + DescribeSecret [VERIFIED]
- `ministack/services/ssm.py:72–313, 490–509` — DescribeParameters + SecureString behavior [VERIFIED]
- `ministack/services/kms.py:99–232, 805–850` — ListKeys + DescribeKey + TrentService dispatch [VERIFIED]
- `ministack/core/router.py:1–140` — service detection patterns (credential scope, X-Amz-Target) [VERIFIED]
- `ministack/app.py:92–130, 281–296` — SERVICE_HANDLERS map + Console API exemption [VERIFIED]
- `ministack/console/registry.py` — canonical service taxonomy (IAM/STS/Secrets/SSM/KMS all mapped) [VERIFIED]
- `web/src/services/lambda/api/lambdaClient.ts` + `useFunctions.ts` + `FunctionDetailPage.tsx` — client pattern template [VERIFIED]
- `.planning/phases/04-lambda-service/04-RESEARCH.md` — RESEARCH.md structure to mimic [VERIFIED]
- `.planning/phases/05-dynamodb-sqs-generic/05-CONTEXT.md` — 7 locked decisions [VERIFIED]

### Secondary (CITED from project docs)
- `./CLAUDE.md` — stack lock + no-new-deps + GSD workflow enforcement [CITED]
- `.planning/REQUIREMENTS.md` — DDB-01/02/03, SQS-01/02/03, GEN-01/02/03 wording [CITED]

### Tertiary (not used — no WebSearch/Context7 needed this session)
- AWS SDK documentation for DynamoDB / SQS / IAM / KMS / STS / SSM / Secrets Manager — not consulted because the backend IS the source of truth for this project (MiniStack implements only what it implements; external AWS docs are informational only).

## Metadata

**Confidence breakdown:**
- Backend REST inventory (DDB / SQS / IAM / STS / Secrets Manager / SSM / KMS): **HIGH** — all endpoints verified line-by-line in source.
- ServiceDescriptor type: **HIGH** — direct extension of CONTEXT D-01 shape; three-adapter union validated against backend wire formats.
- Pitfalls: **HIGH** — most carried forward from Phase 3/4 with direct code citations; phase-specific ones verified against backend behavior (PurgeQueue cooldown, LastEvaluatedKey shape).
- Fixtures: **HIGH** — constructed from the exact response-builder code paths.
- Secrets / SSM default-mask UX (§7.10, §7.11): **MEDIUM** — best-practice assumption; planner should confirm.
- IAM multi-descriptor vs tabs (A8): **MEDIUM** — architectural preference; confirm before Wave 5.

**Research date:** 2026-04-17
**Valid until:** 2026-05-17 (30 days — backend is stable, Cloudscape version pinned, no external moving parts)
