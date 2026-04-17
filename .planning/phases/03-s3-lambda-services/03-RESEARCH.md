# Phase 3: S3 & Lambda Services — Research

**Researched:** 2026-04-17
**Domain:** Browser S3 object management (drag-drop upload, prefix navigation, blob download) on a React 19 + Cloudscape + TanStack Query SPA, backed by MiniStack's existing S3 REST emulator.
**Confidence:** HIGH — CONTEXT.md locks 15 decisions; UI-SPEC locks 6/6 dimensions; backend S3 handler inspected; Phase 2 reusable components inventoried.

## Summary

Phase 3 is executed in two waves per CONTEXT.md: **S3 first, Lambda later in the same phase**. This research covers only the S3 execution. Every strategic decision (URL shape, pagination strategy, upload mechanism, delete confirmation, file layout) has already been resolved upstream in CONTEXT.md and UI-SPEC.md; the planner's job is to decompose those decisions into tasks, not rediscover them.

Only one net-new technical area requires investigation beyond Phase 2 patterns: **file I/O in the browser** (drag-and-drop upload with per-file progress, and blob-based download). Both can be built with browser-native APIs (`XMLHttpRequest.upload.onprogress`, `File`/`Blob`, `URL.createObjectURL`) — CONTEXT.md explicitly forbids any new npm dependency for this purpose. Everything else (tables, modals, SplitPanel, Flashbar, type-to-confirm, TanStack Query mutations + invalidation) is a direct reuse of Phase 2 components with S3-specific types.

The backend is complete — `ministack/services/s3.py` already implements every S3 API the UI calls (ListBuckets, CreateBucket, DeleteBucket, ListObjectsV2 with continuation-token, PutObject, GetObject, HeadObject, DeleteObject, DeleteObjects, GetObjectTagging). No backend work is required.

**Primary recommendation:** Create `web/src/services/s3/` mirroring the `web/src/services/ec2/` structure. Build a path-style REST client (not a copy of `ec2Query`), one XHR-based upload helper, one Blob-based download helper, and lean on the Phase 2 `ResourceTable`/`DeleteModal`/`CreateModal`/`SplitPanelDetail`/`FlashNotifications` components by extracting them from `services/ec2/components/` into `services/shared/components/` **only if the planner decides reuse warrants it**. If the components are tightly coupled to EC2 copy, duplicate with S3-specific adaptations and flag it as tech debt for Phase 4.

## User Constraints (from CONTEXT.md)

### Locked Decisions

**S3 Tab Structure**
- **D-01:** Bucket-centric navigation. Service root = bucket list. Click bucket → object browser. Objects are a child route of the bucket, not a separate tab. AWS Console identical.
- **D-02:** URL pattern: `/services/s3` (bucket list), `/services/s3/{bucket-name}` (object browser with prefix query param), `/services/s3/{bucket-name}?prefix=folder/`.

**Object Browsing & Pagination**
- **D-03:** Server-side pagination using ListObjectsV2 continuation-token. Previous/Next buttons per page. Page size configurable (50/100/200). AWS Console identical.
- **D-04:** Folder navigation via `delimiter='/'` + CommonPrefixes. Folder names displayed as clickable rows. Click folder → updates prefix. Breadcrumb trail shows current path.
- **D-05:** Object table columns: Name (key basename), Type (folder/file), Size, Last modified. Folders show "-" for size/date.

**Upload**
- **D-06:** Drag-and-drop zone covers the entire object list area. Also a "Upload" button that opens file picker. Multiple files supported simultaneously.
- **D-07:** Progress indicator per file during upload. Uses PutObject API directly (no multipart). Flashbar success/error feedback per file.
- **D-08:** Upload target is current prefix (displayed in breadcrumb). Uploaded file key = current prefix + filename.

**Download**
- **D-09:** Direct download via GetObject API → Blob → browser save dialog. Download button in header actions + click on object name in table.

**Detail View**
- **D-10:** SplitPanel (Phase 2 pattern). Row click opens bottom panel with tabs: Properties (key, size, content-type, last-modified, ETag), Metadata (user metadata), Tags.

**Bucket CRUD**
- **D-11:** Create bucket modal: Name field only (region is implicit in local emulator). Bucket name validation per S3 rules (3-63 chars, lowercase, no consecutive dots, etc.).
- **D-12:** Delete bucket: Type-to-confirm with bucket name. Backend rejects if not empty.

**Object Delete**
- **D-13:** Type-to-confirm for single object delete. Bulk delete: type "delete" to confirm. Uses DeleteObject/DeleteObjects API.

**S3 API Protocol**
- **D-14:** S3 uses REST API (not Query protocol like EC2). PUT/GET/DELETE with path-style URLs. XML responses parsed with same DOMParser pattern from Phase 2.
- **D-15:** S3 client module separate from EC2: `web/src/services/s3/api/s3Client.ts`. Uses ky with appropriate headers (no Action parameter, path-based routing).

### Claude's Discretion

- Empty bucket state design (message + create button) — **UI-SPEC resolved**
- Empty object list state (message + upload button) — **UI-SPEC resolved**
- Loading skeleton vs spinner choice — **UI-SPEC resolved: Table loading={true} with loadingText**
- Error handling patterns (retry, toast, inline alert) — **UI-SPEC resolved: Alert in Table empty slot + Flashbar**
- Breadcrumb overflow behavior for deep prefixes — **UI-SPEC resolved: Cloudscape default collapses middle segments**
- Upload progress UI implementation (Flashbar vs dedicated progress bar) — **UI-SPEC resolved: Flashbar items with embedded ProgressBar**

All discretion items were pre-resolved during UI-SPEC authoring. Planner implements UI-SPEC verbatim; no fresh discretion expected at planning time.

### Deferred Ideas (OUT OF SCOPE)

- **Lambda UI** — Deferred within Phase 3, will be executed later (separate UI-SPEC addendum or new contract)
- **Versioning UI** — Object version list/restore/delete
- **Bucket settings editing** — Encryption, lifecycle, CORS, etc. (view-only at most)
- **Multipart upload UI** — Large file chunked upload
- **Object content preview** — Inline image/text/JSON preview
- **S3 static website hosting UI** — Configure bucket as static site
- **Cross-origin resource sharing configuration** — CORS rules editor

## Phase Requirements

