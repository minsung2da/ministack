# Phase 4: Lambda Service UI — Research

**Researched:** 2026-04-17
**Domain:** Browser Lambda function management (list, detail, configure, invoke with JSON payload, inspect response + logs) on the established React 19 + Cloudscape + TanStack Query SPA, backed by MiniStack's complete Lambda REST emulator at `ministack/services/lambda_svc.py`.
**Confidence:** HIGH — CONTEXT.md locks 10 decisions; backend inspected line-by-line; every call the UI needs already exists; Phase 3 S3 pattern is a direct analog.

## Summary

Phase 4 is a thin UI layer over a feature-complete Lambda backend. Every REST verb/path the UI needs (`ListFunctions`, `CreateFunction`, `GetFunction`, `GetFunctionConfiguration`, `UpdateFunctionConfiguration`, `UpdateFunctionCode`, `DeleteFunction`, `Invoke`, `ListEventSourceMappings`, `GetFunctionUrlConfig`) is implemented in `lambda_svc.py` `handle_request` (line 432). The backend protocol is **JSON over REST** (not XML like S3, not Query-form like EC2) — so the client is simpler than `s3Client.ts` (no DOMParser) but must handle two unusual things: **base64-encoded log output** returned via the `X-Amz-Log-Result` header, and **function errors** signalled by the `X-Amz-Function-Error` header (not by HTTP status — Lambda invoke returns `200` even when the user function crashes).

The single net-new technical area beyond Phase 3 patterns is **binary-to-base64 code upload**: a `.zip` file on disk must be read with `FileReader.readAsArrayBuffer`, converted to base64, and sent inside JSON as `{ Code: { ZipFile: "<base64>" } }`. This is 20 lines of browser-native code — no `jszip`, no upload library. Everything else (Cloudscape table + modal + SplitPanel + Tabs, TanStack Query keys, route ordering, type-to-confirm delete) is a direct port of Phase 3.

Invoke has cold-start latency: Docker-based runtimes (`_execute_function_docker` line 982) can block for 10–30 s on first call per image while `docker pull` runs. The backend invokes **synchronously** (`RequestResponse`) via `asyncio.to_thread` (line 917) — there is no streaming response and no way for the browser to cancel in-flight work. CONTEXT D-09 already resolves the UX (spinner + time-elapsed copy, no Cancel). This research validates that assumption and documents the honest caveat: AbortController in the browser aborts only the HTTP read, not the container.

**Primary recommendation:** Create `web/src/services/lambda/` mirroring `services/s3/` one-for-one. Build a JSON-only REST client (`lambdaClient.ts`) with `lambdaGet/lambdaPost/lambdaPut/lambdaDelete` helpers; a dedicated `invokeClient.ts` that speaks to the invocation endpoint and decodes the log header via `atob` + `TextDecoder`; a `codeUploadClient.ts` that base64-encodes a `File`; and one TanStack Query hook per read + one mutation per write. Detail page uses Cloudscape `Tabs` (not nested SplitPanel) with four tabs: Configuration / Environment / Triggers / Test. Register routes **before** the `/services/:serviceKey` wildcard.

## User Constraints (from CONTEXT.md)

### Locked Decisions

- **D-01** — Scope: Create + Delete IS included (beyond LAM-01/02/03 requirements). Matches S3 phase completeness.
- **D-02** — Code upload: three mutually-exclusive sources — Zip file (base64 `ZipFile`), S3 bucket+key, Container Image URI. Tiles / RadioGroup for source selection; only relevant inputs shown. Zip preselected.
- **D-03** — Invoke UI placement: Dedicated **Test** tab on detail page. Other tabs: Configuration, Environment, Triggers.
- **D-04** — Payload editor: Cloudscape `Textarea` (monospace, ~300px, resizable) + realtime `JSON.parse` validation. Invalid → inline `FormField` error; Invoke button disabled. Dropdown of sample payloads (empty `{}`, API Gateway v2, S3 put, custom). **No Monaco / CodeMirror.**
- **D-05** — Environment variables in **plaintext** (no masking, no show/hide toggle). Local emulator, no shoulder-surfing threat.
- **D-06** — Invoke result: Response above, Logs below (vertical stack, no tabs). Red `Alert` prepended if `FunctionError: "Handled" | "Unhandled"`.
- **D-07** — Triggers tab: **Read-only** (list + detail). Event source mappings (UUID, source ARN, state, batch size, last processing) + Function URLs (AuthType + URL). No create/edit/delete.
- **D-08** — Versions / Aliases: **Deferred**. All views operate on `$LATEST`. No version selector.
- **D-09** — Invoke loading UX: Inline `Spinner` next to Invoke button with "Invoking... cold start으로 10초+ 걸릴 수 있습니다"; after 3 s elapsed swap to "Still invoking...". **No explicit Cancel button.**
- **D-10** — Time format: Relative + hover absolute ("3 minutes ago" with ISO tooltip). Inline `Intl.RelativeTimeFormat` helper acceptable; Phase 6 will extract to shared util.

### Claude's Discretion

- Test scaffolding approach (Wave 0 test stub pattern matches Phase 3 03-00)
- MSW fixtures for Lambda REST responses
- Exact file split (small-file principle per CLAUDE.md rules)
- Error flashbar copy (match Phase 3 copy catalog style)
- Empty-state copy for the function list

### Deferred Ideas (OUT OF SCOPE)

- Lambda Versions / Aliases management (publish, alias CRUD, traffic-shift)
- Layers management (list/create/delete/attach)
- Triggers CRUD (create/modify/delete event source mappings)
- Permissions / Policy editor
- Function code inline editor (Node.js/Python without re-uploading zip)
- CloudWatch Logs browsing beyond the last invoke's LogResult
- Concurrent executions / reserved concurrency config tab

## Phase Requirements

| ID | Description | Research Support |
|----|-------------|------------------|
| LAM-01 | Function list with runtime / handler / last-modified | `_list_functions` returns `{ Functions: [config, ...], NextMarker? }`. Config includes `FunctionName`, `Runtime`, `Handler`, `LastModified`, `CodeSize`. Cloudscape `Table` + `useCollection`. |
| LAM-02 | Invoke with JSON payload; see response + logs | `POST /2015-03-31/functions/{name}/invocations` with `X-Amz-Invocation-Type: RequestResponse` + `X-Amz-Log-Type: Tail`. Response body is the function's return value; `X-Amz-Log-Result` header carries base64-encoded logs; `X-Amz-Function-Error` header signals Handled/Unhandled. `InvokePanel` owns Textarea + validation + result rendering. |
| LAM-03 | Detail: configuration, environment, triggers | `GetFunction` returns `{ Configuration, Code, Tags, Concurrency? }`. `Configuration` already contains `Environment.Variables`. `ListEventSourceMappings?FunctionName=…` returns `{ EventSourceMappings: [...], NextMarker? }`. `GetFunctionUrlConfig` (singleton per qualifier) + `ListFunctionUrlConfigs` (all qualifiers) enumerate Function URLs. |

## Project Constraints (from CLAUDE.md)

- **Stack lock:** React 19 + Cloudscape 3 + TypeScript 5.7+ + Vite 6 + React Router 7 library mode + TanStack Query 5 + Zustand 5 + ky 1.x. Versions already pinned in Phase 1 — **do not bump**.
- **Zero new npm dependencies in Phase 4** (Registry Safety inherited from Phase 3). No Monaco, no CodeMirror, no `jszip`, no `react-json-view`, no upload library.
- **No Tailwind / no CSS Modules / no hex or px literals in components** — Cloudscape design tokens only.
- **Python backend minimal-dependency philosophy** — no backend changes expected. If any are needed, use stdlib.
- **Light mode only** (dark mode = Phase 5 DIFF-02).
- **Desktop only** (≥ 720 px).
- **GSD workflow:** all file changes go through GSD commands.
- **Golden Principles:** immutability (spread over mutation), small files (< 800 lines), validate at boundaries (JSON payload validation on submit), TDD (RED → GREEN → IMPROVE), surgical changes.

## Standard Stack

Inherited from Phase 1/2/3 — **no new libraries in Phase 4**.

