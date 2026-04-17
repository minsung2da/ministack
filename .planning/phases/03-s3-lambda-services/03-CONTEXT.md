# Phase 3: S3 & Lambda Services - Context

**Gathered:** 2026-04-17
**Status:** Ready for planning
**Note:** S3 부분만 우선 계획+실행. Lambda는 나중에 같은 Phase에서 재실행.

<domain>
## Phase Boundary

Deliver a fully functional S3 bucket and object management UI within the MiniStack web console. Users can list/create/delete buckets, browse objects by folder prefix, upload files via drag-and-drop, download objects, and view object metadata. Reuses Phase 2 CRUD patterns (ResourceTable, DeleteModal, SplitPanel, FlashNotifications). Lambda UI is deferred to a later execution within this same phase.

</domain>

<decisions>
## Implementation Decisions

### S3 Tab Structure
- **D-01:** Bucket-centric navigation. Service root = bucket list. Click bucket → object browser. Objects are a child route of the bucket, not a separate tab. AWS Console identical.
- **D-02:** URL pattern: `/services/s3` (bucket list), `/services/s3/{bucket-name}` (object browser with prefix query param), `/services/s3/{bucket-name}?prefix=folder/`.

### Object Browsing & Pagination
- **D-03:** Server-side pagination using ListObjectsV2 continuation-token. Previous/Next buttons per page. Page size configurable (50/100/200). AWS Console identical.
- **D-04:** Folder navigation via `delimiter='/'` + CommonPrefixes. Folder names displayed as clickable rows. Click folder → updates prefix. Breadcrumb trail shows current path.
- **D-05:** Object table columns: Name (key basename), Type (folder/file), Size, Last modified. Folders show "-" for size/date.

### Upload
- **D-06:** Drag-and-drop zone covers the entire object list area. Also a "Upload" button that opens file picker. Multiple files supported simultaneously.
- **D-07:** Progress indicator per file during upload. Uses PutObject API directly (no multipart). Flashbar success/error feedback per file.
- **D-08:** Upload target is current prefix (displayed in breadcrumb). Uploaded file key = current prefix + filename.

### Download
- **D-09:** Direct download via GetObject API → Blob → browser save dialog. Download button in header actions + click on object name in table.

### Detail View
- **D-10:** SplitPanel (Phase 2 pattern). Row click opens bottom panel with tabs: Properties (key, size, content-type, last-modified, ETag), Metadata (user metadata), Tags.

### Bucket CRUD
- **D-11:** Create bucket modal: Name field only (region is implicit in local emulator). Bucket name validation per S3 rules (3-63 chars, lowercase, no consecutive dots, etc.).
- **D-12:** Delete bucket: Type-to-confirm with bucket name. Backend rejects if not empty.

### Object Delete
- **D-13:** Type-to-confirm for single object delete. Bulk delete: type "delete" to confirm. Uses DeleteObject/DeleteObjects API.

### S3 API Protocol
- **D-14:** S3 uses REST API (not Query protocol like EC2). PUT/GET/DELETE with path-style URLs. XML responses parsed with same DOMParser pattern from Phase 2.
- **D-15:** S3 client module separate from EC2: `web/src/services/s3/api/s3Client.ts`. Uses ky with appropriate headers (no Action parameter, path-based routing).

### Claude's Discretion
- Empty bucket state design (message + create button)
- Empty object list state (message + upload button)
- Loading skeleton vs spinner choice
- Error handling patterns (retry, toast, inline alert)
- Breadcrumb overflow behavior for deep prefixes
- Upload progress UI implementation (Flashbar vs dedicated progress bar)

</decisions>

<canonical_refs>
## Canonical References

**Downstream agents MUST read these before planning or implementing.**

### Phase 2 Artifacts (CRUD patterns to reuse)
- `.planning/phases/02-ec2-dashboard-crud-patterns/02-CONTEXT.md` — Phase 2 decisions, CRUD component patterns
- `.planning/phases/01-app-shell-navigation/01-CONTEXT.md` — Phase 1 decisions, frontend-as-AWS-client pattern