| ID | Description | Research Support |
|----|-------------|------------------|
| S3-01 | List/create/delete buckets | UI-SPEC Bucket List Contract + Create Bucket Modal + Delete Bucket Contract; backend `_list_buckets`, `_create_bucket`, `_delete_bucket` all present. Phase 2 `CreateModal` + `DeleteModal` patterns reused. |
| S3-02 | Browse objects by folder prefix | UI-SPEC Object Browser Contract + Prefix Breadcrumb; backend `_list_objects_v2` supports `prefix` + `delimiter=/` + `continuation-token`. Synthetic `..` parent row and CommonPrefixes → folder rows handled in `ObjectTable`. |
| S3-03 | Upload (drag-drop) + download | UI-SPEC Upload Contract (XHR + 3-concurrent + Flashbar ProgressBar) + Download Contract (Blob + createObjectURL). Backend `_put_object` and `_get_object` return ETag/content. |
| S3-04 | View object metadata | UI-SPEC Object Detail SplitPanel Contract (Properties/Metadata/Tags tabs). Backend `_head_object` returns `x-amz-meta-*` headers; `_get_object_tagging` returns tag set. |
| LAM-01 | Function list with runtime/handler/modified | **OUT OF SCOPE for this execution — deferred per CONTEXT.md** |
| LAM-02 | Invoke with JSON payload, see response/log | **OUT OF SCOPE for this execution** |
| LAM-03 | Function detail config/env/triggers | **OUT OF SCOPE for this execution** |

## Project Constraints (from CLAUDE.md)

Directives the planner MUST honor:

