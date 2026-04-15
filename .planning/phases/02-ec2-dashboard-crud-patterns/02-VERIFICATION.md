---
phase: 02-ec2-dashboard-crud-patterns
verified: 2026-04-15T23:30:00Z
status: human_needed
score: 5/5 must-haves verified
overrides_applied: 0
human_verification:
  - test: "Navigate to http://localhost:4566/_console/services/ec2 — verify 12 tabs visible, defaults to Instances tab, tab clicks change URL and highlight correct tab"
    expected: "Browser shows EC2 dashboard with tabs: Instances, VPCs, Subnets, Security Groups, Key Pairs, Volumes, Snapshots, Elastic IPs, Internet Gateways, NAT Gateways, Route Tables, Network Interfaces"
    why_human: "Visual tab rendering and URL sync require a running MiniStack instance and browser inspection"
  - test: "Create an instance via CLI (aws --endpoint-url=http://localhost:4566 ec2 run-instances --image-id ami-12345 --instance-type t2.micro), click Refresh on the Instances tab, verify the green 'running' badge appears, and test Start/Stop/Terminate state-aware disabling"
    expected: "Running instance shows green StatusIndicator. Start button disabled for running instance. Stop button enabled. Terminate requires typing instance ID in modal."
    why_human: "Live EC2 API calls against running MiniStack emulator + real DOM interaction required for state transition verification"
  - test: "Click 'Launch instance' from Instances tab, walk through 4-step wizard with VPC/Subnet/SG dropdowns populated from API, launch an instance"
    expected: "Step 2 VPC dropdown shows existing VPCs. Subnet dropdown filters by selected VPC. Step 3 SG multiselect filters by VPC. Flashbar success appears after launch and redirects to Instances tab."
    why_human: "Multi-step form interaction, dropdown population from live API, and post-submit navigation require browser session with running backend"
  - test: "VPCs tab: verify default VPC appears, create VPC with CIDR 10.0.0.0/16 via modal, delete it with type-to-confirm"
    expected: "Create VPC modal has Name and CIDR fields. CIDR validated (invalid format shows error). Delete modal requires typing VPC ID exactly."
    why_human: "Form validation behavior and CRUD flow require running backend and browser interaction"
  - test: "Route Tables tab: confirm no Create/Delete buttons exist, only Refresh; Network Interfaces tab: same list-only verification"
    expected: "Both tabs show TextFilter (not PropertyFilter), no selection checkboxes, no action buttons except Refresh. Row click opens SplitPanel detail."
    why_human: "Absence of UI elements and correct filter type require visual browser verification"
---

# Phase 2: EC2 Dashboard & CRUD Patterns Verification Report

**Phase Goal:** Users can fully manage EC2 resources (instances, VPCs, subnets, security groups, EBS, networking) through the console, establishing reusable CRUD patterns for all future services
**Verified:** 2026-04-15T23:30:00Z
**Status:** human_needed
**Re-verification:** No — initial verification

## Goal Achievement

### Observable Truths (Roadmap Success Criteria)