### Backend Implementation
- `ministack/services/s3.py` — S3 handler (2,850 lines, 103 functions). ListBuckets, CreateBucket, DeleteBucket, ListObjectsV2, PutObject, GetObject, DeleteObject, HeadObject, CopyObject all implemented.
- `ministack/app.py` — ASGI handler, console routes, S3 path-based dispatch

### Frontend Foundation (from Phase 1/2)
- `web/src/shared/api/client.ts` — ky HTTP client
- `web/src/shared/api/xml.ts` — XML parsing utilities (parseXml, getText, getItems, getNameTag)
- `web/src/services/ec2/api/ec2Client.ts` — EC2 client pattern (reference for S3 client)
- `web/src/services/ec2/components/ResourceTable.tsx` — Reusable table with pagination, filtering, selection
- `web/src/services/ec2/components/DeleteModal.tsx` — Type-to-confirm delete
- `web/src/services/ec2/components/CreateModal.tsx` — Generic create modal
- `web/src/services/ec2/components/FlashNotifications.tsx` — Toast notifications
- `web/src/services/ec2/components/SplitPanelDetail.tsx` — Tabbed detail panel
- `web/src/contexts/SplitPanelContext.tsx` — SplitPanel context for child routes
- `web/src/app/routes.tsx` — React Router 7 routes structure
- `web/src/shared/copy.ts` — Centralized copy strings

### Design System
- Cloudscape Table — pagination, sorting, filtering
- Cloudscape SplitPanel — detail view
- Cloudscape Modal — create/delete
- Cloudscape ProgressBar — upload progress (if chosen)

</canonical_refs>

<code_context>
## Existing Code Insights

### Reusable Assets from Phase 2
- ResourceTable: Generic sortable/filterable table with PropertyFilter or TextFilter
- DeleteModal: Type-to-confirm with exact match validation
- CreateModal: Generic modal wrapper with error Alert
- FlashNotifications: Auto-dismiss success (5s), max 3 items, errors manual
- SplitPanelDetail: Tabs or key-value pairs in panel
- SplitPanelContext: Wires child routes to AppLayout splitPanel slot
- StatusBadge: Color-coded status indicator
- `applyNameTag()`: CreateTags after resource creation (may need S3 equivalent)

### Key Differences from EC2
- S3 uses REST API (path-based), not EC2 Query protocol (Action parameter)
- S3 responses are XML but with different structure (ListBucketResult, etc.)
- S3 has hierarchical browsing (prefix/delimiter) unlike EC2's flat resource lists
- Upload requires file handling (FormData or binary PUT), not just form fields
- Download requires Blob handling for browser save

### Integration Points
- `web/src/app/routes.tsx` — Add S3 routes before `:serviceKey` wildcard
- `web/src/shared/copy.ts` — Add S3 copy strings
- `ministack/console/registry.py` — S3 already registered as "Storage" category

</code_context>

<specifics>
## Specific Ideas

- AWS Console look and feel — consistent with Phase 2 direction
- Bucket list → object browser hierarchy mimics AWS Console navigation
- Drag-and-drop upload zone should be visually clear (highlight on drag-over)
- Breadcrumb navigation for prefix path must update URL query parameter
- S3 CRUD components should be in `web/src/services/s3/` (separate from EC2)

</specifics>

<deferred>
## Deferred Ideas

- **Lambda UI** — Deferred within Phase 3, will be executed later
- **Versioning UI** — Object version list/restore/delete
- **Bucket settings editing** — Encryption, lifecycle, CORS, etc. (view-only at most)
- **Multipart upload UI** — Large file chunked upload
- **Object content preview** — Inline image/text/JSON preview
- **S3 static website hosting UI** — Configure bucket as static site
- **Cross-origin resource sharing configuration** — CORS rules editor

</deferred>

---

*Phase: 03-s3-lambda-services*
*Context gathered: 2026-04-17*