### Core
| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| `@cloudscape-design/components` | 3.0.1266 (pinned Phase 1) | All UI primitives: `Table`, `Modal`, `Tabs`, `Form`, `FormField`, `Input`, `Textarea`, `Select`, `RadioGroup` or `Tiles`, `FileUpload`, `KeyValuePairs`, `Alert`, `Spinner`, `CopyToClipboard`, `Flashbar`, `BreadcrumbGroup`, `AppLayout`, `SpaceBetween` | AWS's own design system [CITED: Phase 1 STATE.md] |
| `@cloudscape-design/collection-hooks` | (Phase 2) | `useCollection` for function-list filtering/sorting | Reused verbatim [CITED: Phase 3 RESEARCH.md] |
| `@cloudscape-design/design-tokens` | 3.x | Space/color/typography tokens | No hardcoded px/hex |
| `@cloudscape-design/global-styles` | 1.x | Global CSS reset | Already imported |
| `@tanstack/react-query` | 5.x | Server state (functions, config, triggers, function URL) | Phase 2 pattern |
| `ky` | 1.14.3 (pinned) | HTTP client for all Lambda calls except Invoke's header-rich response (see below) | Already installed |
| `zustand` | 5.x | UI state: selected detail tab, sample-payload dropdown state | Existing `uiStore.ts` pattern |
| `react-router-dom` | 7.x (library mode) | Routing: `/services/lambda`, `/services/lambda/:functionName` | Already wired |

### Supporting — browser-native APIs (no npm)
| API | Purpose | When to Use |
|-----|---------|-------------|
| `FileReader.readAsArrayBuffer` | Read `.zip` on disk → bytes | `CreateFunctionModal` zip source |
| `btoa` over a binary-string-ified `Uint8Array` | Base64-encode the bytes | Send as `Code.ZipFile` |
| `atob` + `Uint8Array` + `TextDecoder('utf-8')` | Decode `X-Amz-Log-Result` base64 → readable text | Invoke result display |
| `JSON.parse` in try/catch | Realtime payload validation | `PayloadEditor` |
| `AbortController` | Cancel in-flight HTTP fetch | Unmount cleanup only — **does not cancel backend container work** (D-09) |

### Alternatives Considered (all rejected)
| Instead of | Could Use | Tradeoff |
|------------|-----------|----------|
| Cloudscape `Textarea` + `JSON.parse` | Monaco Editor | Monaco is ~2 MB — forbidden by Registry Safety and CONTEXT D-04. |
| Cloudscape `Textarea` + `JSON.parse` | CodeMirror 6 | ~300 kB + AST packages; same prohibition. |
| `FileReader` + manual base64 | `jszip` + client-side zipping | CONTEXT D-02 explicitly: upload is user-provided zip file, NOT client-side zipping. `jszip` adds ~100 kB for zero benefit. |
| `ky` with plain JSON for Invoke | `ky` | Invoke response carries custom headers (`X-Amz-Log-Result`, `X-Amz-Function-Error`) that matter more than the body. Use `ky` but read `response.headers` explicitly (or use raw `fetch` — the choice is a style call; `ky.get(...).response` exposes the same `Response` object). |
| `react-json-view` for response render | `<pre>{JSON.stringify(body, null, 2)}</pre>` | One-line render; no extra dependency. |

**Installation:** None. All libraries already installed.

## Backend REST Inventory

All paths begin with the SDK-standard API version prefix. `lambda_svc.handle_request` (line 432) accepts both `/2015-03-31/...` (functions API) and `/2021-10-31/...` / `/2019-09-25/...` / `/2019-09-30/...` (configs/URLs/provisioned-concurrency); `parts[2]` must equal `"functions"` or `"event-source-mappings"` (any date prefix works because the router only inspects `parts[2]`).

### 1. ListFunctions

