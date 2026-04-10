# Phase 2: EC2 Dashboard & CRUD Patterns - Discussion Log

> **Audit trail only.** Do not use as input to planning, research, or execution agents.
> Decisions are captured in CONTEXT.md — this log preserves the alternatives considered.

**Date:** 2026-04-10
**Phase:** 02-ec2-dashboard-crud-patterns
**Areas discussed:** Resource table design, Detail view pattern, Create/edit form design, EC2 sub-resource scope

---

## Resource Table Design

| Option | Description | Selected |
|--------|-------------|----------|
| Client-side pagination | Cloudscape Table built-in pagination (10/25/50). All data fetched at once. | ✓ |
| Server-side pagination | Backend NextToken-based. More complex, handles 1000+ resources. | |
| You decide | Claude picks per resource type. | |

**User's choice:** Client-side pagination
**Notes:** Local emulator won't have massive datasets

| Option | Description | Selected |
|--------|-------------|----------|
| AWS Console match | Match real AWS Console columns per resource type. | ✓ |
| Minimal essential | Instance ID, State, Type only. | |
| You decide | Claude picks per resource type. | |

**User's choice:** AWS Console match

| Option | Description | Selected |
|--------|-------------|----------|
| Cloudscape PropertyFilter | Structured type-ahead tokens (state = running). | ✓ |
| Simple text search | Single search box across all columns. | |
| You decide | Claude picks. | |

**User's choice:** Cloudscape PropertyFilter

| Option | Description | Selected |
|--------|-------------|----------|
| Multi-select with bulk actions | Checkbox column + action bar. Bulk start/stop/terminate. | ✓ |
| Single-row actions only | Each row has its own action buttons. | |
| You decide | Claude decides per resource. | |

**User's choice:** Multi-select with bulk actions

---

## Detail View Pattern

| Option | Description | Selected |
|--------|-------------|----------|
| Split panel | Cloudscape SplitPanel, bottom panel. Table + details visible simultaneously. | ✓ |
| Separate detail page | Navigate to /services/ec2/instances/{id}. Full page. | |
| You decide | Claude picks. | |

**User's choice:** Split panel

| Option | Description | Selected |
|--------|-------------|----------|
| Tabbed sections | Cloudscape Tabs in split panel: Details, Networking, Storage, Security, Tags. | ✓ |
| Flat key-value list | Single scrollable KeyValuePairs list. | |
| You decide | Tabs for complex, flat for simple. | |

**User's choice:** Tabbed sections

---

## Create/Edit Form Design

| Option | Description | Selected |
|--------|-------------|----------|
| Cloudscape Wizard | Multi-step: Name+Type → Network → Security → Review & Launch. | ✓ |
| Single-page form | All fields on one page with sections. | |
| You decide | Claude decides per complexity. | |

**User's choice:** Cloudscape Wizard for instance creation

| Option | Description | Selected |
|--------|-------------|----------|
| Cloudscape Modal form | Modal dialog with focused form for simple creates. | ✓ |
| Inline form on page | Form appears on the list page. | |
| You decide | Claude picks per resource. | |

**User's choice:** Cloudscape Modal for simple creates

| Option | Description | Selected |
|--------|-------------|----------|
| Type-to-confirm modal | Type resource ID to confirm. Prevents accidents. | ✓ |
| Simple confirm dialog | Are you sure? Cancel/Delete. | |
| You decide | Claude picks per criticality. | |

**User's choice:** Type-to-confirm modal

---

## EC2 Sub-Resource Scope

| Option | Description | Selected |
|--------|-------------|----------|
| Core networking + compute | Full CRUD for 10 resource types. List-only for 2. Defer 6+. | ✓ |
| Instances + minimal networking | Full CRUD for 4 types only. | |
| Everything backend supports | Full CRUD for 15+ types. | |

**User's choice:** Core networking + compute

| Option | Description | Selected |
|--------|-------------|----------|
| Tab-based sub-navigation | Cloudscape Tabs within EC2 page. URL: /services/ec2/{tab}. | ✓ |
| Sidebar sub-sections | EC2-specific left nav sidebar. | |
| You decide | Claude picks. | |

**User's choice:** Tab-based sub-navigation

---

## Claude's Discretion

- XML parsing strategy (continue DOMParser or introduce utility)
- Error handling patterns (retry, toast, inline alert)
- Loading skeleton vs spinner
- Table column widths and responsive behavior
- Form validation rules

## Deferred Ideas

- Network ACLs, VPN Gateways, VPC Peering, Flow Logs, DHCP Options — future networking phase
- Edit/modify existing resources — post-CRUD phase
- Resource tagging UI — Phase 2 stretch or separate phase