| # | Truth | Status | Evidence |
|---|-------|--------|----------|
| 1 | User sees EC2 instance list with color-coded status indicators (green/yellow/red) in a sortable, filterable table | VERIFIED | `StatusBadge.tsx` maps `running→success`, `stopped→warning`, `terminated→error`. `InstancesTab.tsx` uses `<StatusBadge state={item.state} />` in column cell. `ResourceTable.tsx` uses `useCollection` with `propertyFiltering` and `sorting`. |
| 2 | User can start, stop, terminate, and reboot an instance via action buttons and see the state change | VERIFIED | `InstancesTab.tsx` has `startMutation`/`stopMutation`/`terminateMutation`/`rebootMutation` hooks wired to `ButtonDropdown`. State-aware guards `canStart`/`canStop`/`canReboot`/`canTerminate` disable buttons per selected state. `onSuccess` invalidates `['ec2', 'instances']` causing re-fetch. |
| 3 | User can create a new instance by selecting instance type, VPC, subnet, and security group from a form | VERIFIED | `InstanceWizard.tsx` 4-step Wizard: Step1 (name + type), Step2 (VPC+subnet from `useVpcs`/`useSubnets`), Step3 (SG multiselect + keypair), Step4 (review). Calls `useRunInstance().mutateAsync(...)`. Subnet filtered by VPC. SG filtered by VPC. |
| 4 | User can view, create, and delete VPCs, subnets, security groups, key pairs, EBS volumes, snapshots, Elastic IPs, NAT Gateways, and Internet Gateways | VERIFIED | All 9 resource types have dedicated tab pages (`VpcsTab`, `SubnetsTab`, `SecurityGroupsTab`, `KeyPairsTab`, `VolumesTab`, `SnapshotsTab`, `ElasticIpsTab`, `InternetGatewaysTab`, `NatGatewaysTab`) with `useQuery`+`useMutation` hooks, `CreateModal`, `DeleteModal` (type-to-confirm). |
| 5 | User can click any resource row to see all its attributes in a detail view, and can manually refresh any resource list | VERIFIED | `InstancesTab` uses `useSplitPanel().setPanel(...)` on row click with 5-tab `SplitPanelDetail`. `handleRefresh` calls `queryClient.invalidateQueries`. Pattern repeated across all 12 tab pages. |

**Score:** 5/5 truths verified

### Required Artifacts

| Artifact | Expected | Status | Details |
|----------|----------|--------|---------|
| `web/src/shared/api/xml.ts` | parseXml, getText, getItems, getNameTag | VERIFIED | All 4 functions exported |
| `web/src/services/ec2/api/ec2Client.ts` | ec2Query, addMemberList | VERIFIED | Both exported; imports `apiClient` from `shared/api/client` |
| `web/src/services/ec2/api/types.ts` | 12 resource interfaces + Ec2ResourceType | VERIFIED | All 12 interfaces + union type exported |
| `web/src/shared/copy.ts` | EC2 copy strings from UI-SPEC | VERIFIED | `ec2Heading`, `ec2TableHeader`, `ec2EmptyHeading`, `ec2WizardHeader`, `ec2DeleteHeader` confirmed present |
| `web/src/services/ec2/components/ResourceTable.tsx` | Generic table with useCollection | VERIFIED | Uses `useCollection` from `@cloudscape-design/collection-hooks`; dispatches to `ResourceTableText`/`ResourceTableProperty` |
| `web/src/services/ec2/components/StatusBadge.tsx` | Maps EC2 states to Cloudscape StatusIndicator types | VERIFIED | Maps running→success, stopped→warning, terminated→error |
| `web/src/services/ec2/components/DeleteModal.tsx` | Type-to-confirm delete modal | VERIFIED | Strict `===` equality check; single (resourceId) and bulk ("delete"/"terminate") modes |
| `web/src/services/ec2/components/CreateModal.tsx` | Generic create form wrapper | VERIFIED | Exists, accepts children slot |
| `web/src/services/ec2/components/SplitPanelDetail.tsx` | Tabbed/flat detail content | VERIFIED | Supports `tabs` and `keyValueItems` props |
| `web/src/services/ec2/components/FlashNotifications.tsx` | Stack/auto-dismiss notifications | VERIFIED | `addSuccess` (5s auto-dismiss), `addError` (manual), max 3 items |
| `web/src/contexts/SplitPanelContext.tsx` | SplitPanelProvider + useSplitPanel | VERIFIED | Exported; ConsoleShell imports `useSplitPanel` |
| `web/src/services/ec2/pages/Ec2Dashboard.tsx` | 12-tab controller synced with URL | VERIFIED | 12 tab definitions; uses `useLocation`/`useNavigate` for URL sync |
| `web/src/services/ec2/pages/InstancesTab.tsx` | Full instance management tab | VERIFIED | 8 columns, state-aware actions, SplitPanel detail with 5 tabs, Flashbar, refresh |
| `web/src/services/ec2/pages/VpcsTab.tsx` | VPC CRUD | VERIFIED | Exists with full CRUD |
| `web/src/services/ec2/pages/SubnetsTab.tsx` | Subnet CRUD | VERIFIED | Exists with full CRUD |
| `web/src/services/ec2/pages/SecurityGroupsTab.tsx` | Security Group CRUD | VERIFIED | Exists with full CRUD |
| `web/src/services/ec2/pages/KeyPairsTab.tsx` | Key Pair CRUD | VERIFIED | One-time private key display pattern |
| `web/src/services/ec2/pages/VolumesTab.tsx` | Volume CRUD | VERIFIED | Size validation 1-16384 GiB |
| `web/src/services/ec2/pages/SnapshotsTab.tsx` | Snapshot CRUD | VERIFIED | Volume dropdown from API |
| `web/src/services/ec2/pages/ElasticIpsTab.tsx` | Elastic IP management | VERIFIED | Single-click allocate (no modal) |
| `web/src/services/ec2/pages/InternetGatewaysTab.tsx` | IGW management | VERIFIED | Full CRUD |
| `web/src/services/ec2/pages/NatGatewaysTab.tsx` | NAT GW management | VERIFIED | EIP dropdown filters to unassociated only |
| `web/src/services/ec2/pages/RouteTablesTab.tsx` | Route Tables list-only | VERIFIED | `useTextFilter={true}`, no CRUD buttons |
| `web/src/services/ec2/pages/NetworkInterfacesTab.tsx` | Network Interfaces list-only | VERIFIED | `useTextFilter={true}`, no CRUD buttons |
| `web/src/services/ec2/pages/InstanceWizard.tsx` | 4-step instance creation wizard | VERIFIED | Uses canonical hooks from Plans 04/05; calls RunInstances |
| `web/src/services/ec2/__tests__/fixtures.ts` | Shared EC2 XML fixtures | VERIFIED | Exports `EC2_FIXTURES` with 13 Describe + 22 mutation responses |
| `web/src/services/ec2/__tests__/msw-handlers.ts` | MSW handlers for all EC2 actions | VERIFIED | Exports `ec2Handlers`; dispatches on `Action` parameter |
| `web/src/services/ec2/__tests__/` (12 test files) | Test stubs covering all requirements | VERIFIED | 12 files with 73 `test.todo()` stubs; vitest reports 0 failures |

