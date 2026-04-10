# Phase 2: EC2 Dashboard & CRUD Patterns - Context

**Gathered:** 2026-04-10
**Status:** Ready for planning

<domain>
## Phase Boundary

Deliver a fully functional EC2 resource management UI within the MiniStack web console. Users can list, create, view details, modify, and delete EC2 resources (instances, VPCs, subnets, security groups, key pairs, EBS volumes, snapshots, Elastic IPs, Internet Gateways, NAT Gateways) through browser-based CRUD interfaces. Establishes reusable CRUD patterns (table, detail panel, create form, delete confirmation) that all future service phases will follow.

</domain>

<decisions>
## Implementation Decisions

### Resource Table Design (CRUD-01, CRUD-06)
- **D-01:** Client-side pagination with configurable page size (10/25/50). All data fetched at once via AWS API, paginated in browser using Cloudscape Table.
- **D-02:** AWS Console-matching columns per resource type. EC2 instances: Name (tag), Instance ID, Instance state, Instance type, Status check, Availability zone, Public IPv4. Other resource types follow their AWS Console column patterns.
- **D-03:** Cloudscape PropertyFilter for structured filtering. Type-ahead tokens like `state = running`, `type = t2.micro`. Supports free text + structured filters.
- **D-04:** Multi-select with bulk actions. Checkbox column + action bar on selection. Bulk start/stop/terminate for instances. Cloudscape Table native multi-select.
- **D-05:** Manual refresh button per resource list (CRUD-06). TanStack Query invalidation on click.

### Detail View Pattern (CRUD-02)
- **D-06:** Cloudscape SplitPanel for detail view. Bottom panel opens on row click — user sees table and details simultaneously. Matches AWS Console behavior.
- **D-07:** Tabbed sections within split panel for complex resources. Instances: Details, Networking, Storage, Security, Tags tabs. Simpler resources (key pairs, Elastic IPs) use flat KeyValuePairs without tabs.

### Create/Edit Forms (CRUD-03, EC2-06)
- **D-08:** Cloudscape Wizard for instance creation (EC2-06). Steps: 1) Name + Instance type, 2) Network (VPC, subnet), 3) Security (SG, key pair), 4) Review & Launch. Dropdowns populated from live API calls.
- **D-09:** Cloudscape Modal forms for simpler resource creation (VPC, subnet, SG, key pair, EBS volume). Modal dialog with focused form fields.
- **D-10:** Type-to-confirm delete modal (CRUD-04). User types resource ID to confirm deletion. Cloudscape Modal + Input. Prevents accidental deletes.

### EC2 Sub-Resource Scope
- **D-11:** Full CRUD UI: Instances, VPCs, Subnets, Security Groups, Key Pairs, EBS Volumes, Snapshots, Elastic IPs, Internet Gateways, NAT Gateways.
- **D-12:** List-only (view, no create/delete UI): Route Tables, Network Interfaces.
- **D-13:** Deferred to future phases: Network ACLs, VPN Gateways, VPC Peering, Flow Logs, DHCP Options, Egress-Only IGWs.

### EC2 Navigation
- **D-14:** Tab-based sub-navigation within EC2 service page. Cloudscape Tabs: Instances | VPCs | Subnets | Security Groups | Key Pairs | EBS | Elastic IPs | Gateways. URL pattern: /services/ec2/instances, /services/ec2/vpcs, etc.

### Instance Actions (CRUD-05, EC2-02)
- **D-15:** Action buttons for start, stop, terminate, reboot visible in table header (bulk) and split panel detail (single). State-aware: can't start an already-running instance.

### Status Indicators (EC2-01)
- **D-16:** Color-coded via Cloudscape StatusIndicator. Running = success (green), Stopped = warning (yellow/orange), Terminated = error (red), Pending/Shutting-down/Stopping = info (blue).

### Claude's Discretion
- XML parsing strategy: continue DOMParser (Phase 1 pattern) or introduce a helper utility — Claude decides based on complexity
- Error handling patterns for failed API calls (retry, toast notification, inline alert)
- Loading skeleton vs spinner choice per component
- Table column width and responsive behavior
- Form field validation rules (CIDR format, naming constraints)

