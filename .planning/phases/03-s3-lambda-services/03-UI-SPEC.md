---
phase: 3
slug: s3-lambda-services
status: draft
shadcn_initialized: false
preset: none
created: 2026-04-17
---

# Phase 3 — UI Design Contract (S3 only)

> Visual and interaction contract for the S3 portion of Phase 3. Lambda UI is deferred to a later execution within this same phase and is NOT covered by this contract.
>
> **Inheritance:** This contract inherits the design system, spacing, typography, color, accessibility, copywriting tone, and all CRUD patterns from Phase 1 (`01-UI-SPEC.md`) and Phase 2 (`02-UI-SPEC.md`). Phase 3 extends with S3-specific content patterns (prefix-based folder browsing, drag-and-drop upload, Blob download) but does not change the foundational tokens. All values come from `@cloudscape-design/design-tokens` v3 — never hardcode px or hex literals.
>
> **Scope boundary:** S3 bucket and object management only. Covers S3-01, S3-02, S3-03, S3-04 requirements. Lambda (LAM-01, LAM-02, LAM-03) is out of scope for this contract.

---

## Design System

| Property | Value |
|----------|-------|
| Tool | none (Cloudscape replaces shadcn) |
| Preset | not applicable |
| Component library | `@cloudscape-design/components` v3.x |
| Design tokens | `@cloudscape-design/design-tokens` v3.x |
| Global styles | `@cloudscape-design/global-styles` v1.x |
| Icon library | Cloudscape built-in `<Icon>` — supplement with `lucide-react` only if a needed glyph is missing |
| Font | Cloudscape default: `"Open Sans", "Helvetica Neue", Roboto, Arial, sans-serif` |
| Theme mode | Light only (dark mode is Phase 5 / DIFF-02) |
| Density | `comfortable` (Cloudscape default) |

**Source:** Inherited verbatim from Phase 1/2 UI-SPECs. No changes in Phase 3.

---

## Layout Skeleton

Phase 3 reuses the Phase 1 AppLayout shell and the Phase 2 content pattern (Header + Table + SplitPanel), but omits Tabs. S3 uses a **two-level route hierarchy** instead of tabs: bucket list → object browser.

### S3 Root Layout — Bucket List (`/services/s3`)

```
+-------------------------------------------------------------+
|  TopNavigation  [MiniStack]  [Search services]   [us-east-1] |
+---------------+---------------------------------------------+
|               |  BreadcrumbGroup: Console > S3               |
| SideNav       +---------------------------------------------+
|  Storage      |  Header: "S3"                                |
|   * S3 <-     |  Description: "Manage buckets and objects."  |
|               +---------------------------------------------+
|               |  Header: "Buckets (N)" [Refresh] [Create]    |
|               |  TextFilter: [search buckets]                |
|               +---------------------------------------------+
|               |  Table                                       |
|               |  [ ] Name             Creation date          |
|               |  [x] my-bucket        2026-04-12 10:30       |
|               |  [ ] other-bucket     2026-04-15 08:12       |
|               |  ...             Pagination: 1-10 of N        |
|               +---------------------------------------------+
|               |  SplitPanel: "my-bucket" (bottom)            |
|               |  Properties | Empty                          |
|               |  Name: my-bucket                             |
|               |  Region: us-east-1                           |
|               |  Creation date: 2026-04-12T10:30:00Z         |
+---------------+---------------------------------------------+
```

### S3 Object Browser Layout — Inside Bucket (`/services/s3/:bucketName`)

```
+-------------------------------------------------------------+
|  TopNavigation  [MiniStack]  [Search services]   [us-east-1] |
+---------------+---------------------------------------------+
|               |  BreadcrumbGroup:                            |
| SideNav       |  Console > S3 > my-bucket > photos > 2026   |
|  Storage      +---------------------------------------------+
|   * S3 <-     |  Header: "my-bucket"  [Copy ARN]             |
|               |                   [Delete bucket] [Upload]   |
|               +---------------------------------------------+
|               |  Prefix breadcrumb: photos / 2026 /          |
|               +---------------------------------------------+
|               |  Header: "Objects (N)" [Refresh] [Actions v] |
|               |  TextFilter: [search current prefix]         |
|               +---------------------------------------------+
|               |  Drag-and-drop zone (covers table area)      |
|               |  [ ] Name            Type     Size  Modified |
|               |  [ ] (..)  parent    folder   -    -         |
|               |  [ ] 2026/           folder   -    -         |
|               |  [ ] cat.jpg         image    1.2MB 2026-04  |
|               |  ...                Pagination: Prev | Next   |
|               +---------------------------------------------+
|               |  SplitPanel: "cat.jpg" (bottom)              |
|               |  Properties | Metadata | Tags                |
+---------------+---------------------------------------------+
```

### Key Layout Rules

| Region | Behavior | Source |
|--------|----------|--------|
| Service route | `/services/s3` shows bucket list; `/services/s3/:bucketName` shows object browser | CONTEXT.md D-01, D-02 |
| Prefix state | Current folder prefix stored in URL query param `?prefix=path/` | CONTEXT.md D-02 |
| Prefix breadcrumb | Cloudscape `BreadcrumbGroup` above the objects table, reflecting `prefix` segments | CONTEXT.md D-04 |
| Top app breadcrumb | Also updates: `Console > S3 > {bucket} > {prefix1} > {prefix2}` | CONTEXT.md D-04, inherited from Phase 1 |
| Drag-and-drop zone | Wraps the object table container; entire rectangle is a drop target | CONTEXT.md D-06 |
| Upload button | Cloudscape `Button` in Header actions, opens native file picker (accepts multiple) | CONTEXT.md D-06 |
| SplitPanel | Same as Phase 2 — bottom position, opens on row click | CONTEXT.md D-10 |
| No Tabs | S3 uses bucket-centric navigation, not a flat tab list. This is an intentional divergence from Phase 2's EC2 Tabs. | CONTEXT.md D-01 |

---

## Cloudscape Component Inventory (Phase 3 S3)

Components used in Phase 3 (S3). All are already approved in Phase 1/2 UI-SPECs; this phase adds no new Cloudscape components.

