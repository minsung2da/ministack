# Roadmap: MiniStack Web Console

## Overview

MiniStack is a local AWS emulator with 35+ services but no web UI. This roadmap delivers an AWS Console-style browser interface served from the existing ASGI app on port 4566. The journey starts with the app shell and navigation, proves all CRUD patterns on EC2 (the most complex service), extends to S3/Lambda, then builds a schema-driven generic framework validated with DynamoDB/SQS, and finishes with cross-cutting display quality and differentiators.

## Phases

**Phase Numbering:**
- Integer phases (1, 2, 3): Planned milestone work
- Decimal phases (2.1, 2.2): Urgent insertions (marked with INSERTED)

Decimal phases appear between their surrounding integers in numeric order.

- [ ] **Phase 1: App Shell & Navigation** - Build pipeline, ASGI middleware, SPA routing, global navigation with service search and sidebar
- [ ] **Phase 2: EC2 Dashboard & CRUD Patterns** - Full EC2 service UI proving all CRUD patterns (tables, detail, create, delete, actions)
- [x] **Phase 3: S3 Service** - S3 bucket/object browser with prefix navigation, drag-and-drop upload, download, metadata/tags (S3-01 through S3-04)
- [ ] **Phase 4: Lambda Service** - Lambda function list, configuration/environment/triggers detail, test invocation with JSON payload (LAM-01 through LAM-03)
- [x] **Phase 5: DynamoDB, SQS & Generic Framework** - Schema-driven generic components validated by building DDB and SQS UIs with them
- [ ] **Phase 6: Data Display Quality & Differentiators** - Cross-cutting UX polish (JSON tree, timestamps, loading states, errors) and unique features (reset, dark mode)

## Phase Details

### Phase 1: App Shell & Navigation
**Goal**: Users can open the web console in a browser and navigate between all services with search, sidebar, and breadcrumbs
**Depends on**: Nothing (first phase)
**Requirements**: FOUND-01, FOUND-02, FOUND-03, FOUND-04, NAV-01, NAV-02, NAV-03, NAV-04, NAV-05
**Success Criteria** (what must be TRUE):
  1. User navigates to `localhost:4566/_console/` and sees the app shell with top navigation bar
  2. User types a service name in the search bar and navigates to that service page
  3. Each service page shows a left sidebar with sub-resource links and breadcrumb trail
  4. Existing AWS CLI/SDK calls to port 4566 continue working exactly as before
  5. Service home pages show resource count summaries (even if zero) and the layout does not break on a standard laptop screen
**Plans**: 6 plans
- [ ] 01-test-scaffold-and-smoke-PLAN.md — Wave 0 test scaffolding, Cloudscape+React 19 smoke
- [ ] 02-backend-asgi-integration-PLAN.md — _serve_console() + /_console/api/services + package-data (FOUND-01/03/04)
- [ ] 03-frontend-scaffold-PLAN.md — Vite/React 19 entry + router + shared libs (FOUND-02)
- [ ] 04-app-shell-components-PLAN.md — ConsoleShell + TopBar + Sidebar + Breadcrumbs (NAV-01/02/03/05)
- [ ] 05-pages-and-resource-counts-PLAN.md — ConsoleHome + ServiceHome + counts.ts (NAV-04)
- [ ] 06-build-pipeline-and-e2e-PLAN.md — Multi-stage Dockerfile + Makefile + Playwright E2E
**UI hint**: yes

### Phase 2: EC2 Dashboard & CRUD Patterns
**Goal**: Users can fully manage EC2 resources (instances, VPCs, subnets, security groups, EBS, networking) through the console, establishing reusable CRUD patterns for all future services
**Depends on**: Phase 1
**Requirements**: EC2-01, EC2-02, EC2-03, EC2-04, EC2-05, EC2-06, CRUD-01, CRUD-02, CRUD-03, CRUD-04, CRUD-05, CRUD-06
**Success Criteria** (what must be TRUE):
  1. User sees EC2 instance list with color-coded status indicators (green/yellow/red) in a sortable, filterable table
  2. User can start, stop, terminate, and reboot an instance via action buttons and see the state change
  3. User can create a new instance by selecting instance type, VPC, subnet, and security group from a form
  4. User can view, create, and delete VPCs, subnets, security groups, key pairs, EBS volumes, snapshots, Elastic IPs, NAT Gateways, and Internet Gateways
  5. User can click any resource row to see all its attributes in a detail view, and can manually refresh any resource list
**Plans**: 9 plans
Plans:
- [x] 02-00-PLAN.md — Wave 0 test scaffolding: MSW handlers, fixtures, 12 test stub files
- [x] 02-01-PLAN.md — Utilities: XML parsing, EC2 client, types, copy strings
- [x] 02-02-PLAN.md — Components: ResourceTable, StatusBadge, DeleteModal, CreateModal, SplitPanelDetail, FlashNotifications, EC2 Dashboard tabs, routes
- [x] 02-03-PLAN.md — Instances tab: table, actions (start/stop/terminate/reboot), SplitPanel detail
- [x] 02-04-PLAN.md — VPCs, Subnets, Security Groups tabs (full CRUD)
- [x] 02-05-PLAN.md — Key Pairs, EBS Volumes, Snapshots tabs (full CRUD)
- [x] 02-06-PLAN.md — Elastic IPs, Internet Gateways, NAT Gateways tabs (full CRUD)
- [x] 02-07-PLAN.md — Instance Launch Wizard (4-step Cloudscape Wizard with canonical hooks)
- [x] 02-08-PLAN.md — Route Tables, Network Interfaces (list-only) + human verification checkpoint
**UI hint**: yes