- **Verb / path:** `GET /2015-03-31/functions`
- **Router match:** line 553–554 (`method == "GET" and len(parts) == 3`)
- **Handler:** `_list_functions` (line 748)
- **Query params:** `Marker` (function-name cursor — NOT a token; it's the last function name), `MaxItems` (default 50, backend parses as int)
- **Request body:** none
- **Response body:**
  ```json
  {
    "Functions": [
      { "FunctionName": "...", "FunctionArn": "...", "Runtime": "python3.12",
        "Handler": "index.handler", "CodeSize": 1234, "CodeSha256": "<b64>",
        "Description": "", "Timeout": 3, "MemorySize": 128,
        "LastModified": "2026-04-17T10:30:00Z", "Version": "$LATEST",
        "State": "Active", "LastUpdateStatus": "Successful",
        "PackageType": "Zip", "Architectures": ["x86_64"],
        "Environment": { "Variables": {} }, "Layers": [],
        "TracingConfig": { "Mode": "PassThrough" },
        "VpcConfig": { "SubnetIds": [], "SecurityGroupIds": [], "VpcId": "" },
        "DeadLetterConfig": { "TargetArn": "" },
        "RevisionId": "<uuid>", "EphemeralStorage": { "Size": 512 },
        "LoggingConfig": { "LogFormat": "Text", "LogGroup": "/aws/lambda/..." }
      }
    ],
    "NextMarker": "<last-function-name>"   // only when truncated
  }
  ```
  (Full shape per `_build_config` line 322–386.)

### 2. CreateFunction

- **Verb / path:** `POST /2015-03-31/functions`
- **Router match:** line 550–551 (`method == "POST" and len(parts) == 3`)
- **Handler:** `_create_function` (line 639)
- **Query params:** none
- **Request body:** JSON. Mutually-exclusive code source inside `Code`:
  ```json
  {
    "FunctionName": "my-func",
    "Runtime": "python3.12",
    "Role": "arn:aws:iam::000000000000:role/lambda-role",
    "Handler": "index.handler",
    "Description": "",
    "Timeout": 3,
    "MemorySize": 128,
    "Environment": { "Variables": { "KEY": "val" } },
    "Architectures": ["x86_64"],
    "PackageType": "Zip",
    "Code": { "ZipFile": "<base64>" }
      // OR: { "S3Bucket": "bkt", "S3Key": "path/to/code.zip" }
      // OR: { "ImageUri": "public.ecr.aws/…/img:tag" }
    // Optional:
    "Publish": false,
    "Tags": {}
  }
  ```
  Backend logic (lines 654–670): `ImageUri` wins; else `ZipFile` is `base64.b64decode`d; else `S3Bucket` + `S3Key` triggers `_fetch_code_from_s3`. If `ImageUri`, `PackageType` is auto-set to `"Image"`.
- **Response body:** status **201**. Body = the full configuration object (same shape as the `Functions[i]` entry above).

### 3. GetFunction

- **Verb / path:** `GET /2015-03-31/functions/{name}`
- **Router match:** line 609–612
- **Handler:** `_get_function` (line 699)
- **Query params:** `Qualifier` (optional; Phase 4 does not send this — `$LATEST` default)
- **Response body:**
  ```json
  {
    "Configuration": { /* same shape as _build_config output */ },
    "Code": { "RepositoryType": "S3", "Location": "" }
      // OR for image: { "RepositoryType": "ECR", "ImageUri": "..." }
    "Tags": {},
    "Concurrency": { "ReservedConcurrentExecutions": <int> }   // only if set
  }
  ```

### 4. GetFunctionConfiguration

- **Verb / path:** `GET /2015-03-31/functions/{name}/configuration`
- **Router match:** line 614–617
- **Handler:** `_get_function_config` (line 731)
- **Response body:** the bare `Configuration` object (no wrapping `Code`/`Tags`). Same shape as `_build_config` output.

### 5. UpdateFunctionConfiguration

- **Verb / path:** `PUT /2015-03-31/functions/{name}/configuration`
- **Router match:** line 627–629
- **Handler:** `_update_config` (line 834)
- **Request body:** partial. Whitelisted keys only (line 842–860): `Runtime, Handler, Description, Timeout, MemorySize, Role, Environment, Layers, TracingConfig, DeadLetterConfig, KMSKeyArn, EphemeralStorage, LoggingConfig, VpcConfig, Architectures, FileSystemConfigs, ImageConfig`. Any other key is silently ignored.
- **Response body:** the full updated configuration (200).

### 6. UpdateFunctionCode

- **Verb / path:** `PUT /2015-03-31/functions/{name}/code`
- **Router match:** line 623–625
- **Handler:** `_update_code` (line 785)
- **Request body:** same three-variant `Code` source as `CreateFunction`, but sent at the top level (not nested under `Code`):
  ```json
  { "ZipFile": "<base64>" }
  // OR: { "S3Bucket": "...", "S3Key": "..." }
  // OR: { "ImageUri": "..." }
  // Optional: "Publish": true
  ```
- **Response body:** the updated configuration (200).
- **Out of scope for Phase 4** — update-code UI is deferred. Listed here for completeness.

### 7. DeleteFunction

- **Verb / path:** `DELETE /2015-03-31/functions/{name}`
- **Router match:** line 619–621
- **Handler:** `_delete_function` (line 769)
- **Query params:** `Qualifier` (optional; Phase 4 never sends)
- **Response body:** **204 No Content**, empty body.

### 8. Invoke

- **Verb / path:** `POST /2015-03-31/functions/{name}/invocations`
- **Router match:** line 564–566
- **Handler:** `_invoke` (line 874) — async, runs `_execute_function` in a worker thread via `asyncio.to_thread` (line 917)
- **Request headers:**
  - `X-Amz-Invocation-Type: RequestResponse` (default) / `Event` (async, 202) / `DryRun` (204). **Phase 4 always sends `RequestResponse`.**
  - `X-Amz-Log-Type: Tail` — **NOTE:** backend always attaches `X-Amz-Log-Result` when `log_output` is non-empty (line 924–928), regardless of `Log-Type` header. Send `Tail` for forward-compat with real AWS.
- **Request body:** the raw event JSON — NOT wrapped in anything. The function's `event` parameter receives this directly. Empty body is allowed (backend parses empty → `{}` at line 439–441).
- **Response status:** **200** on success, **200** on Handled/Unhandled function error (i.e., the HTTP layer is "OK; the function replied"). 404 only if function doesn't exist. 204 on DryRun. 202 on Event (async).
- **Response headers:**
  - `X-Amz-Executed-Version` — always present (e.g., `$LATEST`)
  - `X-Amz-Log-Result` — base64(utf-8) of the full log output when logs exist (line 926). Real AWS caps at 4 KB; MiniStack does not cap. Missing when no logs.
  - `X-Amz-Function-Error` — `"Unhandled"` when the user function raised (line 930–931). Missing on success. Note: backend only writes `"Unhandled"`; `"Handled"` (errors returned rather than thrown) is a real-AWS distinction not emitted by MiniStack. UI should still treat any presence of this header as an error banner.
- **Response body:** the function's return value, serialized:
  - `None` → bytes `b"null"` (line 935)
  - `str` / `bytes` → as-is, UTF-8 encoded (line 936–938)
  - dict / list → `json.dumps(..., ensure_ascii=False)` (line 939)
  - On error path: body is `{"errorMessage": "...", "errorType": "..."}` per Docker executor (line 1152, 1196). Still status 200.

### 9. ListEventSourceMappings

- **Verb / path:** `GET /2015-03-31/event-source-mappings`
- **Router match:** line 444–449
- **Handler:** `_list_esms` (line 2377)
- **Query params:**
  - `FunctionName` — filter by function name/alias/ARN (backend resolves via `_resolve_name` line 2378). **Exact key name: `FunctionName`, not `Function`.**
  - `EventSourceArn` — optional
  - `Marker` — last UUID returned; pagination
  - `MaxItems` — default 100
- **Response body:**
  ```json
  {
    "EventSourceMappings": [
      { "UUID": "<uuid>",
        "FunctionArn": "arn:aws:lambda:us-east-1:000000000000:function:my-func",
        "FunctionName": "my-func",
        "EventSourceArn": "arn:aws:sqs:...",
        "State": "Enabled",
        "Enabled": true,
        "BatchSize": 10,
        "LastModified": 1713360000.0,          // epoch seconds as float
        "LastProcessingResult": "OK"
        // + MaximumBatchingWindowInSeconds, FilterCriteria, etc.
      }
    ],
    "NextMarker": "<last-uuid>"                // only when truncated
  }
  ```

### 10. GetFunctionUrlConfig / ListFunctionUrlConfigs

Backend exposes **both** (line 530–546):

- **List:** `GET /2021-10-31/functions/{name}/urls` → `_list_function_url_configs` (line 2764). Returns `{ "FunctionUrlConfigs": [cfg, ...] }`.
- **Get (singleton):** `GET /2021-10-31/functions/{name}/url` (optional `?Qualifier=…`) → `_get_function_url_config` (line 2735). Returns the cfg object or 404.
- **Config shape** (line 2723–2730):
  ```json
  { "FunctionUrl": "https://<uuid>.lambda-url.us-east-1.on.aws/",
    "FunctionArn": "arn:aws:lambda:...",
    "AuthType": "NONE",
    "Cors": {},
    "CreationTime": "2026-04-17T10:30:00Z",
    "LastModifiedTime": "2026-04-17T10:30:00Z" }
  ```

**Phase 4 strategy:** Use `ListFunctionUrlConfigs` (plural) — it covers all qualifiers in one call and returns an empty array rather than 404 when none exist (simpler UX).

## Invoke Header Semantics (detail)

**Request:**
```http
POST /2015-03-31/functions/my-func/invocations HTTP/1.1
X-Amz-Invocation-Type: RequestResponse
X-Amz-Log-Type: Tail
Content-Type: application/json

{"key":"value"}
```

**Response on success:**
```http
HTTP/1.1 200 OK
Content-Type: application/json
X-Amz-Executed-Version: $LATEST
X-Amz-Log-Result: U1RBUlQgUmVxdWVzdElkOiAuLi4KRU5EIFJlcXVlc3RJZDogLi4u

{"statusCode":200,"body":"hello"}
```

**Response on error (still 200!):**
```http
HTTP/1.1 200 OK
Content-Type: application/json
X-Amz-Executed-Version: $LATEST
X-Amz-Function-Error: Unhandled
X-Amz-Log-Result: <b64>

{"errorMessage":"division by zero","errorType":"Runtime.HandlerError"}
```

**Browser log decoding — CORRECT:**
```typescript
function decodeLogResult(b64: string): string {
  const binaryString = atob(b64)
  const bytes = new Uint8Array(binaryString.length)
  for (let i = 0; i < binaryString.length; i++) bytes[i] = binaryString.charCodeAt(i)
  return new TextDecoder('utf-8').decode(bytes)
}
```

**Browser log decoding — INCORRECT (common mistake):**
```typescript
// WRONG: atob returns a binary *string* where each char is a byte.
// Using it directly mangles any multi-byte UTF-8 sequence (Korean, emoji, etc.).
const logs = atob(b64)   // ← do not do this
```

Regarding `FunctionError` source of truth: prefer the **response header** (`X-Amz-Function-Error`). The body sometimes contains `errorMessage`/`errorType` (Docker wrapper) and sometimes contains the raw handler return (local executor). Header presence is the only reliable "was this an error?" signal.

## Code Upload Client-Side Handling

`.zip` on disk → base64 string → JSON body. The browser lacks a one-liner; roll a small helper:

```typescript
// codeUploadClient.ts
export async function fileToBase64(file: File): Promise<string> {
  const buffer = await file.arrayBuffer()          // modern replacement for FileReader.readAsArrayBuffer
  const bytes = new Uint8Array(buffer)
  // Convert to binary string in chunks to avoid "argument list too long" on large files.
  let binary = ''
  const chunkSize = 0x8000                          // 32 KB
  for (let i = 0; i < bytes.length; i += chunkSize) {
    binary += String.fromCharCode(...bytes.subarray(i, i + chunkSize))
  }
  return btoa(binary)
}
```

**Why chunking:** `String.fromCharCode(...bytes)` with a 10 MB `Uint8Array` blows the argument-list size on some browsers. 32 KB chunks are safe and fast.

**Memory ceiling:** Create path allocates ~3× the file size (File + ArrayBuffer + binary string + base64 string). Practical cap ≈ 50 MB. Beyond that, users should use the **S3 bucket+key** code source (CONTEXT D-02), which bypasses the browser entirely — backend fetches from S3 directly.

**Registry Safety:** Do NOT add `jszip` — we never construct zip files client-side. Users upload a prebuilt `.zip`. The `accept=".zip"` attribute on `<input type="file">` is advisory only; backend is the trust boundary (the zip is extracted in `_execute_function_docker` line 1036).

## Cold-Start / Timeout Behaviour

Invoke is **synchronous and blocking** from the backend's perspective:

- `_invoke` → `await asyncio.to_thread(_execute_function, ...)` (line 917)
- For Docker runtimes: `_execute_function_docker` (line 982) runs `docker pull` + `container.run` + `container.wait`. First call per image can take 10–30 s while the image downloads. Subsequent calls are faster (image cached) but still 2–5 s for container spin-up.
- Timeout: default 3 s (`_build_config` line 348), configurable up to whatever the Docker `container.wait(timeout=…)` call accepts (line 1183).

**Backend signals cold start the same way as real failure:** both manifest as a long-blocking HTTP response. There is no `X-Amz-Cold-Start` header, no intermediate streaming frame. The UI sees a pending fetch for 10–30 s, then either a 200 (success or function error) or a timeout/disconnect.

**AbortController caveat (IMPORTANT — document honestly to user):** Calling `abortController.abort()` in the browser cancels the HTTP read — the browser stops waiting — but the Docker container on the backend keeps running to completion. Any side effects the function has (writing to S3, sending SQS, etc.) still happen. CONTEXT D-09 wisely omits a Cancel button; this research confirms the rationale.

**UX implication (CONTEXT D-09 validated):** Spinner + elapsed-time copy is the correct pattern. Users should be taught "first invoke is slow" via inline copy rather than a loading indicator that suggests a hang.

## Pitfalls Carried from Phase 3

### Pitfall C-1: Route ordering regression
**What goes wrong:** `/services/lambda` resolves to Phase 1 `ServiceHome` because `services/:serviceKey` wildcard matches first.
**How to avoid:** Insert Lambda routes BEFORE `services/:serviceKey` in `web/src/app/routes.tsx` — same as S3 did (see `routes.tsx` line 43 comment "Pitfall 5"). Two entries:
```tsx
{ path: 'services/lambda', element: <LambdaLayout><FunctionListPage /></LambdaLayout> },
{ path: 'services/lambda/:functionName', element: <LambdaLayout><FunctionDetailPage /></LambdaLayout> },
// ↑ BEFORE services/:serviceKey wildcard
```
**Warning signs:** Sidebar "Lambda" link shows generic service placeholder.

### Pitfall C-2: Registry Safety (no new deps)
**What goes wrong:** Developer reflexively reaches for Monaco / CodeMirror for the payload editor, `jszip` for zip handling, `react-json-view` for response render.
**How to avoid:** Cloudscape `Textarea` + `JSON.parse` covers payload editor (CONTEXT D-04). `FileReader` + `btoa` covers code upload. `<pre>{JSON.stringify(body, null, 2)}</pre>` covers response render.
**Warning signs:** `package.json` diff adds any npm package in Phase 4.

### Pitfall C-3: Single `invalidateQueries` per mutation
**What goes wrong:** Mutation invalidates multiple query keys, causing cascading refetches and a brief render thrash.
**How to avoid:** One `invalidateQueries` per `onSuccess`. Example: `DeleteFunction` invalidates only `['lambda', 'functions']`. `UpdateFunctionConfiguration` invalidates only `['lambda', 'function', name]`.
**Warning signs:** Network tab shows 3+ refetches after a single user action.

### Pitfall C-4: `renderWithProviders` basename must prepend `/_console`
**What goes wrong:** Component tests using `renderWithProviders` use the wrong basename; router resolves relative paths against `/` instead of `/_console`, and `Link` components point to broken URLs.
**How to avoid:** Verify (Phase 1 Plan 3 fix) that `renderWithProviders` default basename is `/_console`. Any test that overrides it must also override consistently. Inspect `web/src/test/renderWithProviders.ts` before writing Lambda tests.
**Warning signs:** Tests that navigate via `userEvent.click` on a `<Link>` end up at `/services/lambda/...` without the `/_console` prefix.

## New Phase-4-Specific Pitfalls

### Pitfall 1: Log base64 decoded with `atob` alone
**What goes wrong:** Korean characters, emoji, or any multi-byte UTF-8 in `console.log` output render as mojibake (`ìì•ë…•` instead of `안녕`).
**Why it happens:** `atob` returns a binary string (one code-unit per byte). Multi-byte UTF-8 sequences must be reassembled through `TextDecoder`.
**How to avoid:** Always route base64 → `Uint8Array` → `TextDecoder('utf-8').decode(bytes)`. Snippet in "Invoke Header Semantics" above.
**Warning signs:** Non-ASCII log output is garbled.

### Pitfall 2: Treating HTTP status as the error signal
**What goes wrong:** UI checks `response.status !== 200` to detect function failure; misses Handled/Unhandled errors.
**Why it happens:** Lambda returns 200 even when the user function throws. The protocol uses `X-Amz-Function-Error` header, not status code.
**How to avoid:** After a successful `fetch`, read `response.headers.get('x-amz-function-error')`. If truthy → show red `Alert` + display the body as error detail (body is `{errorMessage, errorType}` in that case).
**Warning signs:** Function throws but UI shows green "Success" state with error JSON in response body.

### Pitfall 3: Payload serialization drift
**What goes wrong:** User pastes JSON with trailing commas / comments / extra whitespace. `JSON.parse` succeeds on some paths but not others, or the request body contains stray bytes.
**Why it happens:** Parsing and re-serializing are separate steps; skipping re-serialize sends the user's raw string to the backend.
**How to avoid:** In the Invoke submit handler, call `JSON.parse(userInput)` to get a value, then `JSON.stringify(value)` for the request body. This strips whitespace and normalises. If `JSON.parse` throws, the Invoke button should already be disabled per D-04, but guard submit anyway.
**Warning signs:** Backend returns `InvalidRequestContentException` or equivalent parse error.

### Pitfall 4: Docker vs local runtime response shape divergence
**What goes wrong:** MSW fixture mimics the local subprocess executor shape (`{body: <raw>, log: <str>}`), but the real Docker path returns the user's raw return value directly wrapped in `json.dumps`. Tests pass; production fails.
**Why it happens:** `_execute_function_docker` line 1185–1194 returns the parsed stdout as `body`, while `_execute_function_local` has its own shape. At the HTTP layer (`_invoke` line 933–939) both converge — the body bytes are the function's return value. MSW fixtures should speak the **HTTP layer** shape, not the internal executor shape.
**How to avoid:** MSW handler for `POST /…/invocations` returns a `Response` whose body is the function's supposed return value (e.g. `JSON.stringify({statusCode:200, body:'ok'})`) and attaches `X-Amz-Log-Result` header. Two fixtures minimum: one success, one function-error (with `X-Amz-Function-Error: Unhandled` + error body).
**Warning signs:** Unit tests green, manual test against live :4566 shows wrong response rendering.

### Pitfall 5: `accept=".zip"` is advisory only
**What goes wrong:** User renames a `.pdf` to `.zip` and uploads. Backend `zipfile.ZipFile(zip_path)` (line 1036) raises; function is created but invocation fails with `BadZipFile`.
**Why it happens:** `<input type="file" accept=".zip">` filters the file picker but does not validate content. Browsers allow any extension via drag-drop too.
**How to avoid:** Validate the first 4 bytes client-side (`PK\x03\x04` magic) before submitting — optional but friendly. Otherwise, surface the backend's `InvalidParameterValueException` via Flashbar. Do NOT rely on `accept` alone.
**Warning signs:** "Function created" Flashbar immediately followed by "Invoke failed: BadZipFile".

### Pitfall 6: Invoke is POST but it's not a cache-writable mutation
**What goes wrong:** Developer reaches for `useQuery` because GET semantics "look right" (read a response), or writes `useMutation` with a `onSuccess` that invalidates function list (wrong — invoke doesn't change the function).
**Why it happens:** TanStack Query's mental model (query = read, mutation = write) doesn't cleanly map to "execute this side-effectful thing and show me what it returned."
**How to avoid:** Use `useMutation` for Invoke, but **do NOT invalidate any query on success**. Store the result in component state (`useState`) and render it from there. The mutation's `data` property is also available via the hook.
**Warning signs:** Function list refetches after every test-invoke; or the invoke button triggers `useQuery`'s background refetch policies.

### Pitfall 7: `ListEventSourceMappings` filter param name typo
**What goes wrong:** Using `Function=<name>` returns all ESMs unfiltered (backend falls through line 2378).
**Why it happens:** Real AWS API uses `FunctionName`, easy to shorten to `Function` mentally.
**How to avoid:** Pass `{ FunctionName: name }` in `searchParams`. Add a parser test that asserts the query key spelling.
**Warning signs:** Triggers tab shows unrelated mappings from other functions.

### Pitfall 8: Docker cold-start ≠ HTTP timeout
**What goes wrong:** Setting a client-side `AbortController` with a 10 s timeout causes cold-start invocations to appear to "fail" when they would have succeeded at 15 s.
**Why it happens:** Cold-start is slow, not broken.
**How to avoid:** Either no client timeout (let the HTTP layer decide) or a generous ceiling (60 s+). CONTEXT D-09 dictates the UX pattern; do not enforce a short timeout.
**Warning signs:** First invoke per container regularly shows "Network error" after 10 s; second invoke of the same function succeeds.

### Pitfall 9: Destructive `DELETE /functions/{name}` has no `Qualifier` UX
**What goes wrong:** Query param `?Qualifier=1` silently deletes a version instead of the function. Since Phase 4 defers versions, this should never be sent — but easy to copy-paste accidentally.
**How to avoid:** `s3Delete`-analog `lambdaDelete(path)` takes no searchParams by default. Version-specific delete is not implemented in Phase 4.
**Warning signs:** Function disappears from detail view but still shows in list (only a version was removed).

### Pitfall 10: Textarea content reset on tab switch
**What goes wrong:** User types a long payload in Test tab, switches to Configuration tab, comes back — payload is gone because the `<Textarea>` unmounted.
**Why it happens:** Cloudscape `Tabs` with `disableContentPaddings` default re-mounts tab content.
**How to avoid:** Store payload in the tab-parent component (e.g., `FunctionDetailPage` state) and pass it down as a controlled prop. Alternatively use `Tabs.activeTabId` + keep all tab panels mounted (if Cloudscape exposes that). The simpler path is lifting state.
**Warning signs:** Typed payload vanishes after tab navigation.

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| Function-list table | Custom table | Cloudscape `Table` + `useCollection` | Already used in Phase 2/3; handles sort/filter/pagination |
| Tabbed detail view | Custom tab router | Cloudscape `Tabs` | Exact AWS-console parity; proper keyboard navigation |
| Payload editor | Monaco / CodeMirror | Cloudscape `Textarea` + `JSON.parse` | 2 MB vs 0 bytes; CONTEXT D-04 mandates |
| JSON response render | `react-json-view` | `<pre>{JSON.stringify(body, null, 2)}</pre>` | 15-line component; no dep |
| Base64 encoding of zip | `js-base64` | Native `btoa` over a `Uint8Array` binary string | Browser-native |
| Client-side zip creation | `jszip` | **None — don't create zips client-side** | CONTEXT D-02: user provides prebuilt zip |
| Relative time | `date-fns`, `dayjs` | Inline `Intl.RelativeTimeFormat` helper | ~20-line helper; CONTEXT D-10 explicitly permits inline |
| Type-to-confirm modal | Custom state machine | Phase 3 `DeleteBucketModal` pattern — copy with Lambda copy | Proven pattern |
| Invoke HTTP client | `ky` for everything | `ky` for verbs; read `response.headers` for invoke | Header-heavy response; `ky` supports `.response` |
| Log decoding | Library | `atob` → `Uint8Array` → `TextDecoder('utf-8')` | 5 lines; correct for multi-byte |
| ARN / name copy | Custom clipboard logic | Cloudscape `CopyToClipboard` | Already used in S3 ObjectDetail |
| Form validation | Full form library (react-hook-form, formik) | Inline `useState` + `FormField` `errorText` | Phase 2/3 pattern; small form |
| Sample payload picker | New component | Cloudscape `Select` or `ButtonDropdown` + constants file | Data lives in `samplePayloads.ts` |

**Key insight:** Phase 4 is a thin UI over a complete backend. Every visual/interaction need maps to a Cloudscape primitive or a browser-native API. Reach for `npm install` only when CONTEXT.md explicitly permits — and it does not.

## Runtime State Inventory

Phase 4 is **greenfield implementation** (new files under `web/src/services/lambda/`), not a rename or refactor. Backend unchanged, no OS-level registrations, no installed package renames, no stored-data keys involve the word "lambda" that change semantics.

| Category | Items Found | Action Required |
|----------|-------------|------------------|
| Stored data | None — backend in-memory state (`_functions`, `_esms`, `_function_urls`) is unchanged | None |
| Live service config | None | None |
| OS-registered state | None — UI addition only | None |
| Secrets / env vars | None — no new env vars introduced | None |
| Build artifacts | None — new frontend source; existing `vite build` pipeline absorbs new files | None |

**Nothing found in any category** — verified by inspecting the scope (pure additive to `web/src/services/` and `web/src/app/routes.tsx`).

## Environment Availability

All dependencies verified present in Phase 1/2/3:

| Dependency | Required By | Available | Version | Fallback |
|------------|------------|-----------|---------|----------|
| React 19 + Cloudscape 3 | UI layer | ✓ | 3.0.1266 | — |
| Vite 6 | Build | ✓ | 6.4.2 | — |
| TanStack Query 5 | Server state | ✓ | 5.x | — |
| ky 1.x | HTTP | ✓ | 1.14.3 | — |
| Zustand 5 | UI state | ✓ | 5.x | — |
| React Router 7 | Routing | ✓ | 7.x | — |
| vitest + Testing Library | Unit tests | ✓ | 3.2.4 | — |
| MSW | Test mocking | ✓ | — | — |
| Playwright | E2E | ✓ | — | — |
| MiniStack Lambda emulator | Backend | ✓ | `lambda_svc.py` 2,778 lines, all endpoints present | — |
| Docker daemon | Real invoke execution on :4566 | **Depends on user machine** | — | Backend falls back to local subprocess executor (`_execute_function_local`) if Docker unavailable — function still executes, response shape identical at HTTP layer |

**No new dependencies required; nothing blocks.** The Docker availability caveat affects the *emulator runtime*, not the UI — both paths produce the same HTTP response shape, so the UI works regardless.

## Code Examples

### JSON REST client (sketch)

```typescript
// web/src/services/lambda/api/lambdaClient.ts
import { apiClient } from '../../../shared/api/client'

const ORIGIN =
  typeof window !== 'undefined' && window.location?.origin
    ? window.location.origin
    : ''

export const AUTHORIZATION =
  'AWS4-HMAC-SHA256 Credential=test/20260417/us-east-1/lambda/aws4_request'

function toUrl(path: string): string {
  return `${ORIGIN}${path}`
}

export async function lambdaGet<T>(
  path: string,
  searchParams?: Record<string, string>,
): Promise<T> {
  return apiClient
    .get(toUrl(path), {
      headers: { Authorization: AUTHORIZATION },
      searchParams,
    })
    .json<T>()
}

export async function lambdaPost<T>(
  path: string,
  body: unknown,
): Promise<T> {
  return apiClient
    .post(toUrl(path), {
      headers: {
        Authorization: AUTHORIZATION,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(body),
    })
    .json<T>()
}

export async function lambdaPut<T>(
  path: string,
  body: unknown,
): Promise<T> {
  return apiClient
    .put(toUrl(path), {
      headers: {
        Authorization: AUTHORIZATION,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(body),
    })
    .json<T>()
}

export async function lambdaDelete(path: string): Promise<void> {
  await apiClient.delete(toUrl(path), {
    headers: { Authorization: AUTHORIZATION },
  })
}
```

### Invoke client (header-aware)

```typescript
// web/src/services/lambda/api/invokeClient.ts
import { AUTHORIZATION } from './lambdaClient'

export type InvokeResult = {
  body: unknown
  logResult: string | null
  functionError: string | null
  executedVersion: string | null
}

function decodeLogResult(b64: string | null): string | null {
  if (!b64) return null
  const binary = atob(b64)
  const bytes = new Uint8Array(binary.length)
  for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i)
  return new TextDecoder('utf-8').decode(bytes)
}

export async function invokeFunction(
  name: string,
  payload: unknown,
): Promise<InvokeResult> {
  const res = await fetch(`/2015-03-31/functions/${encodeURIComponent(name)}/invocations`, {
    method: 'POST',
    headers: {
      Authorization: AUTHORIZATION,
      'Content-Type': 'application/json',
      'X-Amz-Invocation-Type': 'RequestResponse',
      'X-Amz-Log-Type': 'Tail',
    },
    body: JSON.stringify(payload),
  })
  if (!res.ok && res.status !== 200) {
    throw new Error(`Invoke failed with ${res.status}: ${await res.text()}`)
  }
  const text = await res.text()
  let body: unknown = text
  try { body = text ? JSON.parse(text) : null } catch { /* keep as string */ }
  return {
    body,
    logResult: decodeLogResult(res.headers.get('x-amz-log-result')),
    functionError: res.headers.get('x-amz-function-error'),
    executedVersion: res.headers.get('x-amz-executed-version'),
  }
}
```

### Code upload helper

```typescript
// web/src/services/lambda/api/codeUploadClient.ts
export async function fileToBase64(file: File): Promise<string> {
  const buffer = await file.arrayBuffer()
  const bytes = new Uint8Array(buffer)
  let binary = ''
  const chunk = 0x8000
  for (let i = 0; i < bytes.length; i += chunk) {
    binary += String.fromCharCode(...bytes.subarray(i, i + chunk))
  }
  return btoa(binary)
}
```

### TanStack Query — list functions

```typescript
// web/src/services/lambda/api/useFunctions.ts
import { useQuery } from '@tanstack/react-query'
import { lambdaGet } from './lambdaClient'
import { lambdaKeys } from './lambdaKeys'

type ListFunctionsResponse = {
  Functions: FunctionConfiguration[]
  NextMarker?: string
}

export function useFunctions(marker: string | null, maxItems = 50) {
  return useQuery({
    queryKey: lambdaKeys.functions(marker),
    queryFn: () => {
      const sp: Record<string, string> = { MaxItems: String(maxItems) }
      if (marker) sp.Marker = marker
      return lambdaGet<ListFunctionsResponse>('/2015-03-31/functions', sp)
    },
    placeholderData: (prev) => prev,
  })
}
```

### Invoke mutation (cache-neutral)

```typescript
// web/src/services/lambda/api/invokeMutation.ts
import { useMutation } from '@tanstack/react-query'
import { invokeFunction, type InvokeResult } from './invokeClient'

export function useInvoke(name: string) {
  return useMutation<InvokeResult, Error, unknown>({
    mutationFn: (payload) => invokeFunction(name, payload),
    // Intentionally no onSuccess — invoke does not mutate backend state that is cached.
  })
}
```

## TanStack Query Keys (proposal)

```typescript
// web/src/services/lambda/api/lambdaKeys.ts
export const lambdaKeys = {
  all: ['lambda'] as const,
  functions: (marker: string | null = null) =>
    ['lambda', 'functions', marker ?? null] as const,
  function: (name: string) =>
    ['lambda', 'function', name] as const,
  triggers: (name: string) =>
    ['lambda', 'triggers', name] as const,
  functionUrl: (name: string) =>
    ['lambda', 'functionUrl', name] as const,
} as const
```

Invalidation conventions:
- `CreateFunction` success → invalidate `['lambda', 'functions']` (any marker)
- `DeleteFunction` success → invalidate `['lambda', 'functions']` + `['lambda', 'function', name]`
- `UpdateFunctionConfiguration` success → invalidate `['lambda', 'function', name]`
- `Invoke` success → **no invalidation** (Pitfall 6)

Use `queryClient.invalidateQueries({ queryKey: ['lambda', 'functions'] })` — prefix-match invalidates every marker variant.

## Sample Payload Templates

Each template is ≤ 30 lines, valid JSON, dropped into the Test-tab payload dropdown. Store in `web/src/services/lambda/samplePayloads.ts` as a `{label, value}[]` list.

### 1. Empty

```json
{}
```

### 2. API Gateway v2 HTTP event

```json
{
  "version": "2.0",
  "routeKey": "GET /hello",
  "rawPath": "/hello",
  "rawQueryString": "name=world",
  "headers": { "accept": "*/*", "content-type": "application/json" },
  "queryStringParameters": { "name": "world" },
  "requestContext": {
    "accountId": "000000000000",
    "apiId": "api123",
    "domainName": "api123.execute-api.us-east-1.amazonaws.com",
    "http": { "method": "GET", "path": "/hello", "protocol": "HTTP/1.1", "sourceIp": "127.0.0.1", "userAgent": "curl/8" },
    "requestId": "id",
    "routeKey": "GET /hello",
    "stage": "$default",
    "time": "17/Apr/2026:10:00:00 +0000",
    "timeEpoch": 1713346800000
  },
  "isBase64Encoded": false
}
```

### 3. S3 ObjectCreated:Put event

```json
{
  "Records": [
    {
      "eventVersion": "2.1",
      "eventSource": "aws:s3",
      "awsRegion": "us-east-1",
      "eventTime": "2026-04-17T10:00:00.000Z",
      "eventName": "ObjectCreated:Put",
      "s3": {
        "s3SchemaVersion": "1.0",
        "configurationId": "test",
        "bucket": { "name": "my-bucket", "arn": "arn:aws:s3:::my-bucket" },
        "object": { "key": "hello.txt", "size": 12, "eTag": "abc" }
      }
    }
  ]
}
```

### 4. SQS message batch event

```json
{
  "Records": [
    {
      "messageId": "id-1",
      "receiptHandle": "AQEB...",
      "body": "hello from sqs",
      "attributes": {
        "ApproximateReceiveCount": "1",
        "SentTimestamp": "1713346800000",
        "SenderId": "sender",
        "ApproximateFirstReceiveTimestamp": "1713346800000"
      },
      "messageAttributes": {},
      "md5OfBody": "0a6e...",
      "eventSource": "aws:sqs",
      "eventSourceARN": "arn:aws:sqs:us-east-1:000000000000:my-queue",
      "awsRegion": "us-east-1"
    }
  ]
}
```

## File / Module Inventory (proposal for planner / UI-SPEC)

Every `.ts(x)` file Phase 4 should add. Match Phase 3 granularity (small, focused files). Every implementation file has a co-located test file under the same path with `.test.ts` / `.test.tsx` suffix.

### API primitives (`web/src/services/lambda/api/`)

| File | Purpose | Tests |
|------|---------|-------|
| `lambdaClient.ts` | `lambdaGet / lambdaPost / lambdaPut / lambdaDelete` JSON helpers + `AUTHORIZATION` + URL builder | `lambdaClient.test.ts` — URL assembly, header injection, searchParams encoding |
| `invokeClient.ts` | `invokeFunction(name, payload)` + `decodeLogResult` | `invokeClient.test.ts` — success, function-error, UTF-8 log decoding, header extraction |
| `codeUploadClient.ts` | `fileToBase64(file: File)` | `codeUploadClient.test.ts` — small file, large file chunking, UTF-8 binary safety (use a known zip fixture) |
| `lambdaKeys.ts` | Typed query-key factory | `lambdaKeys.test.ts` — key shape regression tests |

### Query hooks (`web/src/services/lambda/api/`)

| File | Purpose | Tests |
|------|---------|-------|
| `useFunctions.ts` | `useQuery` for `ListFunctions` with marker pagination | `useFunctions.test.ts` — first page, pagination, placeholderData preservation |
| `useFunction.ts` | `useQuery` for `GetFunction` — drives detail page | `useFunction.test.ts` — hit, 404, stale data while refetching |
| `useEventSourceMappings.ts` | `useQuery` for `ListEventSourceMappings?FunctionName=…` | `useEventSourceMappings.test.ts` — filter param spelling, empty list |
| `useFunctionUrl.ts` | `useQuery` for `ListFunctionUrlConfigs` (empty-array-friendly) | `useFunctionUrl.test.ts` — none configured, single URL, AuthType rendering |

### Mutations (`web/src/services/lambda/api/`)

| File | Purpose | Tests |
|------|---------|-------|
| `functionMutations.ts` | `useCreateFunction`, `useDeleteFunction`, `useUpdateConfiguration` | `functionMutations.test.ts` — happy path + error bubbling, invalidation targets |
| `invokeMutation.ts` | `useInvoke(name)` — cache-neutral | `invokeMutation.test.ts` — no invalidation triggered on success |

### Pages (`web/src/services/lambda/`)

| File | Purpose | Tests |
|------|---------|-------|
| `LambdaLayout.tsx` | Layout wrapper for list + detail routes (sets breadcrumbs, sidebar category) | `LambdaLayout.test.tsx` — renders children, breadcrumb "Lambda" |
| `FunctionListPage.tsx` | `/services/lambda` — Cloudscape `Table` of functions + create/delete buttons | `FunctionListPage.test.tsx` — loading, empty state, create/delete modal triggers, row-click navigation |
| `FunctionDetailPage.tsx` | `/services/lambda/:functionName` — Cloudscape `Tabs` with 4 panels | `FunctionDetailPage.test.tsx` — tab rendering, 404 handling, payload state persistence across tabs |

### Components — list page (`web/src/services/lambda/components/`)

| File | Purpose | Tests |
|------|---------|-------|
| `FunctionTable.tsx` | `Table` with `useCollection`; columns: Name, Runtime, Handler, Code size, Last modified | `FunctionTable.test.tsx` — sort, filter, row click, empty |
| `CreateFunctionModal.tsx` | Multi-step: name → runtime → code source (`Tiles` / `RadioGroup`) → submit. Three mutually-exclusive code inputs. | `CreateFunctionModal.test.tsx` — each code source variant, validation, submit dispatches correct payload shape |
| `DeleteFunctionModal.tsx` | Type-to-confirm with function name | `DeleteFunctionModal.test.tsx` — exact match required |

### Components — detail page (`web/src/services/lambda/components/`)

| File | Purpose | Tests |
|------|---------|-------|
| `ConfigurationPanel.tsx` | `KeyValuePairs` for runtime/handler/memory/timeout/code size/role ARN/arch/last-modified (+ `CopyToClipboard` on ARN) | `ConfigurationPanel.test.tsx` — all fields present, ARN copy works |
| `EnvironmentPanel.tsx` | `Table` of env var key/value, both columns in plaintext (CONTEXT D-05), sortable/filterable | `EnvironmentPanel.test.tsx` — plaintext render (no masking), empty state, sort |
| `TriggersPanel.tsx` | Read-only list: `Table` of event source mappings + `KeyValuePairs` for function URL(s) | `TriggersPanel.test.tsx` — empty case, multiple ESMs, FunctionURL shown |
| `InvokePanel.tsx` | Hosts payload editor + sample picker + Invoke button + `InvokeResult` | `InvokePanel.test.tsx` — disable button on invalid JSON, submit flow, spinner copy swap at 3 s |
| `PayloadEditor.tsx` | Cloudscape `Textarea` + inline JSON validation + sample `Select` dropdown | `PayloadEditor.test.tsx` — each sample loads, invalid JSON shows error, clear-to-empty |
| `InvokeResult.tsx` | Vertical stack: optional red `Alert` (FunctionError) → Response `<pre>` → Logs `<pre>` | `InvokeResult.test.tsx` — success, function-error, missing logs, UTF-8 logs |
| `samplePayloads.ts` | Constants: `[{label, value: string}]` for the 4 templates above | `samplePayloads.test.ts` — every value parses as valid JSON |
| `RelativeTime.tsx` | Inline `Intl.RelativeTimeFormat` helper + `<span title={iso}>` (CONTEXT D-10) | `RelativeTime.test.tsx` — recent/old timestamps, title attribute |
| `columns.ts` | Column defs for `FunctionTable` and ESM table | — (consumed by component tests) |
| `copy.ts` | Copy catalog additions (labels, error messages, empty states) | — |

### Route injection

- Update `web/src/app/routes.tsx`: add two entries **before** `services/:serviceKey` wildcard (same rule Phase 3 applied). Single-line diff, covered by existing route tests.

### MSW / fixtures

| File | Purpose |
|------|---------|
| `web/src/test/lambdaHandlers.ts` | MSW handlers for all Lambda endpoints used above |
| `web/src/test/fixtures/lambda/*.json` | Canned responses: function-list, function-detail, esms-empty, esms-one, function-url-empty, function-url-one, invoke-success, invoke-function-error |

### E2E (Playwright)

| File | Purpose |
|------|---------|
| `e2e/lambda-flow.spec.ts` | End-to-end: create function (zip source) → see in list → open detail → invoke with `{}` → see response + logs → delete with confirm → gone from list |

**Total new files:** ~35 source + ~22 test + 1 routes edit + MSW handlers + 1 e2e spec. Sliceable into 4–5 waves.

## Validation Architecture

### Test Framework

| Property | Value |
|----------|-------|
| Framework | vitest 3.2.4 + Testing Library (jsdom) |
| E2E | Playwright |
| Config file | `vite.config.ts` / `vitest.config.ts` (Phase 1 split) |
| Quick run command | `npm run test -- src/services/lambda --run` |
| Full suite | `npm test -- --run` |
| Component test pattern | `src/**/*.{test,spec}.{ts,tsx}` |

### Phase Requirements → Test Map

| Req ID | Behavior | Test Type | Automated Command | File Exists? |
|--------|----------|-----------|-------------------|--------------|
| LAM-01 | List renders functions with runtime, handler, last-modified | unit (component) | `npm run test -- src/services/lambda/components/FunctionTable.test.tsx --run` | ❌ Wave 0 |
| LAM-01 | List supports marker pagination | unit (hook) | `npm run test -- src/services/lambda/api/useFunctions.test.ts --run` | ❌ Wave 0 |
| LAM-01 | Create function submits correct payload for each of 3 code sources | unit (component) | `npm run test -- src/services/lambda/components/CreateFunctionModal.test.tsx --run` | ❌ Wave 0 |
| LAM-01 | Delete function type-to-confirm + invalidates list | unit (component) | `npm run test -- src/services/lambda/components/DeleteFunctionModal.test.tsx --run` | ❌ Wave 0 |
| LAM-02 | Invoke success → response + decoded logs render | unit (component) | `npm run test -- src/services/lambda/components/InvokeResult.test.tsx --run` | ❌ Wave 0 |
| LAM-02 | Invoke function-error → red Alert rendered | unit (component) | covered by InvokeResult.test.tsx | ❌ Wave 0 |
| LAM-02 | Invalid JSON payload disables Invoke button | unit (component) | `npm run test -- src/services/lambda/components/PayloadEditor.test.tsx --run` | ❌ Wave 0 |
| LAM-02 | Spinner copy swap at 3 seconds | unit (component, fake timers) | `npm run test -- src/services/lambda/components/InvokePanel.test.tsx --run` | ❌ Wave 0 |
| LAM-02 | Log UTF-8 decoding (Korean / emoji) | unit | `npm run test -- src/services/lambda/api/invokeClient.test.ts --run` | ❌ Wave 0 |
| LAM-03 | Configuration tab renders all fields + ARN copy | unit (component) | `npm run test -- src/services/lambda/components/ConfigurationPanel.test.tsx --run` | ❌ Wave 0 |
| LAM-03 | Environment tab plaintext (no masking) | unit (component) | `npm run test -- src/services/lambda/components/EnvironmentPanel.test.tsx --run` | ❌ Wave 0 |
| LAM-03 | Triggers tab renders ESMs + Function URL read-only | unit (component) | `npm run test -- src/services/lambda/components/TriggersPanel.test.tsx --run` | ❌ Wave 0 |
| All | End-to-end create → invoke → delete flow | e2e | `npm run test:e2e -- lambda-flow.spec.ts` | ❌ Wave 0 (manual-acceptable for first pass) |

### Sampling Rate
- **Per task commit:** `npm run test -- src/services/lambda --run`
- **Per wave merge:** `npm test -- --run` (full unit suite)
- **Phase gate:** Full suite green + Playwright smoke (create → invoke → delete) before `/gsd-verify-work`

### Wave 0 Gaps
- [ ] `src/services/lambda/api/lambdaClient.test.ts`
- [ ] `src/services/lambda/api/invokeClient.test.ts` (incl. UTF-8 log fixture)
- [ ] `src/services/lambda/api/codeUploadClient.test.ts`
- [ ] `src/services/lambda/api/lambdaKeys.test.ts`
- [ ] `src/services/lambda/api/useFunctions.test.ts`
- [ ] `src/services/lambda/api/useFunction.test.ts`
- [ ] `src/services/lambda/api/useEventSourceMappings.test.ts`
- [ ] `src/services/lambda/api/useFunctionUrl.test.ts`
- [ ] `src/services/lambda/api/functionMutations.test.ts`
- [ ] `src/services/lambda/api/invokeMutation.test.ts`
- [ ] `src/services/lambda/components/FunctionTable.test.tsx`
- [ ] `src/services/lambda/components/CreateFunctionModal.test.tsx`
- [ ] `src/services/lambda/components/DeleteFunctionModal.test.tsx`
- [ ] `src/services/lambda/components/ConfigurationPanel.test.tsx`
- [ ] `src/services/lambda/components/EnvironmentPanel.test.tsx`
- [ ] `src/services/lambda/components/TriggersPanel.test.tsx`
- [ ] `src/services/lambda/components/InvokePanel.test.tsx`
- [ ] `src/services/lambda/components/PayloadEditor.test.tsx`
- [ ] `src/services/lambda/components/InvokeResult.test.tsx`
- [ ] `src/services/lambda/components/RelativeTime.test.tsx`
- [ ] `src/services/lambda/FunctionListPage.test.tsx`
- [ ] `src/services/lambda/FunctionDetailPage.test.tsx`
- [ ] MSW handlers: `src/test/lambdaHandlers.ts` + JSON fixtures under `src/test/fixtures/lambda/`
- [ ] Playwright: `e2e/lambda-flow.spec.ts`

Framework install: **None required** — vitest, Testing Library, MSW, Playwright all present from Phase 1.

## Security Domain

Enforcement enabled (config absent = enabled).

### Applicable ASVS Categories

| ASVS Category | Applies | Standard Control |
|---------------|---------|-----------------|
| V2 Authentication | no | Local dev tool; no auth |
| V3 Session Management | no | Same |
| V4 Access Control | no | Same |
| V5 Input Validation | yes | Function name client-side guard (AWS rules: 1–64 chars, `[a-zA-Z0-9-_]`); handler string format; memory 128–10240; timeout 1–900. Payload validated via `JSON.parse`. Env var values not validated (any string allowed — matches real AWS). Server-side validation in `_create_function` and `_update_config` is authoritative. |
| V6 Cryptography | no | No secret handling; dummy SigV4 header |
| V7 Error Handling | yes | Errors surfaced via Flashbar + inline `Alert`. Backend error bodies rendered through React (auto-escaped, safe from XSS). `FunctionError` + `errorMessage` / `errorType` from Docker runtime rendered as text. |
| V11 Business Logic | low | Type-to-confirm delete; invoke has no destructive equivalent |
| V14 Configuration | n/a | No secrets; same-origin API |

### Known Threat Patterns for React + JSON REST

| Pattern | STRIDE | Standard Mitigation |
|---------|--------|---------------------|
| Rendering invoke response as HTML | XSS | Always use `{JSON.stringify(body, null, 2)}` inside `<pre>`. Never `dangerouslySetInnerHTML`. React auto-escapes. |
| Rendering decoded logs as HTML | XSS | Same — `<pre>{logs}</pre>`. `TextDecoder` output is plain text; React escapes. |
| User uploads zip containing malicious binary | Backend sandbox | Out of UI scope. Backend runs code in Docker container (`_execute_function_docker`) with restricted mounts. UI only serializes bytes. |
| Payload Textarea auto-executes embedded scripts | N/A | Textarea is plain text; `value={state}` is safe. |
| Env var values containing secrets displayed (D-05 accepts) | Information Disclosure | Out of threat model — local emulator, no multi-user exposure. Documented in CONTEXT D-05. |
| Function name injection into URL path | Tampering | `encodeURIComponent(functionName)` in every path-building helper (`invokeClient.ts` already does this). |
| CSRF on POST /invocations | Tampering | Same-origin policy; app is same-origin with API (:4566). No third-party origin issues. |
| JSON parsing DoS via deeply nested payload | DoS (self-inflicted) | Browser-native `JSON.parse` has sane stack limits; backend controls its own parsing. |
| Base64 code upload memory exhaustion (huge zip) | DoS (self-inflicted) | Practical 50 MB ceiling; oversize → user directed to S3 code source (CONTEXT D-02). |

**Key security insight:** Same as Phase 3 — local dev tool, no auth, no multi-tenant concept. V5 Input Validation is the only actively-engaged category, handled by the same pattern (inline `FormField` + `errorText`).

## Assumptions Log

| # | Claim | Section | Risk if Wrong |
|---|-------|---------|---------------|
| A1 | MiniStack Lambda handler accepts dummy `Authorization` header without SigV4 verification (same as S3 / EC2) | REST client sketch | 403 on every call. Mitigation: Wave 0 smoke test — the same pattern works for S3 and EC2, extremely low risk. [ASSUMED] |
| A2 | `ky.put(...).json<T>()` correctly parses the 200-with-body response of UpdateConfiguration | `lambdaClient.ts` sketch | Parse error; use `.text()` + `JSON.parse` fallback. Mitigation: test against live :4566 in Wave 0. [ASSUMED] |
| A3 | `response.headers.get('x-amz-log-result')` returns the base64 string as-written (browsers do not auto-decode base64 headers) | `invokeClient.ts` | Double decode → garbage. Mitigation: straightforward — browsers never decode header values. [VERIFIED: per MDN `Headers.get` returns raw string]. |
| A4 | Large file `.zip` (≥ 10 MB) can be read via `file.arrayBuffer()` and base64-encoded in the browser without OOM on a typical laptop | `codeUploadClient.ts` | Tab crash on giant files. Mitigation: document 50 MB soft cap; direct users to S3 source for larger. [ASSUMED] |
| A5 | Cold-start of 10–30 s reliably surfaces as a slow HTTP response (not a timeout) from the Vite dev server proxy | Cold-Start section | Dev server aborts the fetch mid-cold-start. Mitigation: Vite proxy defaults have no timeout by default; verify in Wave 0 with a first invoke. [ASSUMED] |
| A6 | Phase 3 reusable components (`DeleteModal` pattern, `Flashbar` wiring, `KeyValuePairs` usage) are generic enough to reuse directly | Architecture | May need lightweight wrapping. Planner verifies by reading Phase 3 files in Wave 0. [ASSUMED — planner must spike] |
| A7 | Docker runtime is present on the development machine for e2e runs | Environment Availability | E2E falls back to local subprocess executor — response shape identical at HTTP layer, so test still passes. [VERIFIED: backend has fallback path at line 988–990] |
| A8 | `_execute_function_local` exists for subprocess fallback | Env Availability | If name/signature differs, Docker-fallback bullet wrong — but it does exist (line 990 calls it). [VERIFIED: `_execute_function_local` referenced at line 1025] |
| A9 | The response for a function that returns `None` arrives as body `"null"` (string) and `JSON.parse('null')` yields `null` — UI handles gracefully | Invoke rendering | Edge case but lands in `JSON.stringify(null, null, 2)` → literal `"null"` in `<pre>`. Acceptable; no special-case needed. [VERIFIED: `_invoke` line 935] |

## Open Questions (RESOLVED)

1. **Should Function URL info live in Configuration tab or Triggers tab?**
   - **RESOLVED via CONTEXT D-07:** Triggers tab shows Function URLs with AuthType + URL. Configuration tab shows runtime-level fields only.

2. **Should `ListFunctionUrlConfigs` (plural) or `GetFunctionUrlConfig` (singleton) drive the UI?**
   - **RESOLVED:** Use `ListFunctionUrlConfigs`. It returns an empty array when none configured (no 404 handling); it covers all qualifiers in one call; and since we only show `$LATEST`, filter to entries whose key does not contain `:` (path `{name}` vs `{name}:{qualifier}`) — backend line 2764 includes both shapes.

3. **Does the payload Textarea need to be reset between functions?**
   - **RESOLVED:** Yes. `FunctionDetailPage` lifts payload state; `useEffect(() => setPayload('{}'), [functionName])` resets on navigation. Prevents cross-function payload confusion.

4. **Should pagination use `Table.Pagination` component or custom marker-based Prev/Next?**
   - **RESOLVED:** Match S3 Phase 3 pattern — marker stack in component state, `Pagination` component repurposed for Prev/Next. Don't try to emulate numbered pages (marker API is cursor-based, same as S3 continuation token).

5. **Where does `RelativeTime` component live?**
   - **RESOLVED via CONTEXT D-10:** Inline in `web/src/services/lambda/components/RelativeTime.tsx` for Phase 4. Phase 6 extracts to `web/src/shared/components/`. Track as tech debt in the planner.

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| Monaco Editor for code-like textareas | Cloudscape `Textarea` + validation for JSON-only inputs | Project policy (Registry Safety) | Zero dependency, no bundle bloat |
| Redux / Saga for async flows | TanStack Query v5 mutations | Project-wide since Phase 1 | Less code, caching baked in |
| `axios` with manual interceptors | `ky` with hooks | Project-wide since Phase 1 | Smaller bundle |
| `jszip` client-side zip | Server-side zip extraction (`_execute_function_docker`) | Backend owns zip handling | No client-side complexity |
| `form-data` / `multipart/form-data` for file uploads | Base64-in-JSON | AWS Lambda API uses JSON exclusively | Matches AWS SDK behaviour |

**Deprecated in this context:**
- `file-saver` — we don't save files in Phase 4 (download deferred)
- `date-fns` — CONTEXT D-10 explicitly permits `Intl.RelativeTimeFormat`
- Any npm-based JSON viewer — `<pre>` + `JSON.stringify` is sufficient

## Sources

### Primary (HIGH confidence)

- `.planning/phases/04-lambda-service/04-CONTEXT.md` — 10 locked decisions
- `.planning/REQUIREMENTS.md` — LAM-01/02/03
- `ministack/services/lambda_svc.py` — backend emulator (2,778 lines):
  - `handle_request` router (line 432)
  - `_build_config` canonical config shape (line 322)
  - `_list_functions` (line 748)
  - `_create_function` (line 639) — three code sources handled at 654–670
  - `_get_function` (line 699) / `_get_function_config` (line 731)
  - `_update_code` (line 785) / `_update_config` (line 834)
  - `_delete_function` (line 769)
  - `_invoke` (line 874) — headers at 924–931, body serialization at 933–939
  - `_execute_function_docker` (line 982) — cold-start behaviour
  - `_list_esms` (line 2377) — ESM filter params
  - `_list_function_url_configs` (line 2764) / `_get_function_url_config` (line 2735)
- `.planning/phases/03-s3-lambda-services/03-RESEARCH.md` — pattern template
- `web/src/services/s3/api/s3Client.ts` — REST client template
- `web/src/services/s3/api/useObjects.ts` — TanStack Query hook template
- `CLAUDE.md` — project stack lock

### Secondary (MEDIUM confidence)

- MDN: `Headers.get`, `TextDecoder`, `File.arrayBuffer`, `btoa`, `atob` — stable across target browsers
- AWS Lambda API Reference (invoke semantics, header names) — documented, matches backend
- TanStack Query v5 docs — `placeholderData`, `invalidateQueries` patterns (verified via Phase 2/3 usage)
- Cloudscape docs — `Tabs`, `Textarea`, `FileUpload`, `RadioGroup`, `Tiles`, `KeyValuePairs`, `Alert`, `Spinner` (verified via Phase 2/3 usage)

### Tertiary (LOW confidence)

- None — all claims anchor to inspected backend source or established Phase 3 patterns. Residual assumptions tagged in the Assumptions Log for Wave 0 verification.

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH — zero new libraries; everything inherited with pinned versions
- Backend REST inventory: HIGH — every endpoint line-number verified in `lambda_svc.py`
- Architecture: HIGH — direct port of Phase 3 S3 structure; file inventory explicit
- Pitfalls: HIGH — four Phase-3-carried + ten Phase-4-specific, each traced to backend code or browser API behaviour
- Invoke protocol: HIGH — header names, body shapes, 200-on-error semantics all verified in `_invoke`
- Security: HIGH — same scope as Phase 3; plaintext env vars explicitly approved (D-05)
- Testing: HIGH — vitest + MSW + Playwright patterns established

**Research date:** 2026-04-17
**Valid until:** 2026-05-17 (30 days — stack pinned, backend stable, CONTEXT locked)