| Component | Purpose | Surface |
|-----------|---------|---------|
| `Table` | Bucket list, object list | Both S3 routes |
| `Pagination` | Client-side (buckets), server-side Prev/Next (objects) | Table footer |
| `CollectionPreferences` | Page size selector for objects (50/100/200), buckets (10/25/50) | Table header utility |
| `TextFilter` | Simple name-contains search | Above both tables |
| `SplitPanel` | Detail view panel (bottom position) | AppLayout `splitPanel` slot |
| `Tabs` | Object detail sections (Properties / Metadata / Tags) | Inside SplitPanel only — NOT for top-level navigation |
| `KeyValuePairs` | Property display in detail panels | SplitPanel content |
| `ColumnLayout` | Multi-column property layout | SplitPanel content |
| `Modal` | Create bucket / delete bucket / delete object(s) confirmations | Triggered from Header actions |
| `Form` | Form wrapper inside Modal | Create bucket |
| `FormField` | Labeled input wrapper | Bucket name, confirm inputs |
| `Input` | Text input | Bucket name, type-to-confirm |
| `Button` | Primary/normal/icon-only actions | Create, Upload, Download, Delete, Refresh |
| `ButtonDropdown` | Grouped actions menu | Object actions (Download, Delete), bulk actions |
| `SpaceBetween` | Vertical/horizontal spacing utility | Form layouts, button groups |
| `StatusIndicator` | Color-coded status display | Upload progress (success/error/loading), bucket "empty" pill if applicable |
| `Flashbar` | Toast notifications for action results | Top of content area |
| `ProgressBar` | Per-file upload progress | Inside Flashbar items OR a dedicated upload panel (see Upload contract) |
| `Box` | Layout primitive for empty states, drop-zone styling | Empty bucket list, empty object list |
| `Alert` | Inline warnings/errors | Form validation, bucket-name validation, API errors |
| `CopyToClipboard` | Copy bucket name, object key, ARN | Header actions, detail panel |
| `Link` | Inline navigation | Click bucket name → object browser; prefix breadcrumb items |
| `FileUpload` | Optional: Cloudscape's built-in file picker component (see Upload contract — prefer this over a raw `<input type="file">` for visual consistency) | Create/upload flows |
| `BreadcrumbGroup` | Prefix breadcrumb (second bar, inside content area) | Above objects table |

**No new external npm dependencies.** Phase 3 S3 uses only components already in the project via `@cloudscape-design/components` and `@cloudscape-design/collection-hooks` (added in Phase 2).

---

## Spacing Scale

Inherited verbatim from Phase 1/2. All values consumed via `@cloudscape-design/design-tokens`, never hardcoded.

| Token (CSS var) | JS export | Value | Phase 3 usage |
|-----------------|-----------|-------|---------------|
| `--awsui-space-scaled-xxs` | `spaceScaledXxs` | 4px | Icon gaps in table cells (folder icon + name), badge padding |
| `--awsui-space-scaled-xs` | `spaceScaledXs` | 8px | Compact spacing between prefix breadcrumb segments, object-row action icons |
| `--awsui-space-scaled-s` | `spaceScaledS` | 12px | Form field gaps inside Create Bucket modal |
| `--awsui-space-scaled-m` | `spaceScaledM` | 16px | Default content padding, SplitPanel internal padding, drop-zone padding |
| `--awsui-space-scaled-l` | `spaceScaledL` | 20px | Header-to-table gap, ProgressBar internal padding |
| `--awsui-space-scaled-xl` | `spaceScaledXl` | 24px | Section gaps between drop-zone and SplitPanel |
| `--awsui-space-scaled-xxl` | `spaceScaledXxl` | 32px | Major section breaks |
| `--awsui-space-scaled-xxxl` | `spaceScaledXxxl` | 40px | Page-level vertical rhythm |

**Layout tokens (Phase 3 S3-specific, all multiples of 4):**

| Token | Value | Usage |
|-------|-------|-------|
| Drop-zone min height | 320px | Minimum drop area height when object list is short/empty (keeps drop target usable) |
| Drop-zone border width | 2px | Dashed border when drag-over is active (uses `--awsui-color-border-status-info`) |
| Modal width (small) | 480px | Delete bucket confirmation |
| Modal width (medium) | 600px | Create bucket form, delete object(s) confirmation |
| SplitPanel default height | 280px | Same as Phase 2 |
| Upload Flashbar item max width | 560px | Keep per-file progress rows readable |

**Spacing exceptions:** Same as Phase 1/2 — Cloudscape token values 12px, 20px, and 40px are approved upstream because they are official Cloudscape design tokens and align to the 4px grid. No new non-standard values introduced in Phase 3.

---

## Typography

Inherited verbatim from Phase 1/2. Four roles, two weights (400 regular, 700 bold).

| Role | Token | Size | Weight | Line height | Phase 3 usage |
|------|-------|------|--------|-------------|---------------|
| Body | `--awsui-font-size-body-m` | 14px | 400 | 22px (1.57) | Table cells (bucket name, object key, size, date), detail panel values |
| Label | `--awsui-font-size-body-s` | 12px | 700 | 16px (1.33) | Table column headers, form field labels (bucket name, confirm text), prefix breadcrumb labels, SplitPanel tab labels |
| Heading | `--awsui-font-size-heading-m` | 18px | 700 | 22px (1.22) | Table header ("Buckets (N)", "Objects (N)"), SplitPanel header (bucket name / object key), drop-zone guidance heading |
| Display | `--awsui-font-size-heading-xl` | 24px | 700 | 30px (1.25) | S3 service page header (`<Header variant="h1">`) at bucket list route |

**Forbidden in Phase 3:** Same as Phase 1/2 — no additional sizes, no additional weights, no custom font families, no `font-size` literals in components.

---

## Color

Inherited verbatim from Phase 1/2. Same 60/30/10 split with Cloudscape tokens.

| Role | Cloudscape token | Value (light theme) | Phase 3 usage |
|------|------------------|---------------------|---------------|
| Dominant (60%) | `--awsui-color-background-layout-main` | `#f2f3f3` | Main content background behind tables, idle drop-zone background |
| Secondary (30%) | `--awsui-color-background-container-content` | `#ffffff` | Table surface, SplitPanel surface, Modal surface |
| Accent (10%) | `--awsui-color-text-accent` | `#0972d3` | See accent list below |
| Destructive | `--awsui-color-text-status-error` | `#d91515` | Delete bucket, delete object buttons + delete confirmation modals |
| Info (drag-over) | `--awsui-color-border-status-info` | `#0972d3` | Dashed border around drop-zone when files are dragged over |
| Success | `--awsui-color-text-status-success` | `#037f0c` | Upload success Flashbar items, successful upload ProgressBar |
| Error | `--awsui-color-text-status-error` | `#d91515` | Upload failure Flashbar items, failed upload ProgressBar |

**Accent reserved for (Phase 3 additions to Phase 1/2 list):**

1. (Phase 1) Active sidebar link, hyperlinks, brand wordmark, focus rings, search highlight
2. (Phase 2) Primary action buttons, selected table row checkbox, active tab indicator, PropertyFilter tokens, Wizard active step
3. **(Phase 3 new)** Clickable folder rows in object table — folder name renders as Cloudscape `<Link>` to indicate navigation affordance
4. **(Phase 3 new)** Clickable bucket names in bucket-list table — bucket name renders as Cloudscape `<Link>` to open object browser
5. **(Phase 3 new)** Prefix breadcrumb items — each segment is a Cloudscape `<Link>` (except the last/current segment, which is plain text per Cloudscape BreadcrumbGroup default)
6. **(Phase 3 new)** "Upload" primary button in Header (object browser)
7. **(Phase 3 new)** "Create bucket" primary button in Header (bucket list)
8. **(Phase 3 new)** Drop-zone border color during drag-over state (uses `--awsui-color-border-status-info`, which resolves to the same AWS-blue accent)