</decisions>

<canonical_refs>
## Canonical References

**Downstream agents MUST read these before planning or implementing.**

### Phase 1 Artifacts
- `.planning/phases/01-app-shell-navigation/01-CONTEXT.md` — Phase 1 decisions (D-01 through D-11), frontend-as-AWS-client pattern
- `.planning/phases/01-app-shell-navigation/01-RESEARCH.md` — Pitfalls, Cloudscape patterns, XML parsing approach
- `.planning/phases/01-app-shell-navigation/01-UI-SPEC.md` — Copywriting contract, layout conventions

### Backend Implementation
- `ministack/services/ec2.py` — EC2 handler implementation (3,175 lines, 138 actions)
- `ministack/app.py` — ASGI handler, console routes, service dispatch
- `ministack/console/registry.py` — Service taxonomy (display name + category)

### Frontend Foundation (from Phase 1)
- `web/src/shared/api/client.ts` — ky HTTP client setup
- `web/src/shared/api/counts.ts` — EC2 XML parsing pattern (DOMParser + DescribeInstances)
- `web/src/shared/api/services.ts` — useServices() hook pattern
- `web/src/pages/ServiceHome.tsx` — Current service home with count + status rollup
- `web/src/app/routes.tsx` — React Router 7 routes structure
- `web/src/shared/copy.ts` — Centralized copy strings
- `web/src/stores/uiStore.ts` — Zustand UI state pattern

### Design System
- Cloudscape Table component — pagination, sorting, filtering, multi-select
- Cloudscape SplitPanel — detail view pattern
- Cloudscape Wizard — multi-step form pattern
- Cloudscape Modal — simple create/delete patterns
- Cloudscape PropertyFilter — structured filtering
- Cloudscape StatusIndicator — color-coded status display

</canonical_refs>

<code_context>
## Existing Code Insights

### Reusable Assets
- `useServices()` hook: Service list with 5min cache — extend for resource-specific hooks
- `apiClient` (ky): HTTP client ready for AWS API calls with proper headers
- DOMParser XML parsing pattern in `counts.ts` — extend for full resource parsing
- Cloudscape AppLayout, TopBar, Sidebar, Breadcrumbs from Phase 1
- TanStack Query setup with QueryClientProvider

### Established Patterns
- Frontend calls AWS APIs directly via POST with Action parameter (EC2 Query protocol)
- XML response parsing via DOMParser
- TanStack Query for server state, Zustand for UI state
- Cloudscape component library for all UI elements
- React Router 7 library mode with basename `/_console`

### Integration Points
- `web/src/app/routes.tsx` — Add EC2 sub-routes under `/services/ec2/*`
- `web/src/pages/ServiceHome.tsx` — Currently handles count display, needs to route to full CRUD view
- `web/src/shared/api/counts.ts` — Extend parsing patterns into full resource list hooks
- `ministack/console/registry.py` — EC2 is already registered as "Compute" category

</code_context>

<specifics>
## Specific Ideas

- Match AWS Console look and feel as closely as possible — user chose AWS Console match patterns for every decision
- Instance creation wizard should mirror the AWS "Launch Instance" flow
- Split panel detail view mimics AWS Console click-to-expand behavior
- PropertyFilter matches AWS Console structured filtering
- Type-to-confirm delete matches AWS Console destructive action safety

</specifics>

<deferred>
## Deferred Ideas

- Network ACLs, VPN Gateways, VPC Peering, Flow Logs, DHCP Options, Egress-Only IGWs — defer to a future networking-focused phase
- Edit/modify existing resources (e.g., modify instance type) — defer to post-CRUD phase
- Resource tagging UI (create/edit/delete tags) — could be Phase 2 stretch goal or separate phase

</deferred>

---

*Phase: 02-ec2-dashboard-crud-patterns*
*Context gathered: 2026-04-10*