- **Stack lock (hard):** React 19 + TypeScript 5.7+ + @cloudscape-design/components 3.x + Vite 6.x + React Router 7 library mode + TanStack Query 5 + Zustand 5 + ky 1.x. Versions already pinned in Phase 1 (vite 6.4.2, ts 5.9.3, ky 1.14.3). **Do not bump in Phase 3.**
- **Zero new npm dependencies in Phase 3 S3** (per UI-SPEC Registry Safety). No drag-and-drop library, no upload library — use browser-native DnD + XHR.
- **No Tailwind / no CSS Modules / no hex or px literals in components** — consume Cloudscape design tokens only.
- **Python backend minimal-dependency philosophy** — no backend changes expected; if any needed, must not add new Python deps.
- **Light mode only** — dark mode is Phase 5 (DIFF-02).
- **Desktop only** (≥ 720px); mobile out of scope.
- **GSD workflow:** All file changes must go through a GSD command, not direct edits.
- **Golden Principles:** Immutability (spread over mutation), small files (<800 lines), validate at system boundaries (zod or equivalent for user input — bucket name validation), TDD (RED → GREEN → IMPROVE), surgical changes (only change what's requested).
- **Conventions file is empty** — emerging patterns are locked by Phase 1/2 precedent.

## Standard Stack

Inherited verbatim from Phase 1/2 — **no new libraries introduced in Phase 3**.

### Core
| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| `@cloudscape-design/components` | 3.0.1266 (pinned, Phase 1) [VERIFIED: Phase 1 STATE.md] | All UI primitives (Table, Modal, SplitPanel, Flashbar, ProgressBar, BreadcrumbGroup, FileUpload, CopyToClipboard) | AWS's own design system — pixel-parity with AWS Console. All Phase 3 components already approved in Phase 1/2 UI-SPECs. [CITED: UI-SPEC Phase 3 Cloudscape Component Inventory] |
| `@cloudscape-design/collection-hooks` | (added Phase 2) [VERIFIED: UI-SPEC line 146] | `useCollection` for table filtering/sorting/pagination | Already integrated; reused for bucket table client-side pagination |
| `@cloudscape-design/design-tokens` | 3.x | Space/color/typography tokens | No hardcoded px/hex allowed |
| `@cloudscape-design/global-styles` | 1.x | Global CSS reset | Already imported in Phase 1 |
| `@tanstack/react-query` | 5.x | Server state (buckets, objects, metadata, tags) | All CRUD hooks follow Phase 2 pattern |
| `ky` | 1.14.3 (pinned, Phase 1) [VERIFIED: STATE.md] | HTTP client wrapper for REST calls | Used for ListBuckets / ListObjectsV2 / DeleteBucket / DeleteObject / HeadObject / GetObjectTagging / CreateBucket. Upload uses raw XHR instead (see below). |
| `zustand` | 5.x | UI state: page sizes, SplitPanel size | Already used in `stores/uiStore.ts` |
| `react-router-dom` | 7.x (library mode) | Routing including `/services/s3/:bucketName` and `?prefix=` query param | Already wired in `app/routes.tsx` |

### Supporting — browser-native APIs (no npm needed)
| API | Purpose | When to Use |
|-----|---------|-------------|
| `XMLHttpRequest` + `xhr.upload.onprogress` | Upload progress per file | Upload helper only. Fetch does not expose upload progress reliably cross-browser. [CITED: UI-SPEC Upload Contract line 509] |
| `File` / `Blob` / `FormData` | File handling | Native drop target provides `DataTransfer.files: FileList` |
| `URL.createObjectURL` + `URL.revokeObjectURL` | Blob download | Trigger browser save dialog via synthetic `<a download>` click |
| `DOMParser` | Parse S3 XML responses | Already used via `shared/api/xml.ts` helpers |

### Alternatives Considered
| Instead of | Could Use | Tradeoff |
|------------|-----------|----------|
| Raw XHR for upload progress | `fetch` + `ReadableStream` upload progress | Fetch upload progress (via `Request` with `ReadableStream` body + `duplex: 'half'`) requires HTTP/2 and Chrome 105+. Safari 17 still does not expose upload progress reliably. **Stay on XHR for portability.** [CITED: UI-SPEC line 509] |
| Browser-native drag-drop | `react-dropzone` or `@uppy/react` | Both are full npm packages and forbidden by UI-SPEC Registry Safety. Native `onDragEnter`/`onDragOver`/`onDragLeave`/`onDrop` on a container `<div>` is sufficient and costs zero bytes. |
| Bucket-name validation inline | `zod` schema | The project already approved zod-style validation in CLAUDE.md, but bucket-name rules are a single regex + a few guards. Inline validation in `CreateBucketModal` per UI-SPEC is clearer. The planner may choose a shared helper `validateBucketName(name): string \| null`. |
| Path-style client | Virtual-hosted style (`bucket.s3.localhost:4566`) | Backend supports both (see `_S3_VHOST_RE` in `ministack/app.py`), but path-style (`/{bucket}/{key}`) is simpler in-browser (no DNS) and matches CONTEXT.md D-14/D-15. **Use path-style.** |

**Installation:** None. All libraries already installed.

## Architecture Patterns

### Recommended Project Structure

From UI-SPEC "File / Module Inventory" section (lines 957-997, reproduced for planner):

```
web/src/services/s3/
├── S3Layout.tsx                    # Wrapper for bucket-list & object-browser routes
├── BucketListPage.tsx              # /services/s3
├── ObjectBrowserPage.tsx           # /services/s3/:bucketName  (reads ?prefix=)
├── components/
│   ├── BucketTable.tsx             # Bucket-list table
│   ├── BucketDetail.tsx            # SplitPanel content for buckets
│   ├── CreateBucketModal.tsx
│   ├── DeleteBucketModal.tsx
│   ├── ObjectTable.tsx             # Includes synthetic ".." parent row
│   ├── ObjectDetail.tsx            # SplitPanel tabs (Properties/Metadata/Tags)
│   ├── DeleteObjectModal.tsx
│   ├── PrefixBreadcrumb.tsx        # Inner BreadcrumbGroup
│   ├── DropZone.tsx                # Native drag-drop wrapper
│   ├── UploadFlashItem.tsx         # Flashbar item + ProgressBar
│   ├── DownloadFlashItem.tsx       # Flashbar item for bulk download
│   └── columns.ts
└── api/
    ├── s3Client.ts                 # path-style REST client
    ├── parseS3Xml.ts               # ListAllMyBucketsResult, ListBucketResult parsers
    ├── uploadClient.ts             # XHR-based upload helper w/ progress + cancel
    ├── downloadClient.ts           # Blob-based download helper
    ├── useBuckets.ts               # ListBuckets
    ├── useObjects.ts               # ListObjectsV2 (prefix + continuation)
    ├── useObjectMetadata.ts        # HeadObject
    ├── useObjectTags.ts            # GetObjectTagging
    ├── bucketMutations.ts          # CreateBucket / DeleteBucket
    └── objectMutations.ts          # PutObject / DeleteObject / DeleteObjects
```

Route injection (`web/src/app/routes.tsx`):

```
{ path: 'services/s3',              element: <S3Layout><BucketListPage /></S3Layout> },
{ path: 'services/s3/:bucketName',  element: <S3Layout><ObjectBrowserPage /></S3Layout> },
// MUST sit BEFORE the services/:serviceKey wildcard (same pattern as services/ec2 today)
```

### Pattern 1: S3 REST client (path-style)

Contrast with `ec2Client.ts` which uses Query protocol (POST to `/` with `Action=…` form body). S3 uses HTTP verbs + path.

```typescript
// web/src/services/s3/api/s3Client.ts  (SKETCH — planner finalizes)
import { apiClient } from '../../../shared/api/client'

const ORIGIN =
  typeof window !== 'undefined' && window.location?.origin ? window.location.origin : ''

// Fake SigV4 header — MiniStack doesn't verify signatures but some services check presence.
const AUTHORIZATION =
  'AWS4-HMAC-SHA256 Credential=test/20260417/us-east-1/s3/aws4_request'

export async function s3Get(path: string, searchParams?: Record<string, string>) {
  return apiClient
    .get(`${ORIGIN}${path}`, {
      headers: { Authorization: AUTHORIZATION },
      searchParams,
    })
    .text()
}

export async function s3Put(path: string, body?: BodyInit, headers: Record<string, string> = {}) {
  return apiClient.put(`${ORIGIN}${path}`, {
    headers: { Authorization: AUTHORIZATION, ...headers },
    body,
  })
}

export async function s3Delete(path: string, searchParams?: Record<string, string>) {
  return apiClient.delete(`${ORIGIN}${path}`, {
    headers: { Authorization: AUTHORIZATION },
    searchParams,
  })
}
// POST /{bucket}?delete  (batch delete)
export async function s3PostDelete(path: string, xml: string) { ... }
```

### Pattern 2: ListObjectsV2 pagination with a token stack

Server returns `NextContinuationToken` when `IsTruncated=true`. Cloudscape `Pagination` numbers-mode does not map; build a thin Prev/Next wrapper.

```typescript
// Sketch
type PageState = {
  tokens: string[]   // stack: tokens[i] is the token used to FETCH page i+2; tokens[0] fetched page 2
  current: number    // 0-indexed page
}

// Next: push NextContinuationToken, current++
// Prev: pop, current--
// Prefix change: reset state to { tokens: [], current: 0 }
```

Backend `_list_objects_v2` (lines 2211-2284 of `ministack/services/s3.py`) base64-encodes the token, so tokens are URL-safe.

### Pattern 3: Drag-and-drop zone (browser-native)

```tsx
// DropZone.tsx (sketch)
function DropZone({ onDrop, children }: { onDrop: (files: File[]) => void; children: ReactNode }) {
  const [over, setOver] = useState(false)

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault(); setOver(true)
  }
  const handleDragLeave = (e: React.DragEvent) => {
    // Only leave when relatedTarget is outside the zone — guards against child-to-child transitions.
    if (!e.currentTarget.contains(e.relatedTarget as Node)) setOver(false)
  }
  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault(); setOver(false)
    onDrop(Array.from(e.dataTransfer.files))
  }

  return (
    <div
      role="region"
      aria-label="Object upload drop zone"
      onDragEnter={handleDragOver}
      onDragOver={handleDragOver}
      onDragLeave={handleDragLeave}
      onDrop={handleDrop}
      className={over ? 'drop-over' : ''}
    >
      {children}
    </div>
  )
}
```

The `className` hook consumes design-tokens via a light stylesheet (allowed per Phase 1 pattern for structural styling; tokens still sourced from `@cloudscape-design/design-tokens`).

### Pattern 4: XHR-based upload with progress + cancel

```typescript
// uploadClient.ts (sketch)
export type UploadHandle = {
  promise: Promise<void>
  cancel: () => void
}

export function uploadObject(params: {
  bucket: string
  key: string
  file: File
  onProgress: (bytesUploaded: number, total: number) => void
}): UploadHandle {
  const xhr = new XMLHttpRequest()
  const promise = new Promise<void>((resolve, reject) => {
    xhr.upload.addEventListener('progress', (ev) => {
      if (ev.lengthComputable) params.onProgress(ev.loaded, ev.total)
    })
    xhr.addEventListener('load', () =>
      xhr.status >= 200 && xhr.status < 300
        ? resolve()
        : reject(new Error(`${xhr.status}: ${xhr.responseText}`)),
    )
    xhr.addEventListener('error', () => reject(new Error('Network error')))
    xhr.addEventListener('abort', () => reject(Object.assign(new Error('Cancelled'), { cancelled: true })))
    xhr.open('PUT', `/${params.bucket}/${encodeURIComponent(params.key)}`)
    xhr.setRequestHeader('Content-Type', params.file.type || 'application/octet-stream')
    xhr.send(params.file)
  })
  return { promise, cancel: () => xhr.abort() }
}
```

Throttle `onProgress` (UI-SPEC accessibility: throttle to every 10% for screen-reader `aria-live` announcements) — throttling lives in the Flashbar item component, not in the helper.

Concurrency: the UI maintains a queue that keeps at most 3 uploads in-flight (UI-SPEC line 487). A small inline promise-pool function is sufficient; no `p-limit` dependency.

### Pattern 5: Blob download

```typescript
// downloadClient.ts (sketch)
export async function downloadObject(bucket: string, key: string) {
  const res = await fetch(`/${bucket}/${encodeURIComponent(key)}`)
  if (!res.ok) throw new Error(`${res.status}`)
  const blob = await res.blob()
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = key.split('/').pop() || key
  document.body.appendChild(a); a.click(); a.remove()
  setTimeout(() => URL.revokeObjectURL(url), 60_000)
}
```

Per UI-SPEC Download Contract (line 534-539), `key.split('/').pop()` gives the basename for the `download` attribute.

### Pattern 6: Prefix encoded in URL query param

React Router 7 library mode:

```typescript
const [search, setSearch] = useSearchParams()
const prefix = search.get('prefix') ?? ''

const goIntoFolder = (folderName: string) => {
  const next = prefix + folderName  // folder names from CommonPrefixes already have trailing slash
  setSearch({ prefix: next })
}

const goUp = () => {
  const parts = prefix.replace(/\/$/, '').split('/')
  parts.pop()
  const next = parts.length ? parts.join('/') + '/' : ''
  if (next) setSearch({ prefix: next }); else setSearch({})
}
```

Token stack for continuation (Pattern 2) lives in component state (not URL) per UI-SPEC line 420: "tokens are ephemeral session state."

### Anti-Patterns to Avoid

- **Don't use `ec2Query` for S3.** S3 is REST, not Query protocol. Build `s3Client.ts` from scratch.
- **Don't put continuation tokens in the URL.** Users browse back/forward; stale tokens become invalid. Keep them in local state; reset on prefix change.
- **Don't preserve subpaths in drag-dropped files with `webkitRelativePath`.** UI-SPEC D-08 (line 481) resolves: upload as literal basename only.
- **Don't auto-refetch the objects list on every upload.** Wait until the whole batch completes; invalidate once (UI-SPEC line 513-515).
- **Don't run more than 3 concurrent uploads.** UI-SPEC line 487 caps concurrency.
- **Don't use `ky` for uploads.** Progress events require raw XHR. Ky is fine for everything else.
- **Don't trust `DataTransfer.items` for folder drops.** Phase 3 supports flat files only — if user drops a folder, read only direct-child `File` entries from `DataTransfer.files` (which flattens to files, not folders). Warn and skip folders if detected.
- **Don't extract shared components into `services/shared/` speculatively.** Phase 2's `ResourceTable`/`DeleteModal`/etc. live in `services/ec2/components/`. Phase 3 may either (a) import directly from EC2 (risky cross-service coupling) or (b) duplicate with S3 copy. The planner decides. Extracting to a shared folder is a Phase 4 refactor (when Phase 4 also uses them).

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| Table filtering / sorting / client-side pagination | Custom filter reducers | Cloudscape `useCollection` hook | Already used in Phase 2; handles 90% of UX correctly (debounce, keyboard, a11y) |
| Type-to-confirm modal | Custom state machine | Reuse Phase 2 `DeleteModal` pattern | Accepts `resourceType` + `resourceId`; single-file component |
| Bucket-name regex | Complex parser | Single regex + 7 targeted guards | Rules: 3–63 chars, `[a-z0-9-]`, no leading/trailing hyphen, no `..`, no IP-shape, no uppercase. [CITED: UI-SPEC Create Bucket Modal validation] |
| Drag-drop event plumbing | A new component framework | Native `onDragOver`/`onDrop` | 30 lines of code; `react-dropzone` is 8.5kB gzip and forbidden by Registry Safety |
| Upload progress | A library wrapper | `XMLHttpRequest.upload.onprogress` | Browser-native, MIT-free, no dependency cost |
| Concurrency limit | `p-limit` npm package | 30-line inline promise queue | Matches project minimum-deps philosophy |
| Blob download | File-saver npm package | `URL.createObjectURL` + `<a download>` | Works in every modern browser |
| XML parsing | A new library | Reuse `shared/api/xml.ts` helpers (`parseXml`, `getText`, `getItems`) | Same DOMParser approach as Phase 2 |
| SigV4 signing | A crypto library | A dummy `Authorization` header string | MiniStack doesn't verify signatures; same pattern as `ec2Client.ts` line 12 |
| Human-readable byte formatting | A utility library | One pure function: `KB/MB/GB` switch on magnitude | UI-SPEC specifies `1.2 MB`, `340 KB` — 10-line helper |
| Relative time | `dayjs` or `date-fns` | **Skip — UI-SPEC shows ISO in Phase 3**; relative time is Phase 5 (DIFF / DISP-03) |

**Key insight:** This phase is intentionally a thin UI layer over a complete backend. Every "complex" piece has been solved upstream — the planner's job is to wire existing capabilities together with zero speculative abstraction.

## Common Pitfalls

### Pitfall 1: URL-encoding mismatch between client and backend
**What goes wrong:** Object keys with `/`, spaces, or non-ASCII characters get double-encoded (or not encoded) and the backend returns 404.
**Why it happens:** `ky` encodes `searchParams` but the path component is passed through raw. Using `encodeURIComponent` on a key like `photos/cat.jpg` turns `/` into `%2F`, which `_parse_bucket_key` may or may not normalize.
**How to avoid:** `encodeURIComponent` each path segment split by `/`, then rejoin. Example helper: `key.split('/').map(encodeURIComponent).join('/')`. Verify with a key containing spaces (e.g., `my folder/a b.txt`) in Wave 0 smoke.
**Warning signs:** 404 NoSuchKey when key visibly exists; download fails silently for keys with special chars.

### Pitfall 2: Drag-leave fires on child elements
**What goes wrong:** Hovering over a child element inside the drop-zone triggers `dragleave` → drop-zone un-highlights → user thinks drop will fail.
**Why it happens:** `dragleave` fires every time the pointer crosses an inner-element boundary, including into child elements (not just out of the zone).
**How to avoid:** Guard with `if (!e.currentTarget.contains(e.relatedTarget as Node)) setOver(false)`. Alternatively track a counter (`onDragEnter` increments, `onDragLeave` decrements — reset to idle only when counter reaches 0).
**Warning signs:** Drag-over visual state flickers while hovering over table rows.

### Pitfall 3: Continuation-token state becomes stale across prefix changes
**What goes wrong:** User is on page 3 of `/photos/`, clicks a different folder. The token stack still has tokens from `/photos/`. Clicking Prev/Next returns the wrong bucket contents.
**Why it happens:** Pagination state lives in component state but is keyed to prefix implicitly.
**How to avoid:** Reset token stack in `useEffect(() => { setTokens([]) ; setCurrent(0) }, [prefix])`. Same for `selectedItems`.
**Warning signs:** Pagination buttons stay active after prefix change; Next shows unexpected objects.

### Pitfall 4: `IsTruncated=false` + non-empty `NextContinuationToken` is not valid
**What goes wrong:** UI treats presence of a token as "has more" and Next button stays enabled on the last page.
**Why it happens:** Reading both signals independently.
**How to avoid:** Single source of truth — disable Next iff `response.IsTruncated === false`. Ignore token presence.
**Warning signs:** Next button clickable on last page; clicking fetches empty result.

### Pitfall 5: Route ordering regression
**What goes wrong:** `/services/s3` resolves to Phase 1 `ServiceHome` placeholder because `services/:serviceKey` wildcard matches first.
**Why it happens:** Route table is ordered; wildcards match any string.
**How to avoid:** Insert S3 routes BEFORE the `services/:serviceKey` entry in `app/routes.tsx` (same rule Phase 2 applied for `services/ec2` — see line 43 comment "Pitfall 5"). [VERIFIED: `web/src/app/routes.tsx` line 43]
**Warning signs:** Clicking "S3" in sidebar shows generic service placeholder.

### Pitfall 6: Upload succeeds but UI doesn't refresh
**What goes wrong:** User uploads a file, Flashbar shows success, but the file doesn't appear in the table until manual refresh.
**Why it happens:** TanStack Query cache not invalidated after mutation.
**How to avoid:** After batch completes (either all success or at least one success), call `queryClient.invalidateQueries({ queryKey: ['s3', 'objects', bucketName, prefix] })`. Per UI-SPEC line 513, invalidate ONCE per batch, not per file.
**Warning signs:** Objects appear only after manual Refresh or prefix navigation.

### Pitfall 7: Blob URL memory leak
**What goes wrong:** Repeated downloads exhaust browser memory.
**Why it happens:** `URL.createObjectURL` holds the Blob in memory until revoked.
**How to avoid:** `setTimeout(() => URL.revokeObjectURL(url), 60_000)` after triggering download (UI-SPEC line 539). 60s gives the browser time to complete the download even for large files.
**Warning signs:** Browser memory grows unboundedly during bulk downloads.

### Pitfall 8: Bucket name globally unique vs per-emulator
**What goes wrong:** UI validates client-side but backend accepts a duplicate name without error (real S3 behavior: 409 BucketAlreadyExists; emulator: 200 Location — idempotent).
**Why it happens:** `_create_bucket` in `ministack/services/s3.py` line 576-578 is explicitly idempotent: "same account already owns it — return 200 like real AWS."
**How to avoid:** UI-SPEC line 294 already accounts for this: "must be globally unique (delegated to server — UI surfaces the error inline)." In practice the emulator never returns an error for duplicates, so duplicate creates silently succeed. Document this as known behavior; do not add client-side dedup. A refresh after create always reveals true state.
**Warning signs:** Creating an existing bucket shows success but nothing changes.

### Pitfall 9: DeleteObjects XML body format
**What goes wrong:** Bulk delete returns 400 BadRequest because the body is malformed.
**Why it happens:** `_delete_objects` expects the `POST /{bucket}?delete` XML format with `<Delete><Object><Key>…</Key></Object>…</Delete>`.
**How to avoid:** Build the XML with template strings (small helper) rather than hand-concatenating. Include `<Quiet>false</Quiet>` so the response includes per-key results the UI can surface in Flashbar per UI-SPEC line 635.
**Warning signs:** Bulk delete returns 400; partial-failure messages never appear.

### Pitfall 10: Metadata headers lowercased on HEAD response
**What goes wrong:** SplitPanel Metadata tab shows `{ x-amz-meta-author: 'alice' }` with full prefix instead of `{ author: 'alice' }`.
**Why it happens:** HTTP headers are case-insensitive; fetch lowercases them. The UI must strip the `x-amz-meta-` prefix before display.
**How to avoid:** Iterate `res.headers.entries()`, filter entries whose key starts with `x-amz-meta-`, strip the prefix, preserve case-as-received for the metadata name. [CITED: backend `_object_response_headers` at `ministack/services/s3.py` line 316]
**Warning signs:** Metadata tab shows `x-amz-meta-*` prefixes.

## Runtime State Inventory

Phase 3 is **greenfield implementation** (new files under `web/src/services/s3/`), not a rename or refactor. No runtime state inventory required — backend is unchanged, no installed packages are renamed, no OS-level registrations exist. **SKIPPED intentionally.**

## Environment Availability

All dependencies are already installed and verified in Phase 1/2:

| Dependency | Required By | Available | Version | Fallback |
|------------|------------|-----------|---------|----------|
| React 19 + Cloudscape 3 | UI layer | ✓ | 3.0.1266 | — |
| Vite 6 | Build | ✓ | 6.4.2 | — |
| TanStack Query 5 | Server state | ✓ | 5.x | — |
| ky 1.x | HTTP | ✓ | 1.14.3 | — |
| Zustand 5 | UI state | ✓ | 5.x | — |
| React Router 7 | Routing | ✓ | 7.x | — |
| vitest | Unit tests | ✓ | 3.2.4 | — |
| MSW | Test mocking (Phase 1) | ✓ | — | — |
| Playwright | E2E | ✓ | — | — |
| MiniStack S3 emulator | Backend | ✓ | `ministack/services/s3.py` 2,850 lines, all endpoints the UI needs exist | — |

**No new dependencies required, none blocking.**

## Code Examples

### Parsing ListBuckets response

```typescript
// api/parseS3Xml.ts  (sketch)
import { parseXml } from '../../../shared/api/xml'

export type S3Bucket = { name: string; creationDate: string }

export function parseBuckets(xml: string): S3Bucket[] {
  const doc = parseXml(xml)
  const buckets = doc.getElementsByTagName('Bucket')
  return Array.from(buckets).map((b) => ({
    name: b.getElementsByTagName('Name')[0]?.textContent ?? '',
    creationDate: b.getElementsByTagName('CreationDate')[0]?.textContent ?? '',
  }))
}
```

Backend XML (from `_list_buckets` line 557-567):

```xml
<ListAllMyBucketsResult xmlns="http://s3.amazonaws.com/doc/2006-03-01/">
  <Owner><ID>owner-id</ID><DisplayName>ministack</DisplayName></Owner>
  <Buckets>
    <Bucket><Name>my-bucket</Name><CreationDate>2026-04-12T10:30:00Z</CreationDate></Bucket>
  </Buckets>
</ListAllMyBucketsResult>
```

### Parsing ListObjectsV2 response

```typescript
export type S3ObjectEntry = {
  kind: 'file' | 'folder'
  key: string          // full key for files; prefix (ends with '/') for folders
  name: string         // basename (file: key.split('/').pop(); folder: last segment)
  size?: number
  lastModified?: string
  etag?: string
}

export type ListObjectsResult = {
  entries: S3ObjectEntry[]
  isTruncated: boolean
  nextContinuationToken: string | null
  keyCount: number
}

export function parseObjects(xml: string): ListObjectsResult {
  const doc = parseXml(xml)

  const folders: S3ObjectEntry[] = Array.from(doc.getElementsByTagName('CommonPrefixes')).map(
    (cp) => {
      const prefix = cp.getElementsByTagName('Prefix')[0]?.textContent ?? ''
      const trimmed = prefix.replace(/\/$/, '')
      return {
        kind: 'folder',
        key: prefix,
        name: trimmed.includes('/') ? trimmed.substring(trimmed.lastIndexOf('/') + 1) : trimmed,
      }
    },
  )

  const files: S3ObjectEntry[] = Array.from(doc.getElementsByTagName('Contents')).map((c) => {
    const key = c.getElementsByTagName('Key')[0]?.textContent ?? ''
    return {
      kind: 'file',
      key,
      name: key.includes('/') ? key.substring(key.lastIndexOf('/') + 1) : key,
      size: Number(c.getElementsByTagName('Size')[0]?.textContent ?? '0'),
      lastModified: c.getElementsByTagName('LastModified')[0]?.textContent ?? '',
      etag: c.getElementsByTagName('ETag')[0]?.textContent ?? '',
    }
  })

  return {
    entries: [...folders, ...files],
    isTruncated: doc.getElementsByTagName('IsTruncated')[0]?.textContent === 'true',
    nextContinuationToken:
      doc.getElementsByTagName('NextContinuationToken')[0]?.textContent ?? null,
    keyCount: Number(doc.getElementsByTagName('KeyCount')[0]?.textContent ?? '0'),
  }
}
```

### TanStack Query hook for objects

```typescript
// api/useObjects.ts  (sketch)
import { useQuery } from '@tanstack/react-query'
import { s3Get } from './s3Client'
import { parseObjects } from './parseS3Xml'

export function useObjects(params: {
  bucket: string
  prefix: string
  pageSize: number
  continuationToken: string | null
}) {
  return useQuery({
    queryKey: ['s3', 'objects', params.bucket, params.prefix, params.pageSize, params.continuationToken],
    queryFn: async () => {
      const searchParams: Record<string, string> = {
        'list-type': '2',
        'max-keys': String(params.pageSize),
        delimiter: '/',
      }
      if (params.prefix) searchParams.prefix = params.prefix
      if (params.continuationToken) searchParams['continuation-token'] = params.continuationToken
      const xml = await s3Get(`/${params.bucket}`, searchParams)
      return parseObjects(xml)
    },
    placeholderData: (previous) => previous,
  })
}
```

### Mutation: CreateBucket

```typescript
// api/bucketMutations.ts  (sketch)
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { s3Put, s3Delete } from './s3Client'

export function useCreateBucket() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async (name: string) => {
      // CreateBucket: PUT /{bucket} with optional <CreateBucketConfiguration>
      // MiniStack accepts empty body; no region constraint needed (D-11).
      await s3Put(`/${name}`)
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['s3', 'buckets'] }),
  })
}

export function useDeleteBucket() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (name: string) => s3Delete(`/${name}`),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['s3', 'buckets'] }),
  })
}
```

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| `react-dropzone` for drag-drop | Native `onDrop` + `DataTransfer.files` | React 18+ with TypeScript ships accurate event types | Zero dependency; ~30 lines of code |
| Fetch upload progress via `ReadableStream` body | Raw XHR with `upload.onprogress` | Safari 17 still inconsistent for fetch upload progress | Use XHR for uploads only, fetch/ky for everything else |
| `axios` for HTTP | `ky` on fetch | Project-wide since Phase 1 | Smaller bundle, cleaner API |
| `file-saver` for downloads | `URL.createObjectURL` + synthetic `<a download>` | All modern browsers support it since ~2020 | Zero dependency |

**Deprecated/outdated in this context:**
- Chunked/multipart upload libraries (`tus-js-client`, `@uppy/*`) — not needed until files exceed ~100 MB. MVP skips them.
- Redux for server state — superseded by TanStack Query.
- CRA / webpack for React build — superseded by Vite.

## Assumptions Log

| # | Claim | Section | Risk if Wrong |
|---|-------|---------|---------------|
| A1 | MiniStack emulator accepts a dummy `Authorization` header on S3 calls without SigV4 verification | Pattern 1 (s3Client sketch) | Every S3 call returns 403. Mitigation: verify in Wave 0 smoke test (already proven for EC2 with the same approach). [ASSUMED] |
| A2 | Fetch lowercases response headers, so `x-amz-meta-*` comes through as lowercase | Pitfall 10 | Metadata parsing misses entries. Mitigation: test with an object that has mixed-case metadata; use case-insensitive match. [ASSUMED] |
| A3 | `encodeURIComponent` on each path segment round-trips correctly through `_parse_bucket_key` | Pitfall 1 | Special-character keys 404. Mitigation: Wave 0 smoke with a key containing space + unicode + slash. [ASSUMED] |
| A4 | Browser `XMLHttpRequest.upload.onprogress` fires reliably for files ≥ 1 MB in all target browsers (Chrome/Firefox/Safari) | Pattern 4 | Progress bar appears stuck. Mitigation: MVP supports smooth progress for files ≥ ~1 MB; for tiny files progress may jump 0→100. UI-SPEC throttles to 10% increments which tolerates this. [ASSUMED] |
| A5 | Synthetic `<a download>` click works across browsers without user gesture concerns because download is triggered inside a click handler | Pattern 5 / Download Contract | Safari may block auto-downloads. Mitigation: trigger download synchronously in the button click handler (not after an awaited fetch); since UI-SPEC line 534 awaits fetch first, cross-browser test in Wave 0. [ASSUMED] |
| A6 | Phase 2 `ResourceTable`, `DeleteModal`, `CreateModal`, `SplitPanelDetail`, `FlashNotifications` components are generic enough to reuse directly in S3 (not EC2-specific logic embedded) | Architecture Patterns | May need to duplicate or refactor into `services/shared/`. Review each component's API in Wave 0 — if any has EC2-specific props or copy, decide per-component whether to import-as-is, extend, or duplicate. [ASSUMED — planner must verify by reading each file] |
| A7 | No backend changes required for Phase 3 S3 | Summary | If backend is missing something (e.g., CORS header on GetObject for browser download), need a quick backend patch. Mitigation: Wave 0 smoke test hitting `/` from Vite dev server (port 5566 → 4566 proxy) for each of ListBuckets, PutObject, GetObject confirms viability. [ASSUMED] |

## Open Questions (RESOLVED)

1. **Should Phase 2 components be extracted to `services/shared/components/` now?**
   - What we know: `ResourceTable`, `DeleteModal`, `CreateModal`, `SplitPanelDetail`, `FlashNotifications`, `StatusBadge` exist under `services/ec2/components/`.
   - What's unclear: Whether they use EC2-specific copy strings, types, or `applyNameTag` logic internally.
   - **RESOLVED:** Planner spike as Task 1 — read each file, decide per component: (a) reuse as-is by importing from `../../ec2/components/`, (b) extract to `services/shared/components/`, or (c) duplicate with S3 adaptations. Default to (a) for minimal risk; escalate to (b) only if an S3 copy-string conflict forces divergence. Track (c) as tech debt to resolve in Phase 4.

2. **Does the MiniStack vite dev server proxy S3 PUT/DELETE through correctly?**
   - What we know: Phase 1 proved `/` POST (EC2 Query) works through the proxy; console API `/_console/api/*` works.
   - What's unclear: Whether raw PUT `/{bucket}/{key}` with binary body traverses Vite proxy unchanged.
   - **RESOLVED:** Wave 0 smoke: a 1 KB PutObject + GetObject round-trip. If Vite proxy corrupts binary body, switch dev to talk direct to :4566 via CORS or run backend separately.

3. **Is there an existing `FileUpload` Cloudscape component that fits better than a custom `<input type="file">`?**
   - What we know: UI-SPEC line 143 mentions `FileUpload` as "optional: Cloudscape's built-in file picker component ... prefer this over a raw `<input type="file">` for visual consistency."
   - What's unclear: Whether Cloudscape `FileUpload` integrates with a programmatic "Upload" button in Header actions (it normally renders its own UI).
   - **RESOLVED:** Planner evaluates in implementation. A plain hidden `<input type="file" multiple />` + click from the Cloudscape `Button` is the simplest path and matches UI-SPEC Interaction Contract line 862.

4. **Should the `..` parent row be rendered inside the Table or as a separate row above?**
   - What we know: UI-SPEC line 399 specifies synthetic row with `name: '..'`, `type: 'folder'`, no checkbox, not filterable, not selectable, navigates on click.
   - What's unclear: Cloudscape Table doesn't natively support a "pinned" un-selectable row. Options: (a) include `..` in `items` array with a sentinel key and suppress selection/filter via cell-render branches, (b) render `..` outside Table as a separate interactive row above it.
   - **RESOLVED:** Option (a) — single Table, sentinel key `__parent__`, column renderers skip action icons and filter predicate ignores it. Avoid rendering outside the Table to keep focus/keyboard behavior consistent.

## Validation Architecture

### Test Framework
| Property | Value |
|----------|-------|
| Framework | vitest 3.2.4 + Testing Library (unit/component) [VERIFIED: STATE.md Phase 1] |
| E2E framework | Playwright |
| Config file | `vite.config.ts` / `vitest.config.ts` (Phase 1 split) |
| Quick run command | `npm run test -- src/services/s3` |
| Full suite command | `npm test` |
| Component test pattern | `src/**/*.{test,spec}.{ts,tsx}` |
| E2E location | `e2e/**` (owned by Playwright) |

### Phase Requirements → Test Map

| Req ID | Behavior | Test Type | Automated Command | File Exists? |
|--------|----------|-----------|-------------------|--------------|
| S3-01 | List buckets renders table with fetched bucket names | unit (component) | `npm run test -- src/services/s3/components/BucketTable.test.tsx -x` | ❌ Wave 0 |
| S3-01 | Create bucket modal validates name, submits, refetches | unit (component) | `npm run test -- src/services/s3/components/CreateBucketModal.test.tsx -x` | ❌ Wave 0 |
| S3-01 | Delete bucket type-to-confirm matches bucket name | unit (component) | `npm run test -- src/services/s3/components/DeleteBucketModal.test.tsx -x` | ❌ Wave 0 |
| S3-02 | ListObjectsV2 prefix/delimiter query produces folders + files | unit (parser) | `npm run test -- src/services/s3/api/parseS3Xml.test.ts -x` | ❌ Wave 0 |
| S3-02 | Clicking folder updates `?prefix=` query param | unit (component) | `npm run test -- src/services/s3/components/ObjectTable.test.tsx -x` | ❌ Wave 0 |
| S3-02 | Continuation token Prev/Next stack correctness | unit (hook) | `npm run test -- src/services/s3/api/useObjects.test.ts -x` | ❌ Wave 0 |
| S3-02 | `..` parent row navigates up one segment | unit (component) | covered by ObjectTable.test.tsx | ❌ Wave 0 |
| S3-03 | Drop-zone fires `onDrop` with files from `DataTransfer` | unit (component) | `npm run test -- src/services/s3/components/DropZone.test.tsx -x` | ❌ Wave 0 |
| S3-03 | Upload client emits progress events, resolves on 200 | unit | `npm run test -- src/services/s3/api/uploadClient.test.ts -x` | ❌ Wave 0 |
| S3-03 | Upload concurrency capped at 3 | unit | included in uploadClient.test.ts | ❌ Wave 0 |
| S3-03 | Batch completion invalidates objects query once | integration | `npm run test -- src/services/s3/components/UploadFlashItem.test.tsx -x` | ❌ Wave 0 |
| S3-03 | Download client creates object URL and revokes after 60s | unit | `npm run test -- src/services/s3/api/downloadClient.test.ts -x` | ❌ Wave 0 |
| S3-04 | SplitPanel renders Properties / Metadata / Tags tabs | unit (component) | `npm run test -- src/services/s3/components/ObjectDetail.test.tsx -x` | ❌ Wave 0 |
| S3-04 | Metadata tab strips `x-amz-meta-` prefix | unit | covered by ObjectDetail.test.tsx | ❌ Wave 0 |
| All | End-to-end: upload → list → download → delete flow | e2e (Playwright) | `npm run test:e2e -- s3-flow.spec.ts` | ❌ Wave 0 (manual-only acceptable for first pass) |

### Sampling Rate
- **Per task commit:** `npm run test -- src/services/s3 --run`
- **Per wave merge:** `npm test -- --run` (full unit suite)
- **Phase gate:** Full unit suite green + Playwright smoke for one bucket CRUD + one object upload/download cycle before `/gsd-verify-work`.

### Wave 0 Gaps
- [ ] `src/services/s3/api/parseS3Xml.test.ts` — XML parser tests for ListBuckets, ListObjectsV2, GetObjectTagging
- [ ] `src/services/s3/api/s3Client.test.ts` — request URL assembly, header injection
- [ ] `src/services/s3/api/uploadClient.test.ts` — XHR progress mock, cancel behavior, concurrency pool
- [ ] `src/services/s3/api/downloadClient.test.ts` — Blob → createObjectURL → anchor click → revoke timer
- [ ] `src/services/s3/api/useObjects.test.ts` — pagination token stack reset on prefix change
- [ ] `src/services/s3/components/BucketTable.test.tsx` — empty state, load-error state, navigation click
- [ ] `src/services/s3/components/ObjectTable.test.tsx` — `..` parent row, folder vs file rendering, filter ignores parent
- [ ] `src/services/s3/components/DropZone.test.tsx` — drag-enter/over/leave state, drop extracts files
- [ ] `src/services/s3/components/CreateBucketModal.test.tsx` — bucket-name validation matrix (7 rules)
- [ ] `src/services/s3/components/DeleteBucketModal.test.tsx` — exact-name match required
- [ ] `src/services/s3/components/DeleteObjectModal.test.tsx` — full-key match for single, "delete" word for bulk
- [ ] `src/services/s3/components/ObjectDetail.test.tsx` — three tabs, metadata prefix stripping, tag empty state
- [ ] `src/services/s3/components/UploadFlashItem.test.tsx` — lifecycle states (queued/in-progress/success/failed/cancelled)
- [ ] MSW handlers: `src/test/s3Handlers.ts` — mock ListBuckets, ListObjectsV2, PutObject, GetObject, HeadObject, DeleteObject, DeleteObjects, GetObjectTagging
- [ ] Fixtures: sample XML responses under `src/test/fixtures/s3/`
- [ ] Playwright: `e2e/s3-flow.spec.ts` — end-to-end smoke against live :4566

Framework install: **None required** — vitest, Testing Library, MSW, Playwright all present from Phase 1.

## Security Domain

Enforcement is enabled (config absent = enabled).

### Applicable ASVS Categories

| ASVS Category | Applies | Standard Control |
|---------------|---------|-----------------|
| V2 Authentication | no | Local dev tool, no auth (per REQUIREMENTS.md "Out of Scope") |
| V3 Session Management | no | Same |
| V4 Access Control | no | Same |
| V5 Input Validation | yes | Client-side bucket-name regex + 7 guard messages (UI-SPEC). Server-side validation delegated to MiniStack `_validate_bucket_name` (`ministack/services/s3.py:188`). Object keys pass through `encodeURIComponent` before transport. User metadata / tag keys are display-only; NO injection risk because they are rendered via React (auto-escaped) into `KeyValuePairs`. |
| V6 Cryptography | no | Local emulator; no real SigV4; no secret handling; no HTTPS beyond what browser enforces locally. |
| V7 Error Handling | yes | Errors surfaced via Flashbar and inline Alert; server error messages are displayed verbatim but rendered through React (safe from XSS). |
| V11 Business Logic | low | Bulk delete type-to-confirm mitigates accidental mass destruction. |
| V14 Configuration | n/a | No secrets; no external APIs. |

### Known Threat Patterns for React + browser-native file I/O

| Pattern | STRIDE | Standard Mitigation |
|---------|--------|---------------------|
| Malicious drag-drop JavaScript URL | Tampering / XSS | Only read `DataTransfer.files` (binary data) — never `DataTransfer.getData('text/uri-list')`. React treats text content as data, not markup. |
| Path traversal via object key (`../../etc/passwd`) | Tampering | Backend `_parse_bucket_key` controls key interpretation. Frontend should still reject keys containing only `..` as the full name (trivial server-side; client-side not strictly required). Type-to-confirm with full key prevents accidental wide-scope delete. |
| Renderingobject metadata values as HTML | XSS | React auto-escapes — always use `{value}` not `dangerouslySetInnerHTML`. UI-SPEC never references `dangerouslySetInnerHTML`. |
| Storing user-uploaded HTML and serving as `text/html` from the emulator | XSS if inline preview shown | Phase 3 has NO inline preview (deferred to Phase 5). Download only. Mitigated by scope. |
| Downloading a file with a weaponized filename (e.g., `../../win.exe`) | Tampering | `a.download` attribute in browser strips `/` and `..` — browsers treat `download` as a hint, and OS save dialog sanitizes. Still, basename via `key.split('/').pop()` provides a clean default. |
| Blob URL leak revealing content to subsequent navigations | Information Disclosure | `URL.revokeObjectURL` after 60s (UI-SPEC line 539) bounds exposure. Blob URLs are origin-scoped and expire on tab close. |
| Resource exhaustion (user uploads 10,000 files) | DoS (self-inflicted) | Concurrency cap of 3, queue processes sequentially. User can Cancel Flashbar items. |
| CSRF on mutations | Tampering | Same-origin policy; app is same-origin with API (:4566). No third-party origin issues. Per Phase 1, `credentials: 'same-origin'` default. |

**Key security insight:** Because MiniStack is a local dev tool with no auth and no multi-tenant concept, most ASVS categories do not apply. The one category that does (V5 Input Validation) is handled by a regex and inline Alert messages already specified in UI-SPEC.

## Sources

### Primary (HIGH confidence)

- `.planning/phases/03-s3-lambda-services/03-CONTEXT.md` — 15 locked decisions verbatim
- `.planning/phases/03-s3-lambda-services/03-UI-SPEC.md` — 1,029-line design contract, 6/6 dimensions PASS
- `.planning/REQUIREMENTS.md` — S3-01..04 and LAM-01..03 definitions
- `.planning/ROADMAP.md` — Phase 3 scope and success criteria
- `.planning/STATE.md` — Phase 1 decisions (pinned versions, Cloudscape compat, MSW wiring, route ordering pitfall)
- `CLAUDE.md` — project-level stack lock and constraints
- `ministack/services/s3.py` — complete backend S3 handler (2,850 lines; `handle_request` line 347, `_list_objects_v2` line 2211, `_put_object` line 1339, `_get_object` line 1410, `_head_object` line 1455, `_delete_object` line 1471, `_delete_objects` line 2292, `_get_object_tagging` line 1664, `_list_buckets` line 557, `_create_bucket` line 570, `_delete_bucket` line 601, `_validate_bucket_name` line 188, vhost rewrite in `ministack/app.py` line 489-500)
- `web/src/services/ec2/api/ec2Client.ts` — reference pattern for building `s3Client.ts`
- `web/src/shared/api/xml.ts` — DOMParser helpers reused verbatim
- `web/src/shared/api/client.ts` — ky instance reused verbatim
- `web/src/services/ec2/components/ResourceTable.tsx`, `DeleteModal.tsx` — components to evaluate for reuse
- `web/src/app/routes.tsx` — route ordering rule (line 43 comment)
- `web/src/stores/uiStore.ts` — Zustand store pattern (extend with `s3BucketPageSize`, `s3ObjectPageSize`)

### Secondary (MEDIUM confidence)

- Browser MDN: `XMLHttpRequest.upload`, `URL.createObjectURL`, `DataTransfer.files` — standard APIs, stable across browsers [ASSUMED from training]
- Cloudscape documentation — `Table`, `SplitPanel`, `BreadcrumbGroup`, `Pagination`, `Flashbar`, `ProgressBar`, `FileUpload` component APIs [CITED: cloudscape.design, UI-SPEC Phase 1/2]
- TanStack Query 5 `invalidateQueries`, `placeholderData` APIs [CITED: tanstack.com/query/latest]

### Tertiary (LOW confidence)

- None — all claims anchor to either backend source (inspected) or UI-SPEC (locked contract). Where assumptions remain, they are tagged in the Assumptions Log and scheduled for Wave 0 smoke verification.

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH — zero new libraries; everything inherited from Phase 1/2 with pinned versions
- Architecture: HIGH — UI-SPEC provides full file inventory, route map, interaction contract, and copy catalog
- Pitfalls: MEDIUM — most pitfalls are general web-platform quirks verified against backend source; a few (A1, A3, A5) need Wave 0 smoke to lock
- Backend integration: HIGH — every endpoint the UI calls is confirmed present in `ministack/services/s3.py`
- Testing: HIGH — vitest + MSW + Playwright patterns established in Phase 1/2
- Security: HIGH — scope narrow (no auth, no preview); standard React auto-escaping covers XSS

**Research date:** 2026-04-17
**Valid until:** 2026-05-17 (30 days — stack pinned, backend stable, UI-SPEC locked)