### Key Link Verification

| From | To | Via | Status | Details |
|------|----|-----|--------|---------|
| `web/src/services/ec2/api/instances.ts` | `web/src/services/ec2/api/ec2Client.ts` | `ec2Query('DescribeInstances')` | WIRED | Line 145 in instances.ts |
| `web/src/services/ec2/pages/InstancesTab.tsx` | `web/src/services/ec2/components/ResourceTable.tsx` | `<ResourceTable` | WIRED | Imported line 32; rendered line 426 |
| `web/src/services/ec2/pages/InstancesTab.tsx` | `web/src/contexts/SplitPanelContext.tsx` | `useSplitPanel` | WIRED | Imported line 40; used `setPanel` at line 363 |
| `web/src/app/ConsoleShell.tsx` | `web/src/contexts/SplitPanelContext.tsx` | `useSplitPanel` | WIRED | Imported lines 11-12; used in `ConsoleShellInner` |
| `web/src/services/ec2/api/vpcs.ts` | `web/src/services/ec2/api/ec2Client.ts` | `ec2Query('DescribeVpcs')` | WIRED | Line 59 in vpcs.ts |
| `web/src/services/ec2/api/elasticIps.ts` | `web/src/services/ec2/api/ec2Client.ts` | `ec2Query('DescribeAddresses')` | WIRED | Line 42 in elasticIps.ts |
| `web/src/services/ec2/api/routeTables.ts` | `web/src/services/ec2/api/ec2Client.ts` | `ec2Query('DescribeRouteTables')` | WIRED | Confirmed by plan execution + tsc exit 0 |
| `web/src/services/ec2/pages/InstanceWizard.tsx` | `web/src/services/ec2/api/vpcs.ts` | `useVpcs` | WIRED | Imported line 25; used line 136 |
| `web/src/services/ec2/pages/InstanceWizard.tsx` | `web/src/services/ec2/api/subnets.ts` | `useSubnets` | WIRED | Imported line 26; used line 137 |
| `web/src/services/ec2/pages/InstanceWizard.tsx` | `web/src/services/ec2/api/securityGroups.ts` | `useSecurityGroups` | WIRED | Imported line 27; used line 226 |
| `web/src/services/ec2/pages/InstanceWizard.tsx` | `web/src/services/ec2/api/keyPairs.ts` | `useKeyPairs` | WIRED | Imported line 28; used line 227 |
| `web/src/services/ec2/__tests__/msw-handlers.ts` | test files (per-file) | `mswServer.use(...ec2Handlers)` | WIRED | Each test file registers in `beforeAll` — e.g. InstancesTab.test.tsx line 5, VpcsTab.test.tsx line 5 |