### Phase 3: S3 Service
**Goal**: Users can browse S3 buckets/objects with drag-and-drop upload, download, and metadata/tags, reusing CRUD patterns from Phase 2
**Depends on**: Phase 2
**Requirements**: S3-01, S3-02, S3-03, S3-04
**Success Criteria** (what must be TRUE):
  1. User can list buckets, create a new bucket, and delete an empty bucket
  2. User can navigate into a bucket and browse objects by folder prefix, view object metadata, and download objects
  3. User can upload files via drag-and-drop to a bucket
  4. Non-empty-bucket delete returns a clear error; bulk and single object deletes use type-to-confirm modals
**Scope note**: Originally combined with Lambda; Lambda split to Phase 4 on 2026-04-17 to keep phase delivery coherent.
**Plans**: 6 plans (all complete)
Plans:
- [x] 03-00-PLAN.md — Wave 0: S3 MSW handlers, XML fixtures, 18 test stubs
- [x] 03-01-PLAN.md — S3 API primitives: s3Client, parseS3Xml, validateBucketName, uploadClient (XHR+progress), downloadClient (Blob)
- [x] 03-02-PLAN.md — TanStack Query hooks + mutations (buckets, objects, metadata, tags, delete)
- [x] 03-03-PLAN.md — Bucket list page: routes, BucketTable, Create/Delete modals, SplitPanel (S3-01)
- [x] 03-04-PLAN.md — Object browser shell: ObjectTable with parent row, PrefixBreadcrumb, continuation-token pagination (S3-02)
- [x] 03-05-PLAN.md — Upload/download/detail/delete: DropZone, UploadFlashItem, ObjectDetail, DeleteObjectModal + human-verify checkpoint (S3-03, S3-04)
**UI hint**: yes

### Phase 4: Lambda Service
**Goal**: Users can see the Lambda function list, view function configuration/environment/triggers on a detail page, and invoke a function with a JSON payload to see the response and execution log
**Depends on**: Phase 3
**Requirements**: LAM-01, LAM-02, LAM-03
**Success Criteria** (what must be TRUE):
  1. User can see Lambda function list with runtime, handler, and last modified time
  2. User can open a function detail page showing configuration, environment variables, and triggers
  3. User can invoke a function with a JSON payload and see the response body and execution log
**Plans**: TBD
**UI hint**: yes

### Phase 5: DynamoDB, SQS & Generic Service Framework
**Goal**: Users can manage DynamoDB tables/items and SQS queues/messages, and the schema-driven generic framework can render any new service UI from a descriptor without custom code
**Depends on**: Phase 4
**Requirements**: DDB-01, DDB-02, DDB-03, SQS-01, SQS-02, SQS-03, GEN-01, GEN-02, GEN-03
**Success Criteria** (what must be TRUE):
  1. User can view DynamoDB table list with key schema and indexes, scan/query items, and create/edit/delete items as JSON
  2. User can view SQS queue list with message counts, send messages, receive (poll) messages, and purge a queue
  3. User can navigate to any of the remaining 30+ services and see a resource list rendered by the generic framework
  4. Adding a new service descriptor JSON file causes that service UI to appear in the console without writing any React components
**Plans**: TBD
**UI hint**: yes

### Phase 6: Data Display Quality & Differentiators
**Goal**: Users experience polished data display (JSON trees, relative timestamps, loading states, error handling) and unique features that differentiate MiniStack from competitors
**Depends on**: Phase 5
**Requirements**: DISP-01, DISP-02, DISP-03, DISP-04, DISP-05, DISP-06, DIFF-01, DIFF-02
**Success Criteria** (what must be TRUE):
  1. User can expand/collapse nested JSON data in a tree view and copy values to clipboard
  2. ARN values are clickable to copy, timestamps show relative time with absolute on hover
  3. Empty resource pages show helpful guidance and a create button; loading states show skeletons/spinners; errors show toast notifications
  4. User can reset all resources for a single service or all services at once
  5. User can toggle dark mode and the preference persists across sessions
**Plans**: TBD
**UI hint**: yes

## Progress

**Execution Order:**
Phases execute in numeric order: 1 -> 2 -> 3 -> 4 -> 5 -> 6

| Phase | Plans Complete | Status | Completed |
|-------|----------------|--------|-----------|
| 1. App Shell & Navigation | 6/6 | Complete | 2026-04-10 |
| 2. EC2 Dashboard & CRUD Patterns | 9/9 | Complete | 2026-04-16 |
| 3. S3 Service | 6/6 | Complete | 2026-04-17 |
| 4. Lambda Service | 0/TBD | Not started | - |
| 5. DynamoDB, SQS & Generic Framework | 8/8 | Complete | 2026-04-24 |
| 6. Data Display Quality & Differentiators | 0/TBD | Not started | - |