**Accent is NOT used for:**
- File-type rows (plain text, not links — clicking opens SplitPanel, not a navigation)
- Download/delete icon buttons (use default `--awsui-color-text-interactive-default`)
- Object size and timestamp columns
- Drop-zone idle state background (dominant color only)
- Folder icons themselves (use `--awsui-color-text-body-default`)

### Bucket Status Color Map (minimal — S3 has few states)

S3 buckets in the local emulator do not have the same rich state machine as EC2. Where state-like attributes exist, use Cloudscape `StatusIndicator`:

| Context | StatusIndicator type | Meaning |
|---------|---------------------|---------|
| Upload in progress | `in-progress` | ProgressBar below, Flashbar item shows spinner |
| Upload succeeded | `success` | Flashbar success message |
| Upload failed | `error` | Flashbar error message, manual dismiss |
| Bucket empty (optional badge) | `info` | Optional small badge on bucket detail panel — "Empty bucket" |

**Forbidden in Phase 3:** Same as Phase 1/2 — no hex literals, no Tailwind, no custom CSS color values.

---

## Bucket List Contract (S3-01)

### Route

`/services/s3` — bucket list. This is the S3 service home page.

### Table Columns

| Column | Field path | Sortable | Width | Notes |
|--------|-----------|----------|-------|-------|
| Name | `Name` (from `ListAllMyBucketsResult > Buckets > Bucket > Name`) | Yes | 240px min | Renders as Cloudscape `<Link>` → navigates to `/services/s3/{name}` |
| Creation date | `CreationDate` | Yes | 200px | ISO timestamp; Phase 5 will upgrade to relative time, Phase 3 shows absolute ISO |
| Region | implicit `us-east-1` | No | 120px | Static value (single-region local emulator, matches Phase 1 region label) |

### Pagination

| Property | Value |
|----------|-------|
| Type | Client-side (all buckets fetched, paginated in browser) |
| Page sizes | 10, 25, 50 |
| Default page size | 10 |
| Persistence | Page size preference stored in Zustand under `ministack:console:s3:bucketPageSize` |

### Filtering

| Property | Value |
|----------|-------|
| Component | Cloudscape `TextFilter` (NOT PropertyFilter — buckets have only 2 real fields) |
| Placeholder | `Find buckets` |
| Match scope | Case-insensitive substring match on `Name` column only |

### Selection

| Property | Value |
|----------|-------|
| Type | Multi-select (Cloudscape `selectionType="multi"`) |
| Bulk actions | "Delete buckets" (requires type-to-confirm "delete" — see Delete Bucket Contract) |
| Single click | Opens SplitPanel with bucket details |
| Bucket-name link click | Does NOT toggle selection — navigates to object browser |

### Header Actions (bucket list)

| Button | Variant | Availability | Action |
|--------|---------|--------------|--------|
| Create bucket | `primary` | Always enabled | Opens Create Bucket modal |
| Delete (in ButtonDropdown) | normal | Enabled only when 1+ buckets selected | Opens bulk-delete modal |
| Refresh | icon-only (`iconName="refresh"`) | Always enabled | Invalidates TanStack Query |

### Create Bucket Modal (D-11)

| Field | Type | Required | Validation |
|-------|------|----------|------------|
| Bucket name | Input | Yes | 3-63 chars, lowercase letters/digits/hyphens, no consecutive dots, no leading/trailing hyphen, must not look like IP address, must be globally unique (delegated to server — UI surfaces the error inline) |

Additional validation rules surfaced inline via `FormField.errorText`:
- Too short: "Bucket name must be at least 3 characters."
- Too long: "Bucket name must be 63 characters or fewer."
- Invalid characters: "Bucket name can only contain lowercase letters, numbers, and hyphens."
- Starts or ends with hyphen: "Bucket name cannot start or end with a hyphen."
- Consecutive dots: "Bucket name cannot contain consecutive dots."
- Looks like IP: "Bucket name cannot be formatted as an IP address."
- Uppercase letters: "Bucket name cannot contain uppercase letters."

**Modal copy:**

```
Header:   Create bucket
Body:     (form)
FormField label: Bucket name
FormField help:  3-63 characters, lowercase letters, numbers, and hyphens only.
CTA:      Create bucket (variant="primary")
Dismiss:  Cancel (variant="link")
```

**Modal behavior:**
- On success: Modal closes, Flashbar success (`Bucket {name} created successfully.`), table refreshes, new bucket appears
- On server error: Modal stays open, `<Alert type="error">` above form with server message
- Validation runs on blur and on submit — submit button disabled while invalid
- Modal width: 600px

### Delete Bucket Contract (D-12)

Bucket deletion is **type-to-confirm with the bucket name** (stricter than the word "delete"). S3 backend rejects non-empty buckets — the UI surfaces that error inline without a client-side empty check.

| Property | Value |
|----------|-------|
| Trigger | "Delete" in bucket-detail SplitPanel actions OR "Delete bucket" in object-browser header OR bulk-delete ButtonDropdown |
| Confirm mechanism | User types the exact bucket name |
| Delete button | `variant="primary"` disabled until input matches bucket name exactly |
| Modal width | 480px |

**Single bucket delete modal copy:**

```
Header:   Delete bucket
Body:     Are you sure you want to delete bucket {bucketName}?
          The bucket must be empty before it can be deleted. This action cannot be undone.
Input:    To confirm deletion, type "{bucketName}"
CTA:      Delete (primary, destructive styling)
Dismiss:  Cancel
```

**Bulk delete modal copy (multiple buckets selected):**

```
Header:   Delete {count} buckets
Body:     Are you sure you want to delete these {count} buckets?
          Each bucket must be empty before it can be deleted. This action cannot be undone.
Input:    To confirm deletion, type "delete"
CTA:      Delete (primary)
Dismiss:  Cancel
```

**Server-error handling:** If the emulator rejects deletion because the bucket is not empty, surface the error as a Flashbar `type="error"`:

```
Cannot delete bucket {bucketName}: bucket is not empty. Delete all objects first.
```

The modal closes on this error; the user can re-open the object browser to empty the bucket.

---

## Object Browser Contract (S3-02, S3-03, S3-04)

### Route

`/services/s3/:bucketName?prefix=folder/subfolder/`

- `bucketName` is a URL path param
- `prefix` is a URL query param. Missing or empty = root of the bucket
- Trailing slash on `prefix` is required to indicate "folder" semantics (matches S3 `delimiter='/'` convention)

### Prefix Breadcrumb (D-04)