Note: The plan's key link required wiring `ec2Handlers` via `mswServer.use(...)`. This is implemented per-test-file in `beforeAll` rather than in the shared `msw.ts` — functionally equivalent and by design (test isolation).

### Data-Flow Trace (Level 4)

| Artifact | Data Variable | Source | Produces Real Data | Status |
|----------|---------------|--------|--------------------|--------|
| `InstancesTab.tsx` | `instances` (from `useInstances()`) | `ec2Query('DescribeInstances')` → `parseInstances(xml)` | Yes — parses live EC2 XML from backend | FLOWING |
| `VpcsTab.tsx` | `vpcs` (from `useVpcs()`) | `ec2Query('DescribeVpcs')` → `parseVpcs(xml)` | Yes | FLOWING |
| `InstanceWizard.tsx` | `vpcs`, `subnets`, `securityGroups`, `keyPairs` | Canonical hooks from Plans 04/05 | Yes — all hooks make real API calls | FLOWING |
| `RouteTablesTab.tsx` | `routeTables` (from `useRouteTables()`) | `ec2Query('DescribeRouteTables')` → `parseRouteTables(xml)` | Yes | FLOWING |

### Behavioral Spot-Checks

| Behavior | Command | Result | Status |
|----------|---------|--------|--------|
| TypeScript compiles without errors | `npx tsc --noEmit` | Exit 0, 0 errors | PASS |
| Vitest test suite passes | `npx vitest run` | 16 passed, 73 todo, 0 failures — exit 0 | PASS |
| No Ec2TabPlaceholder references remain | `grep -rn "Ec2TabPlaceholder"` | No matches | PASS |
| All 12 EC2 tab routes use real components | Routes file imports | All 12 lazy imports to real tab pages confirmed | PASS |

### Requirements Coverage

| Requirement | Source Plan | Description | Status | Evidence |
|------------|-------------|-------------|--------|----------|
| EC2-01 | 02-00, 02-03 | Instance list with state indicators (running=green, stopped=yellow, terminated=red) | SATISFIED | `StatusBadge.tsx` maps states; `InstancesTab.tsx` uses it in column cell |
| EC2-02 | 02-03 | Instance start/stop/terminate/reboot actions | SATISFIED | 4 mutation hooks in `instances.ts`; state-aware guards in `InstancesTab.tsx` |
| EC2-03 | 02-04, 02-05, 02-08 | VPC, subnet, security group, key pair list/detail pages | SATISFIED | 4 dedicated tab pages with list/create/delete/SplitPanel detail |
| EC2-04 | 02-05 | EBS volumes, snapshots list/detail/create/delete | SATISFIED | `VolumesTab.tsx` and `SnapshotsTab.tsx` with full CRUD |
| EC2-05 | 02-06 | Elastic IP, NAT Gateway, Internet Gateway management | SATISFIED | 3 tab pages with allocate/create/delete; NAT GW filters unassociated EIPs |
| EC2-06 | 02-07 | Instance creation with type/VPC/subnet/SG selection | SATISFIED | `InstanceWizard.tsx` 4-step Cloudscape Wizard with live API dropdowns |
| CRUD-01 | 02-02, 02-03 | Sortable/filterable table for resource lists | SATISFIED | `ResourceTable.tsx` uses `useCollection` with PropertyFilter/TextFilter, sorting, pagination |
| CRUD-02 | 02-02, 02-03 | Resource detail view on click | SATISFIED | `SplitPanelContext` + `SplitPanelDetail`; row click → `setPanel` in all tab pages |
| CRUD-03 | 02-04, 02-05, 02-06, 02-07 | Create resource via form | SATISFIED | `CreateModal.tsx` used in 9 resource types; `InstanceWizard.tsx` for instances |
| CRUD-04 | 02-02, 02-04, 02-05, 02-06 | Delete with confirmation dialog | SATISFIED | `DeleteModal.tsx` with type-to-confirm strict equality check |
| CRUD-05 | 02-03 | Service-specific actions (EC2 start/stop, etc.) | SATISFIED | `ButtonDropdown` in `InstancesTab.tsx` with 4 state-aware actions; Flashbar feedback |
| CRUD-06 | 02-03, 02-04, 02-05, 02-06, 02-08 | Manual refresh button | SATISFIED | Refresh button calls `queryClient.invalidateQueries` in all tab pages |

### Anti-Patterns Found

| File | Line | Pattern | Severity | Impact |
|------|------|---------|----------|--------|
| `InstanceWizard.tsx` | 468 | `return null` in switch default | Info | Defensive unreachable branch — not a stub. 4 real step cases exist above. |
| `pages/*.tsx` (all) | various | `placeholder="..."` strings | Info | Cloudscape Input/Select placeholder attributes — expected form UI hints, not stub anti-patterns |

No blocker anti-patterns found.

### Human Verification Required

#### 1. EC2 Dashboard Renders and Tab Navigation Works

**Test:** Start MiniStack (`python -m ministack.app`), open `http://localhost:4566/_console/services/ec2` in browser. Count tabs, click between them, check URL changes.
**Expected:** 12 tabs visible (Instances active by default). Clicking each tab changes URL path and highlights the active tab.
**Why human:** Visual rendering and URL sync require live browser session.

#### 2. Instance State Indicators and Actions Work End-to-End

**Test:** Create instance via CLI (`aws --endpoint-url=http://localhost:4566 ec2 run-instances --image-id ami-12345 --instance-type t2.micro`). Click Refresh on Instances tab. Verify green StatusIndicator. Select instance and check that Start is disabled (already running), Stop is enabled. Test Terminate — type instance ID in modal.
**Expected:** Running instance: green badge. Start disabled. Stop enabled. Terminate modal requires exact instance ID.
**Why human:** Live API calls + DOM state interaction + real-time state machine behavior requires running backend and browser.

#### 3. Instance Launch Wizard with Live API Dropdowns

**Test:** Click "Launch instance" button in InstancesTab header. Navigate through 4 wizard steps. Verify VPC dropdown shows data from API. Change VPC — verify subnet dropdown resets and shows only subnets for that VPC. Complete wizard and launch.
**Expected:** Dropdowns populated from live API. Subnet/SG filter by VPC selection. After launch: Flashbar success and redirect to Instances tab with new instance appearing after refresh.
**Why human:** Multi-step form interaction with live data filtering requires browser session.

#### 4. VPC CRUD Flow

**Test:** Go to VPCs tab. Create VPC with CIDR `10.0.0.0/16`. Try invalid CIDR (e.g. `999.999`) — verify validation error. Delete created VPC — verify type-to-confirm modal requires typing exact VPC ID.
**Expected:** CIDR validation blocks invalid format. Delete modal: button disabled until VPC ID typed exactly.
**Why human:** Form validation UX and modal type-to-confirm interaction require browser.

#### 5. Route Tables and Network Interfaces as List-Only

**Test:** Navigate to Route Tables tab. Verify only Refresh button visible (no Create/Delete). Navigate to Network Interfaces tab. Same check.
**Expected:** No Create, Delete, or selection checkboxes. Only Refresh button. TextFilter (single text input) instead of PropertyFilter (token-based).
**Why human:** Absence of UI elements and correct filter type require visual verification.

### Gaps Summary

No gaps found. All 5 roadmap success criteria are verified. All 12 requirement IDs (EC2-01 through EC2-06, CRUD-01 through CRUD-06) are satisfied by the implemented artifacts. The phase is fully implemented from a code standpoint.

The `human_needed` status reflects 5 behavioral checks that require a running MiniStack instance and browser interaction to confirm end-to-end functionality. These are verification items, not implementation gaps.

---

_Verified: 2026-04-15T23:30:00Z_
_Verifier: Claude (gsd-verifier)_