A **second Cloudscape `BreadcrumbGroup`** renders inside the content area, directly below the page Header and above the table. This is distinct from the top app breadcrumb (which also reflects the path).

| Segment | Behavior |
|---------|----------|
| Root (bucket name) | Links to `/services/s3/{bucket}` (no prefix) |
| Each folder segment | Links to `/services/s3/{bucket}?prefix={accumulatedPath}/` |
| Current segment | Non-clickable (Cloudscape BreadcrumbGroup default — styled as current item) |

**Breadcrumb overflow behavior (Claude's discretion — resolved):**
- Cloudscape `BreadcrumbGroup` handles overflow by collapsing middle segments into `...` with a dropdown
- For prefixes deeper than 5 segments, the first segment, last 2 segments, and `...` dropdown remain visible
- Rely on Cloudscape default — do not implement custom truncation

### Object Table Columns (D-05)

| Column | Field path | Sortable | Width | Notes |
|--------|-----------|----------|-------|-------|
| Name | basename of `Key` (or `Prefix` name for folders) | Yes | 280px min | Folders render with `<Icon name="folder" />` prefix as `<Link>`; files render with file-type icon as plain text |
| Type | `"folder"` or MIME-based label (`image`, `text`, `video`, `audio`, `archive`, `file`) | Yes | 100px | Folders sort before files by default |
| Size | `Size` bytes → formatted (`1.2 MB`, `340 KB`) | Yes | 100px | Folders display `-` |
| Last modified | `LastModified` ISO | Yes | 180px | Folders display `-` |

**Parent directory row:** When inside a non-root prefix, the first row of the table is a synthetic `(..)` parent row (name: `..`, type: `folder`). Clicking it navigates up one prefix level. This row is never part of selection (no checkbox), cannot be deleted, and is ignored by PropertyFilter/TextFilter.

### Folder Navigation (D-04)

| Interaction | Result |
|-------------|--------|
| Click folder name link | Updates `prefix` query param, refetches objects at new prefix |
| Click `..` parent row | Removes one segment from `prefix`; if at root, no-op |
| Click prefix breadcrumb segment | Navigates to that segment's prefix |
| Browser back/forward | Restores the previous prefix state (React Router manages URL) |

### Pagination (D-03)

Server-side pagination using ListObjectsV2 `continuation-token`.

| Property | Value |
|----------|-------|
| Component | Cloudscape `Pagination` with custom props for Prev/Next only (hide numbered pages) |
| Page sizes | 50, 100, 200 |
| Default page size | 50 |
| Persistence | Stored in Zustand under `ministack:console:s3:objectPageSize` |
| Token strategy | UI maintains a stack of continuation tokens per direction — push on Next, pop on Prev. Reset the stack when prefix changes. |
| Token display | Not shown to user — URL contains only `prefix` and `pageSize`, not continuation tokens (tokens are ephemeral session state) |
| Last page | Next button disabled when `IsTruncated=false` |
| First page | Previous button disabled when token stack is empty |

### Filtering

| Property | Value |
|----------|-------|
| Component | Cloudscape `TextFilter` |
| Placeholder | `Find objects by name` |
| Match scope | Client-side substring match on object basename within the **current page only** (does not cross-prefix-search the bucket — that would require server-side Search API which S3 lacks) |

### Selection

| Property | Value |
|----------|-------|
| Type | Multi-select (Cloudscape `selectionType="multi"`) |
| Bulk actions | Download (ButtonDropdown), Delete (type-to-confirm "delete") |
| Single click | Opens SplitPanel with object detail |
| Folder click | Navigates — does NOT open SplitPanel, does NOT toggle selection |
| Selectable scope | Files only; folders and the `..` parent row are not selectable |

### Header Actions (object browser)

| Button | Variant | Availability | Action |
|--------|---------|--------------|--------|
| Upload | `primary` | Always enabled | Opens native file picker (multiple) — uploaded to current prefix |
| Actions (ButtonDropdown) | normal | Contains: Download (enabled when 1+ files selected), Delete (enabled when 1+ files selected) | Bulk actions |
| Copy bucket name | icon-only (`iconName="copy"`) | Always enabled | Copies `bucketName` via Cloudscape `CopyToClipboard` |
| Delete bucket | normal | Enabled when bucket is empty AND no files selected | Opens type-to-confirm modal from Delete Bucket Contract |
| Refresh | icon-only (`iconName="refresh"`) | Always enabled | Invalidates the objects query at current prefix |

---

## Upload Contract (S3-03, D-06, D-07, D-08)

### Entry Points

| Trigger | Behavior |
|---------|----------|
| Drag files onto drop-zone | Drop-zone border becomes dashed `info` blue, "Drop to upload" overlay appears over table area |
| Release files on drop-zone | Uploads begin immediately, one request per file |
| Click "Upload" button | Native file picker opens with `multiple` attribute enabled |
| Select files in picker | Uploads begin on dialog confirmation |

### Drop-Zone Visuals

| State | Visual |
|-------|--------|
| Idle | Table renders normally; drop-zone container is transparent |
| Drag-over | Container gains 2px dashed border in `--awsui-color-border-status-info`; semi-transparent overlay with centered text `Drop files to upload to {currentPrefix}/` (or `Drop files to upload to bucket root` when prefix is empty) |
| Dragging over a forbidden target (e.g., folder row) | Visually identical to drag-over — the upload always targets the current prefix regardless of where the file is dropped within the zone (CONTEXT.md D-08) |

### Upload Key Computation (D-08)

| Input | Resulting S3 key |
|-------|------------------|
| Current prefix = empty, file = `photo.jpg` | `photo.jpg` |
| Current prefix = `photos/`, file = `cat.jpg` | `photos/cat.jpg` |
| Current prefix = `docs/2026/`, file = `report.pdf` | `docs/2026/report.pdf` |
| File contains a path (`folder/file.txt` — shouldn't happen via picker but drag-and-drop may provide `webkitRelativePath`) | Upload as literal filename only (basename) — do NOT preserve subpaths (Claude's discretion — resolved: keeps the upload predictable and matches AWS Console default) |

### Upload Mechanism (D-07)

- Direct `PutObject` per file — no multipart (CONTEXT.md D-07)
- Parallel uploads: maximum 3 concurrent (hardcoded in client). Additional files queue.
- Request body: file's raw Blob
- Content-Type: browser-detected via `File.type`, fallback to `application/octet-stream` if empty

### Progress UI (Claude's discretion — resolved)

**Implementation choice: Flashbar items with embedded ProgressBar.** This reuses Phase 2's Flashbar pattern and avoids a new floating panel component.

For each file uploaded, render one Flashbar item with the following structure over its lifecycle:

| State | Flashbar type | Header | Content | Dismiss |
|-------|---------------|--------|---------|---------|
| Queued | `in-progress` | `Queued: {filename}` | "Waiting to start" | Not dismissible until complete |
| In progress | `in-progress` | `Uploading: {filename}` | Cloudscape `ProgressBar` (0-100%), shows `{percent}% — {formattedBytesUploaded} of {formattedTotalSize}` | Cancel button replaces dismiss (aborts XHR) |
| Succeeded | `success` | `Uploaded: {filename}` | `Uploaded to s3://{bucket}/{key}` | Auto-dismiss after 5 seconds |
| Failed | `error` | `Upload failed: {filename}` | Error message + `Retry` link | Manual dismiss only |
| Cancelled | `warning` | `Upload cancelled: {filename}` | "Upload was cancelled before completion" | Manual dismiss only |

**Flashbar rules (inherited from Phase 2):**
- Maximum 3 visible Flashbar items at once; oldest non-error dismissed first to make room
- Per-file Flashbar items stack vertically, newest on top
- A file being uploaded mid-queue and the header "Upload" button can continue adding more — they append to the queue

**Progress tracking:** Use `XMLHttpRequest.upload.onprogress` (ky does not yet expose fetch upload progress reliably in all browsers — use a dedicated XHR wrapper for uploads, documented in the backend client module). The XHR wrapper is a local helper, not a new npm dependency.

### Upload Completion Behavior

After all files in a batch finish (success or failure):
- If at least one succeeded, invalidate the objects query at the current prefix (table refreshes)
- If all failed, do NOT refetch — the table state is unchanged, and the user sees the errors in Flashbar
- Upload order in the table is whatever the server returns (S3 sorts lexicographically by Key by default)

---

## Download Contract (D-09)

### Entry Points

| Trigger | Behavior |
|---------|----------|
| Click object name link in table | Opens SplitPanel (navigation-equivalent) — does NOT download |
| Click "Download" button in SplitPanel header | Downloads the object |
| Click "Download" in row-level ButtonDropdown | Downloads the object |
| Click "Download" in bulk-actions ButtonDropdown (1+ selected files) | Downloads each selected object sequentially |

**Design note:** Clicking the object name navigates to the detail panel, not a direct download. This matches AWS Console behavior and matches CONTEXT.md D-09 which specifies Download as an explicit action button, not a default row-click.

### Download Mechanism

1. UI issues `GetObject` via ky to `/<bucket>/<key>`
2. Response body streamed to a `Blob`
3. `URL.createObjectURL(blob)` generates a temporary object URL
4. An anchor element is created programmatically with `download="{basename}"` and clicked
5. `URL.revokeObjectURL(url)` cleans up after 60 seconds

**Download-in-progress UI:**
- Single-object download: Button shows Cloudscape `loading={true}` spinner; button label stays "Download"
- Bulk download: Flashbar `in-progress` item per file (reusing the upload-progress component), sequential
- Error: Flashbar `type="error"` with message `Failed to download {key}: {serverMessage}`
- Cancel: Not supported in Phase 3 (single requests are usually small; cancellation can be Phase 5 polish)

### Large-file Guardrails

- No chunked download in Phase 3 — relies on browser streaming
- No warning prompt for large files (Phase 5 can add a guard if needed)

---

## Object Detail SplitPanel Contract (S3-04, D-10)

### Layout

Same SplitPanel mechanism as Phase 2:

| Property | Value |
|----------|-------|
| Position | Bottom |
| Trigger | Click on any file row (folder rows do not open SplitPanel) |
| Close | SplitPanel close button or Escape key |
| Header | Object basename (full path shown in Properties tab) |
| Resize | Draggable, min 160px, max 50% viewport |

### Tabs (D-10)

| Tab | Content |
|-----|---------|
| Properties | Full key (copyable), size (bytes + human-readable), content-type, last-modified (ISO + relative in Phase 5), ETag, storage class, version ID (if versioning enabled — N/A in local emulator MVP) |
| Metadata | User metadata key-value pairs from `x-amz-meta-*` response headers. Empty state: `No user metadata set for this object.` |
| Tags | Tag-set from `GetObjectTagging` API. Empty state: `No tags on this object.` |

### SplitPanel Header Actions

| Button | Variant | Action |
|--------|---------|--------|
| Download | `primary` | Triggers download |
| Copy key | normal (icon + label) | Copies full object key to clipboard |
| Copy S3 URI | normal (icon + label) | Copies `s3://{bucket}/{key}` to clipboard |
| Delete | normal, `iconName="remove"` | Opens type-to-confirm delete modal |

---

## Object Delete Contract (D-13)

Type-to-confirm for single and bulk object deletes.

### Single Object Delete

Uses `DeleteObject` API.

| Property | Value |
|----------|-------|
| Trigger | "Delete" in SplitPanel header OR row-level ButtonDropdown |
| Confirm mechanism | User types the exact object key (full key, not basename) |
| Modal width | 600px |

**Single delete modal copy:**

```
Header:   Delete object
Body:     Are you sure you want to delete {fullObjectKey}?
          This action cannot be undone.
Input:    To confirm deletion, type "{fullObjectKey}"
CTA:      Delete (primary, destructive styling)
Dismiss:  Cancel
```

### Bulk Object Delete

Uses `DeleteObjects` API (up to 1000 objects per request — backend accepts batching if needed).

| Property | Value |
|----------|-------|
| Trigger | "Delete" in bulk-actions ButtonDropdown (2+ files selected) or header when 1+ selected |
| Confirm mechanism | User types the word `delete` (not the keys, which would be unworkable for many files) |
| Modal width | 600px |

**Bulk delete modal copy:**

```
Header:   Delete {count} objects
Body:     Are you sure you want to delete these {count} objects? This action cannot be undone.
Input:    To confirm deletion, type "delete"
CTA:      Delete (primary)
Dismiss:  Cancel
```

### Delete Completion Behavior

- On success: Flashbar `type="success"` per object (if count ≤ 3) OR a single summary Flashbar when count > 3: `{count} objects deleted successfully.`
- On partial failure (DeleteObjects returns `Errors` array): Flashbar `type="error"` per failed key with server message; successful deletes still refresh the table
- Query invalidation: Invalidate objects query at current prefix after any delete (success or partial failure)

---

## Flashbar Notification Contract

Inherits Phase 2's rules. Phase 3 S3 additions:

| Action type | Flashbar type | Message pattern | Auto-dismiss |
|-------------|---------------|-----------------|--------------|
| Create bucket success | `success` | `Bucket {bucketName} created successfully.` | 5 seconds |
| Delete bucket success | `success` | `Bucket {bucketName} deleted successfully.` | 5 seconds |
| Bulk delete buckets success | `success` | `{count} buckets deleted successfully.` | 5 seconds |
| Delete bucket failure (not empty) | `error` | `Cannot delete bucket {bucketName}: bucket is not empty. Delete all objects first.` | Manual |
| Upload queued | `in-progress` | `Queued: {filename}` | Not dismissible until complete |
| Upload in progress | `in-progress` | `Uploading: {filename}` (with `ProgressBar`) | Cancel button available |
| Upload success | `success` | `Uploaded: {filename}` (body: `Uploaded to s3://{bucket}/{key}`) | 5 seconds |
| Upload failure | `error` | `Upload failed: {filename}: {errorMessage}` | Manual |
| Upload cancelled | `warning` | `Upload cancelled: {filename}` | Manual |
| Download in progress | `in-progress` | `Downloading: {filename}` | Not dismissible until complete |
| Download success | `success` | `Downloaded: {filename}` | 5 seconds |
| Download failure | `error` | `Failed to download {key}: {errorMessage}` | Manual |
| Delete object success | `success` | `Object {objectKey} deleted successfully.` | 5 seconds |
| Bulk delete objects success | `success` | `{count} objects deleted successfully.` | 5 seconds |
| Delete object failure | `error` | `Failed to delete {objectKey}: {errorMessage}` | Manual |
| Partial bulk delete failure | `error` | `Failed to delete {failedCount} of {totalCount} objects. See errors below.` | Manual |

---

## Copywriting Contract

All user-facing copy is English only. Copy is centralized in `web/src/shared/copy.ts` — extend the existing file with Phase 3 S3 entries.

### Page-Level Copy

| Element | Copy |
|---------|------|
| S3 service heading (`<Header variant="h1">` on `/services/s3`) | `S3` |
| S3 service description | `Manage buckets and objects.` |
| Object browser heading (`<Header variant="h1">`) | `{bucketName}` |
| Object browser description | (none — the prefix breadcrumb below provides context) |

### Bucket List Copy

| Element | Copy |
|---------|------|
| Table header format | `Buckets ({count})` |
| Filter placeholder | `Find buckets` |
| Empty state heading | `No buckets` |
| Empty state body | `You have no S3 buckets. Create a bucket to store objects.` |
| Empty state CTA | `Create bucket` |
| No-match-filter heading | `No matches` |
| No-match-filter body | `No buckets match the filter.` |
| No-match-filter CTA | `Clear filter` |
| Load error heading | `Could not load buckets` |
| Load error body | `MiniStack returned an error while fetching buckets. Check that the S3 service is enabled and try again.` |
| Load error retry | `Retry` |

### Create Bucket Modal Copy

| Element | Copy |
|---------|------|
| Modal header | `Create bucket` |
| Name field label | `Bucket name` |
| Name field help text | `3-63 characters, lowercase letters, numbers, and hyphens only.` |
| Name field placeholder | `my-bucket-name` |
| Submit CTA | `Create bucket` |
| Dismiss | `Cancel` |
| Validation: too short | `Bucket name must be at least 3 characters.` |
| Validation: too long | `Bucket name must be 63 characters or fewer.` |
| Validation: invalid chars | `Bucket name can only contain lowercase letters, numbers, and hyphens.` |
| Validation: hyphen edges | `Bucket name cannot start or end with a hyphen.` |
| Validation: consecutive dots | `Bucket name cannot contain consecutive dots.` |
| Validation: IP-shaped | `Bucket name cannot be formatted as an IP address.` |
| Validation: uppercase | `Bucket name cannot contain uppercase letters.` |
| Create success (Flashbar) | `Bucket {bucketName} created successfully.` |

### Delete Bucket Copy

| Element | Copy |
|---------|------|
| Single delete header | `Delete bucket` |
| Single delete body | `Are you sure you want to delete bucket {bucketName}? The bucket must be empty before it can be deleted. This action cannot be undone.` |
| Single delete confirm prompt | `To confirm deletion, type "{bucketName}"` |
| Single delete CTA | `Delete` |
| Single delete dismiss | `Cancel` |
| Bulk delete header | `Delete {count} buckets` |
| Bulk delete body | `Are you sure you want to delete these {count} buckets? Each bucket must be empty before it can be deleted. This action cannot be undone.` |
| Bulk delete confirm prompt | `To confirm deletion, type "delete"` |
| Bulk delete CTA | `Delete` |
| Single delete success | `Bucket {bucketName} deleted successfully.` |
| Bulk delete success | `{count} buckets deleted successfully.` |
| Delete failure (not empty) | `Cannot delete bucket {bucketName}: bucket is not empty. Delete all objects first.` |

### Object Browser Copy

| Element | Copy |
|---------|------|
| Table header format | `Objects ({count})` |
| Filter placeholder | `Find objects by name` |
| Parent row name | `..` |
| Empty-bucket state heading | `Empty bucket` |
| Empty-bucket state body | `Drag files here to upload, or use the Upload button above.` |
| Empty-bucket state CTA | `Upload` |
| Empty-prefix state heading | `No objects in this folder` |
| Empty-prefix state body | `This folder has no objects. Drag files here or upload to a different prefix.` |
| No-match-filter heading | `No matches` |
| No-match-filter body | `No objects on this page match the filter.` |
| No-match-filter CTA | `Clear filter` |
| Load error heading | `Could not load objects` |
| Load error body | `MiniStack returned an error while fetching objects from {bucketName}. Check that the S3 service is enabled and try again.` |
| Load error retry | `Retry` |
| Drop-zone drag-over overlay (root) | `Drop files to upload to bucket root` |
| Drop-zone drag-over overlay (with prefix) | `Drop files to upload to {currentPrefix}` |

### Upload Copy

| Element | Copy |
|---------|------|
| Upload button | `Upload` |
| Upload file picker dialog title | (browser default — not customized) |
| Queued header | `Queued: {filename}` |
| Queued body | `Waiting to start` |
| In-progress header | `Uploading: {filename}` |
| In-progress body format | `{percent}% — {uploadedBytes} of {totalBytes}` |
| Success header | `Uploaded: {filename}` |
| Success body | `Uploaded to s3://{bucketName}/{fullKey}` |
| Failure header | `Upload failed: {filename}` |
| Failure body | `{errorMessage}` |
| Failure retry link | `Retry` |
| Cancelled header | `Upload cancelled: {filename}` |
| Cancelled body | `Upload was cancelled before completion.` |
| Cancel button (in-progress Flashbar) | `Cancel` |

### Download Copy

| Element | Copy |
|---------|------|
| Download button (SplitPanel, row, bulk) | `Download` |
| Download in-progress header | `Downloading: {filename}` |
| Download success header | `Downloaded: {filename}` |
| Download failure header | `Could not download object` |
| Download failure body | `Failed to download {objectKey}: {errorMessage}` |

### Object Detail Copy

| Element | Copy |
|---------|------|
| SplitPanel default tab | `Properties` |
| Tab: Properties label | `Properties` |
| Tab: Metadata label | `Metadata` |
| Tab: Tags label | `Tags` |
| Metadata empty state | `No user metadata set for this object.` |
| Tags empty state | `No tags on this object.` |
| Property: Full key label | `Key` |
| Property: Size label | `Size` |
| Property: Content type label | `Content type` |
| Property: Last modified label | `Last modified` |
| Property: ETag label | `ETag` |
| Property: Storage class label | `Storage class` |
| Copy key button | `Copy key` |
| Copy S3 URI button | `Copy S3 URI` |
| Copy bucket name button (object browser header) | `Copy bucket name` |

### Object Delete Copy

| Element | Copy |
|---------|------|
| Single delete header | `Delete object` |
| Single delete body | `Are you sure you want to delete {fullObjectKey}? This action cannot be undone.` |
| Single delete confirm prompt | `To confirm deletion, type "{fullObjectKey}"` |
| Single delete CTA | `Delete` |
| Bulk delete header | `Delete {count} objects` |
| Bulk delete body | `Are you sure you want to delete these {count} objects? This action cannot be undone.` |
| Bulk delete confirm prompt | `To confirm deletion, type "delete"` |
| Bulk delete CTA | `Delete` |
| Single delete success | `Object {objectKey} deleted successfully.` |
| Bulk delete success | `{count} objects deleted successfully.` |
| Partial bulk delete failure | `Failed to delete {failedCount} of {totalCount} objects.` |
| Single delete failure | `Failed to delete {objectKey}: {errorMessage}` |

### Miscellaneous Copy

| Element | Copy |
|---------|------|
| Refresh button tooltip | `Refresh` |
| Preferences button | `Preferences` |
| Page size label | `Page size` |
| Actions dropdown button | `Actions` |
| Previous page button (object pagination) | `Previous` |
| Next page button (object pagination) | `Next` |
| SplitPanel close label | `Close panel` |
| Bucket detail SplitPanel header | `{bucketName}` |
| Bucket detail tab label | `Properties` |
| Bucket property: Name | `Name` |
| Bucket property: Region | `Region` |
| Bucket property: Creation date | `Creation date` |
| Bucket property: Object count (if cheaply computable, else hide) | `Objects` |
| Loading tables | `Loading buckets` / `Loading objects` |

### Tone Rules (inherited from Phase 1/2)

- Imperative voice for instructions ("Drag files here to upload", not "You can drag files")
- No exclamation marks
- No emoji in copy
- AWS canonical capitalization for service names (`S3`, `ARN`, `ETag`)
- Full key in confirmation prompts (not basename) — reduces accidental deletes of same-name files in different prefixes
- "Bucket" and "object" are the user-facing terms — never "container", "blob", or AWS internal jargon

---

## Interaction Contract

All interactions inherit Phase 2's rules for tables, modals, SplitPanels, and Flashbar. Phase 3 S3 additions:

| Interaction | Behavior | Cloudscape mechanism |
|-------------|----------|----------------------|
| Click bucket name in bucket list | Navigate to `/services/s3/{bucket}` (object browser at root prefix) | `<Link>` inside Table cell |
| Click bucket row (non-name click) | Open SplitPanel with bucket details | `Table` `onSelectionChange` (inherited from Phase 2) |
| Click folder name in object table | Update `?prefix=` query param to include this folder | `<Link>` inside Table cell + React Router navigate |
| Click `..` parent row | Remove one segment from `?prefix=`, no-op at root | React Router navigate |
| Click file row (non-name click) | Open SplitPanel with object details | `Table` `onSelectionChange` |
| Click prefix breadcrumb item | Navigate to that prefix level | `BreadcrumbGroup` `onFollow` |
| Drag files onto drop-zone | Show drag-over visual state, prepare for drop | `onDragEnter` / `onDragOver` + CSS state |
| Drop files on drop-zone | Start upload sequence to current prefix | `onDrop` → upload pipeline |
| Drag files off drop-zone | Restore idle visual state | `onDragLeave` |
| Click Upload button | Open native file picker (multiple) | `<input type="file" multiple hidden>` triggered programmatically |
| Click Download in SplitPanel | Fetch Blob, trigger browser download | ky + `URL.createObjectURL` |
| Click Copy key | Copy full object key to clipboard | `CopyToClipboard` |
| Click Copy S3 URI | Copy `s3://{bucket}/{key}` to clipboard | `CopyToClipboard` |
| Click Cancel in upload Flashbar | Abort XHR, mark file as Cancelled | `XMLHttpRequest.abort()` |
| Press Escape with modal open | Close modal (inherited from Phase 2) | Modal `onDismiss` |
| Press Escape with SplitPanel open | Close SplitPanel | `AppLayout onSplitPanelToggle` |
| Change page (Next button, objects) | Push continuation token to stack, fetch next page | Custom pagination state |
| Change page (Previous button, objects) | Pop continuation token from stack, fetch previous page | Custom pagination state |
| Refresh button | Invalidate TanStack Query for current view, reset pagination token stack | `queryClient.invalidateQueries` |

### Loading States (Claude's discretion — resolved)

Same rules as Phase 2, plus:

| Context | Loading treatment |
|---------|-------------------|
| Initial bucket list load | `Table` `loading={true}` with `loadingText="Loading buckets"` |
| Initial object list load | `Table` `loading={true}` with `loadingText="Loading objects"` |
| Prefix navigation (re-fetch on prefix change) | Same `Table loading={true}` state — debounces rapid prefix clicks |
| SplitPanel data load (object metadata / tags) | Cloudscape `Spinner` centered in the relevant tab content |
| Upload in progress | ProgressBar inside Flashbar item per file |
| Download in progress | Button `loading={true}` for single download; Flashbar `in-progress` for bulk |
| Delete in progress | Modal CTA button `loading={true}`; Flashbar appears on success/failure |

### Error Handling (Claude's discretion — resolved)

Same rules as Phase 2, plus:

| Context | Error treatment |
|---------|----------------|
| Bucket list fetch failure | `Table` `empty` slot with `Alert type="error"` + retry button |
| Object list fetch failure | Same pattern — `Alert` in the table empty slot |
| Object list fetch failure at deep prefix | Alert includes current prefix in message |
| Create bucket server error | Inline `Alert type="error"` at top of Modal |
| Upload failure | Flashbar `type="error"` per file, with Retry link |
| Download failure | Flashbar `type="error"` with full error |
| Delete bucket-not-empty | Flashbar `type="error"` with explicit "bucket is not empty" message |
| Delete object bulk partial failure | Flashbar `type="error"` summarizes count + individual error Flashbars per failed key |

---

## Responsive Behavior

Inherited from Phase 1/2:

| Breakpoint | Behavior |
|------------|----------|
| >= 1280px | Full layout: sidebar + table + SplitPanel |
| 720px - 1279px | Sidebar auto-collapses (Cloudscape default); SplitPanel may overlap table |
| < 720px | Not supported (out of scope per REQUIREMENTS.md) |

**S3-specific responsive notes:**

- Drop-zone always covers the table area regardless of viewport width — do not hide or shrink the drop target
- Prefix breadcrumb collapses middle segments into `...` dropdown on narrow viewports (Cloudscape BreadcrumbGroup default)
- Object name column `minWidth=280px` may require horizontal scroll on very narrow viewports — Cloudscape Table handles this

---

## Accessibility Contract

Inherits Phase 1/2 plus Phase 3 additions:

- Drop-zone has `role="region"` with `aria-label="Object upload drop zone"` and announces drag-over state via `aria-live="polite"`
- Upload button has `aria-label="Upload files to {currentPrefix or bucket root}"`
- Per-file upload Flashbar items use `role="status"` for screen reader announcement; progress updates throttled to every 10% to avoid noise
- Download links have `aria-label="Download {filename}"`
- Folder-row links have `aria-label="Open folder {folderName}"` (clarifies that clicking navigates, not downloads)
- The synthetic `..` parent row has `aria-label="Go to parent folder"` and is focusable via keyboard
- Copy-to-clipboard buttons have descriptive `aria-label` (Cloudscape `CopyToClipboard` handles this)
- Type-to-confirm inputs have `aria-describedby` linking to the confirmation prompt text
- Upload ProgressBar inside Flashbar has accessible `value` + `description` so screen readers announce progress
- The prefix breadcrumb (inner breadcrumb) uses `aria-label="Folder navigation"` to distinguish it from the outer app breadcrumb
- Keyboard: drag-and-drop is inherently mouse-oriented — the Upload button is the accessible equivalent and must be keyboard-reachable with visible focus ring

---

## Registry Safety

| Registry | Blocks Used | Safety Gate |
|----------|-------------|-------------|
| shadcn official | none — shadcn not installed | not applicable |
| third-party shadcn registries | none | not applicable |
| `@cloudscape-design/components` (npm, AWS official) | All Phase 1/2 components (no new additions in Phase 3) | npm package — Apache 2.0, maintained by AWS, no shadcn vetting gate required |
| `@cloudscape-design/collection-hooks` (npm, AWS official) | `useCollection` for bucket table | trusted vendor (added Phase 2) |
| `@cloudscape-design/global-styles` (npm, AWS official) | global CSS reset + theme | trusted vendor |
| `@cloudscape-design/design-tokens` (npm, AWS official) | CSS custom properties + JS exports | trusted vendor |

**Zero new npm dependencies in Phase 3 S3.** All upload progress/XHR handling is done with browser-built-in `XMLHttpRequest`; all Blob/download handling uses native browser APIs. No third-party upload libraries, no drag-and-drop libraries (plain `onDragOver`/`onDrop` handlers).

**No third-party shadcn-style registries are declared.** The `view + diff` safety gate does not apply to Phase 3.

---

## File / Module Inventory (planner reference)

The planner should produce tasks that create at least these files in `web/src/`. Follows the Phase 2 pattern of `web/src/services/{service}/...`.

```
web/src/
├── services/
│   └── s3/
│       ├── S3Layout.tsx                            # S3 page wrapper with outlet for bucket list vs object browser
│       ├── BucketListPage.tsx                      # /services/s3 — bucket list
│       ├── ObjectBrowserPage.tsx                   # /services/s3/:bucketName — object browser
│       ├── components/
│       │   ├── BucketTable.tsx                     # Bucket list table
│       │   ├── BucketDetail.tsx                    # SplitPanel content for buckets
│       │   ├── CreateBucketModal.tsx               # Create bucket form
│       │   ├── DeleteBucketModal.tsx               # Type-to-confirm delete bucket modal
│       │   ├── ObjectTable.tsx                     # Object list table (with parent row)
│       │   ├── ObjectDetail.tsx                    # SplitPanel content for objects (tabbed)
│       │   ├── DeleteObjectModal.tsx               # Type-to-confirm delete object(s) modal
│       │   ├── PrefixBreadcrumb.tsx                # Inner prefix BreadcrumbGroup
│       │   ├── DropZone.tsx                        # Drag-and-drop wrapper around the object table
│       │   ├── UploadFlashItem.tsx                 # Flashbar item with ProgressBar for upload lifecycle
│       │   ├── DownloadFlashItem.tsx               # Flashbar item for download lifecycle (bulk only)
│       │   └── columns.ts                          # Bucket + object column definitions
│       └── api/
│           ├── s3Client.ts                         # S3 REST client (path-style URLs, XML responses) per CONTEXT.md D-15
│           ├── parseS3Xml.ts                       # S3-specific XML parsing helpers (ListBucketResult, ListAllMyBucketsResult, etc.)
│           ├── uploadClient.ts                     # XHR-based upload helper with progress + cancel
│           ├── downloadClient.ts                   # Blob-based download helper
│           ├── useBuckets.ts                       # TanStack Query hook for ListBuckets
│           ├── useObjects.ts                       # TanStack Query hook for ListObjectsV2 (prefix + continuation token)
│           ├── useObjectMetadata.ts                # TanStack Query hook for HeadObject (metadata tab)
│           ├── useObjectTags.ts                    # TanStack Query hook for GetObjectTagging (tags tab)
│           ├── bucketMutations.ts                  # CreateBucket, DeleteBucket mutations
│           └── objectMutations.ts                  # PutObject, DeleteObject, DeleteObjects mutations
├── shared/
│   ├── copy.ts                                     # EXTEND: add Phase 3 S3 copy strings
│   └── types.ts                                    # EXTEND: add S3Bucket, S3Object, S3Prefix types
└── stores/
    └── uiStore.ts                                  # EXTEND: add s3BucketPageSize, s3ObjectPageSize, s3SplitPanelOpen
```

**Route additions** (in `web/src/app/routes.tsx`):

```
/services/s3                    → S3Layout > BucketListPage
/services/s3/:bucketName        → S3Layout > ObjectBrowserPage  (reads ?prefix=)
```

These routes MUST be added **before** the generic `:serviceKey` wildcard route from Phase 1, so that `/services/s3` resolves to the Phase 3 S3 page, not the Phase 1 `ServiceHome`. (Same route-ordering rule that Phase 2 applied for `/services/ec2`.)

**Explicit non-scope in this contract:**

- Lambda UI files (deferred per CONTEXT.md — a separate execution cycle will produce a Lambda UI-SPEC addendum or a new contract)
- Object version listing / version restore (deferred)
- Bucket settings editing (encryption, lifecycle, CORS) (deferred)
- Multipart upload (deferred — simple PutObject only)
- Inline content preview (deferred to Phase 5 data-display work)
- Static website hosting configuration (deferred)

---

## Checker Sign-Off

- [ ] Dimension 1 Copywriting: PASS
- [ ] Dimension 2 Visuals: PASS
- [ ] Dimension 3 Color: PASS
- [ ] Dimension 4 Typography: PASS
- [ ] Dimension 5 Spacing: PASS
- [ ] Dimension 6 Registry Safety: PASS

**Approval:** pending
