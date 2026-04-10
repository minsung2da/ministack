# Phase 2: EC2 Dashboard & CRUD Patterns - Research

**Researched:** 2026-04-10
**Domain:** Cloudscape Table/SplitPanel/Wizard/Modal + EC2 Query API (XML) + TanStack Query resource hooks
**Confidence:** HIGH

<user_constraints>
## User Constraints (from CONTEXT.md)

### Locked Decisions

**Resource Table Design (CRUD-01, CRUD-06)**
- D-01: Client-side pagination (10/25/50). All data fetched at once, paginated in browser via Cloudscape Table.
- D-02: AWS Console-matching columns per resource type. Instances: Name (tag), Instance ID, Instance state, Instance type, Status check, Availability zone, Public IPv4.
- D-03: Cloudscape PropertyFilter for structured filtering. Type-ahead tokens like `state = running`.
- D-04: Multi-select with bulk actions. Checkbox column + action bar. Bulk start/stop/terminate for instances.
- D-05: Manual refresh button per resource list. TanStack Query invalidation on click.

**Detail View Pattern (CRUD-02)**
- D-06: Cloudscape SplitPanel (bottom). Opens on row click — user sees table and details simultaneously.
- D-07: Tabbed sections within split panel for complex resources (instances). Simpler resources use flat KeyValuePairs.

**Create/Edit Forms (CRUD-03, EC2-06)**
- D-08: Cloudscape Wizard for instance creation. Steps: 1) Name + Instance type, 2) Network, 3) Security, 4) Review.
- D-09: Cloudscape Modal forms for simpler resource creation (VPC, subnet, SG, key pair, EBS).
- D-10: Type-to-confirm delete modal. User types resource ID to confirm.

**EC2 Sub-Resource Scope**
- D-11: Full CRUD UI: Instances, VPCs, Subnets, Security Groups, Key Pairs, EBS Volumes, Snapshots, Elastic IPs, Internet Gateways, NAT Gateways.
- D-12: List-only: Route Tables, Network Interfaces.
- D-13: Deferred: Network ACLs, VPN Gateways, VPC Peering, Flow Logs, DHCP Options, Egress-Only IGWs.

**EC2 Navigation**
- D-14: Tab-based sub-navigation via Cloudscape Tabs. URL: /services/ec2/instances, /services/ec2/vpcs, etc.

**Instance Actions (CRUD-05, EC2-02)**
- D-15: Action buttons for start/stop/terminate/reboot. State-aware — can't start a running instance.

**Status Indicators (EC2-01)**
- D-16: Running=success (green), Stopped=warning (yellow), Terminated=error (red), Pending/Shutting-down/Stopping=info (blue).

### Claude's Discretion
- XML parsing strategy: continue DOMParser (Phase 1 pattern) or introduce a helper utility — Claude decides based on complexity
- Error handling patterns for failed API calls (retry, toast notification, inline alert)
- Loading skeleton vs spinner choice per component
- Table column width and responsive behavior
- Form field validation rules (CIDR format, naming constraints)

### Deferred Ideas (OUT OF SCOPE)
- Network ACLs, VPN Gateways, VPC Peering, Flow Logs, DHCP Options, Egress-Only IGWs
- Edit/modify existing resources (e.g., modify instance type)
- Resource tagging UI (create/edit/delete tags)
</user_constraints>

<phase_requirements>
## Phase Requirements

| ID | Description | Research Support |
|----|-------------|------------------|
| EC2-01 | Instance list with color-coded status indicators (running=green, stopped=yellow, terminated=red) | §"StatusIndicator API" — `type` prop drives color; never hardcode hex. State map in UI-SPEC verified. |
| EC2-02 | Start/stop/terminate/reboot instance actions | §"EC2 Backend Actions" — StartInstances, StopInstances, TerminateInstances, RebootInstances all confirmed in ec2.py. |
| EC2-03 | VPC, subnet, security group, key pair list/detail pages | §"EC2 Backend Actions" — DescribeVpcs, DescribeSubnets, DescribeSecurityGroups, DescribeKeyPairs confirmed. |
| EC2-04 | EBS volume, snapshot list/detail/create/delete | §"EC2 Backend Actions" — CreateVolume, DeleteVolume, DescribeVolumes, CreateSnapshot, DeleteSnapshot confirmed. |
| EC2-05 | Elastic IP, NAT Gateway, Internet Gateway management | §"EC2 Backend Actions" — AllocateAddress, ReleaseAddress, CreateNatGateway, DeleteNatGateway, CreateInternetGateway, DeleteInternetGateway confirmed. |
| EC2-06 | Instance creation wizard: instance type, VPC, subnet, security group selection | §"Instance Creation" — RunInstances action accepts ImageId, InstanceType, SubnetId, SecurityGroupId. DescribeImages returns 3 stub AMIs. |
| CRUD-01 | Sortable/filterable resource list table | §"Cloudscape useCollection Hook" — `useCollection` from `@cloudscape-design/collection-hooks` 1.0.89 (already installed) provides sorting, filtering, pagination state. PropertyFilter uses `filteringProperties`. |
| CRUD-02 | Detail view on resource row click | §"SplitPanel Pattern" — Cloudscape SplitPanel in AppLayout `splitPanel` prop; state managed with `splitPanelOpen` + `splitPanelSize`. |
| CRUD-03 | Create new resource via form | §"Modal + Wizard Patterns" — Wizard for instances (D-08), Modal for everything else (D-09). |
| CRUD-04 | Delete resource with type-to-confirm | §"Delete Confirmation Pattern" — Modal + Input; enable confirm button only when input matches resource ID. |
| CRUD-05 | Service-specific actions (EC2 start/stop/terminate/reboot) | §"Instance Actions Pattern" — ButtonDropdown with state-aware disabled rules + TanStack Query mutation. |
| CRUD-06 | Manual refresh button updates resource list | §"TanStack Query Refresh" — `queryClient.invalidateQueries({ queryKey: ['ec2', resourceType] })` triggers refetch. |
</phase_requirements>

---

## Summary

Phase 2 builds on a complete Phase 1 foundation (AppLayout, Sidebar, Breadcrumbs, TanStack Query, ky client, DOMParser XML parsing). The primary work is: (1) expanding the `routes.tsx` to include EC2 sub-routes, (2) building a reusable resource table pattern using `useCollection` + Cloudscape Table + SplitPanel, (3) writing EC2 API hooks (one per resource type) that POST EC2 Query protocol requests and parse XML responses via DOMParser, and (4) implementing CRUD forms (Wizard for instances, Modals for everything else).

The EC2 backend (`ministack/services/ec2.py`, 3,175 lines) already implements all required actions: RunInstances, DescribeInstances, StartInstances, StopInstances, TerminateInstances, RebootInstances, DescribeVpcs, DescribeSubnets, CreateVpc/Subnet, DeleteVpc/Subnet, DescribeSecurityGroups, CreateSecurityGroup, DeleteSecurityGroup, DescribeKeyPairs, CreateKeyPair, DeleteKeyPair, DescribeVolumes, CreateVolume, DeleteVolume, DescribeSnapshots, CreateSnapshot, DeleteSnapshot, DescribeAddresses, AllocateAddress, ReleaseAddress, DescribeInternetGateways, CreateInternetGateway, DeleteInternetGateway, DescribeNatGateways, CreateNatGateway, DeleteNatGateway, DescribeRouteTables, DescribeNetworkInterfaces. No backend changes are needed.

The critical architectural decision (Claude's discretion) is XML parsing strategy. With 12 resource types each requiring a parsing function, the Phase 1 inline DOMParser pattern in `counts.ts` will produce unmanageable repetition. The correct approach is to introduce a shared `web/src/shared/api/xml.ts` utility with typed helper functions (`getText`, `getItems`, `parseInstance`, `parseVpc`, etc.) that all resource hooks import.

**Primary recommendation:** Build a `web/src/services/ec2/` directory with: `api/` (one file per resource type for hooks + XML parsers), `components/` (shared ResourceTable wrapper, SplitPanel detail view, CRUD modals), and `pages/Ec2Dashboard.tsx` (tab controller). Use `useCollection` from `@cloudscape-design/collection-hooks` (already installed at 1.0.89) as the single source of truth for table state. Never hand-roll pagination, sorting, or filter logic.

---

## Standard Stack

### Core (already installed — Phase 1 dependencies)

| Library | Version | Purpose | Status |
|---------|---------|---------|--------|
| `@cloudscape-design/components` | 3.0.1266 | All UI components (Table, SplitPanel, Wizard, Modal, etc.) | INSTALLED [VERIFIED: node_modules] |
| `@cloudscape-design/collection-hooks` | 1.0.89 | `useCollection` hook for table sorting/filtering/pagination | INSTALLED [VERIFIED: node_modules] |
| `@cloudscape-design/design-tokens` | (installed) | CSS tokens — never hardcode values | INSTALLED [VERIFIED: node_modules] |
| `@tanstack/react-query` | (installed) | Server state for all EC2 API calls | INSTALLED [VERIFIED: node_modules] |
| `zustand` | (installed) | UI state: split panel open/size, active tab | INSTALLED [VERIFIED: node_modules] |
| `ky` | 1.14.3 (pinned) | HTTP client for EC2 Query protocol POSTs | INSTALLED [VERIFIED: node_modules] |
| `react-router-dom` | 7.x (installed) | Sub-route navigation for EC2 tabs | INSTALLED [VERIFIED: node_modules] |

**No new npm packages are required for Phase 2.** All dependencies are already installed.

### Key Collection Hook (critical)

`@cloudscape-design/collection-hooks` exports exactly one hook: `useCollection`. [VERIFIED: node_modules CJS inspection]

```typescript
// Source: @cloudscape-design/collection-hooks 1.0.89
import { useCollection } from '@cloudscape-design/collection-hooks'

const { items, collectionProps, filterProps, paginationProps } = useCollection(allItems, {
  filtering: {
    empty: <EmptyState />,
    noMatch: <NoMatchState onClearFilter={...} />,
    filteringFunction: (item, filterText) => ...,   // for TextFilter
  },
  propertyFiltering: {
    filteringProperties: [...],   // for PropertyFilter
    empty: ...,
    noMatch: ...,
  },
  pagination: { pageSize: preferences.pageSize },
  sorting: { defaultState: { sortingColumn: columns[0] } },
  selection: {},
})
```

The hook returns `collectionProps` (spread onto `<Table>`), `filterProps` (spread onto `<PropertyFilter>` or `<TextFilter>`), and `paginationProps` (spread onto `<Pagination>`). [VERIFIED: Cloudscape documentation pattern]

---

## Architecture Patterns

### Recommended Project Structure (Phase 2 additions)

```
web/src/
├── services/
│   └── ec2/
│       ├── api/
│       │   ├── instances.ts         # useInstances(), useStartInstance(), etc.
│       │   ├── vpcs.ts              # useVpcs(), useCreateVpc(), useDeleteVpc()
│       │   ├── subnets.ts           # useSubnets(), useCreateSubnet(), useDeleteSubnet()
│       │   ├── securityGroups.ts    # useSGs(), useCreateSG(), useDeleteSG()
│       │   ├── keyPairs.ts          # useKeyPairs(), useCreateKeyPair(), useDeleteKeyPair()
│       │   ├── volumes.ts           # useVolumes(), useCreateVolume(), useDeleteVolume()
│       │   ├── snapshots.ts         # useSnapshots(), useCreateSnapshot(), useDeleteSnapshot()
│       │   ├── elasticIps.ts        # useElasticIps(), useAllocateAddress(), useReleaseAddress()
│       │   ├── internetGateways.ts  # useIGWs(), useCreateIGW(), useDeleteIGW()
│       │   ├── natGateways.ts       # useNatGWs(), useCreateNatGW(), useDeleteNatGW()
│       │   ├── routeTables.ts       # useRouteTables() — list only
│       │   └── networkInterfaces.ts # useNetworkInterfaces() — list only
│       ├── components/
│       │   ├── ResourceTable.tsx    # Generic table wrapper with useCollection
│       │   ├── SplitPanelDetail.tsx # Detail panel layout (tabs or flat KV)
│       │   ├── CreateModal.tsx      # Generic create modal wrapper
│       │   ├── DeleteModal.tsx      # Type-to-confirm delete modal
│       │   ├── InstanceWizard.tsx   # Multi-step instance creation
│       │   └── StatusBadge.tsx      # StatusIndicator wrapper for EC2 states
│       └── pages/
│           ├── Ec2Dashboard.tsx     # Tab controller + route outlet
│           ├── InstancesTab.tsx     # Instance list + SplitPanel
│           ├── VpcsTab.tsx
│           ├── SubnetsTab.tsx
│           ├── SecurityGroupsTab.tsx
│           ├── KeyPairsTab.tsx
│           ├── VolumesTab.tsx
│           ├── SnapshotsTab.tsx
│           ├── ElasticIpsTab.tsx
│           ├── InternetGatewaysTab.tsx
│           ├── NatGatewaysTab.tsx
│           ├── RouteTablesTab.tsx   # list-only
│           └── NetworkInterfacesTab.tsx  # list-only
├── shared/
│   └── api/
│       └── xml.ts                   # NEW: Shared DOMParser utilities
├── app/
│   └── routes.tsx                   # EXTEND: add ec2/* sub-routes
└── pages/
    └── ServiceHome.tsx              # EXTEND: redirect ec2 to /services/ec2/instances
```

### Pattern 1: Shared XML Parser Utility

The Phase 1 `counts.ts` uses inline DOMParser. With 12 resource types in Phase 2, extract a shared utility.

```typescript
// web/src/shared/api/xml.ts
// Source: Extended from Phase 1 counts.ts DOMParser pattern

export function parseXml(text: string): Document {
  return new DOMParser().parseFromString(text, 'application/xml')
}

export function getText(el: Element, tag: string): string {
  return el.getElementsByTagName(tag)[0]?.textContent ?? ''
}

export function getItems(doc: Document | Element, tag: string): Element[] {
  return Array.from(doc.getElementsByTagName(tag))
}

// Example resource parser (instances)
export interface Ec2Instance {
  instanceId: string
  instanceType: string
  state: string
  availabilityZone: string
  publicIpAddress: string
  privateIpAddress: string
  vpcId: string
  subnetId: string
  nameTag: string
  launchTime: string
  keyName: string
  imageId: string
  architecture: string
  platform: string
  securityGroups: Array<{ groupId: string; groupName: string }>
}

export function parseInstances(xml: string): Ec2Instance[] {
  const doc = parseXml(xml)
  const reservations = getItems(doc, 'reservationSet')[0]
  if (!reservations) return []
  const instanceEls = getItems(doc, 'instanceId')
    .map(el => el.closest('item'))
    .filter((el): el is Element => el !== null)
  return instanceEls.map(el => ({
    instanceId: getText(el, 'instanceId'),
    instanceType: getText(el, 'instanceType'),
    state: el.getElementsByTagName('instanceState')[0]
             ?.getElementsByTagName('name')[0]?.textContent ?? 'unknown',
    availabilityZone: el.getElementsByTagName('availabilityZone')[0]?.textContent ?? '',
    publicIpAddress: getText(el, 'publicIpAddress'),
    privateIpAddress: getText(el, 'privateIpAddress'),
    vpcId: getText(el, 'vpcId'),
    subnetId: getText(el, 'subnetId'),
    nameTag: '', // populated from <tagSet> parsing
    launchTime: getText(el, 'launchTime'),
    keyName: getText(el, 'keyName'),
    imageId: getText(el, 'imageId'),
    architecture: getText(el, 'architecture'),
    platform: getText(el, 'platform'),
    securityGroups: Array.from(
      el.getElementsByTagName('groupSet')[0]?.getElementsByTagName('item') ?? []
    ).map(sg => ({
      groupId: getText(sg, 'groupId'),
      groupName: getText(sg, 'groupName'),
    })),
  }))
}
```

**Note on `closest()` in jsdom:** DOMParser + `Element.closest()` works in jsdom (vitest test environment). [VERIFIED: used by Phase 1 tests, jsdom ships full DOM API]

### Pattern 2: EC2 Query Protocol POST

All EC2 actions use a consistent POST pattern:

```typescript
// Source: Extended from Phase 1 counts.ts (countEc2Instances pattern)
const ORIGIN = typeof window !== 'undefined' && window.location?.origin
  ? window.location.origin : ''

async function ec2Query(action: string, params: Record<string, string> = {}): Promise<string> {
  const body = new URLSearchParams({
    Action: action,
    Version: '2016-11-15',
    ...params,
  }).toString()
  return apiClient.post(`${ORIGIN}/`, {
    headers: {
      'Content-Type': 'application/x-www-form-urlencoded',
      Authorization: 'AWS4-HMAC-SHA256 Credential=test/20260407/us-east-1/ec2/aws4_request',
    },
    body,
  }).text()
}
```

**Critical:** For mutation actions (Start/Stop/Terminate/Create/Delete), the return value is XML confirming the action. After mutation, call `queryClient.invalidateQueries({ queryKey: ['ec2', resourceType] })` to refresh the table.

### Pattern 3: Resource Hook (TanStack Query)

```typescript
// web/src/services/ec2/api/instances.ts
export function useInstances() {
  return useQuery({
    queryKey: ['ec2', 'instances'],
    queryFn: async () => {
      const xml = await ec2Query('DescribeInstances')
      return parseInstances(xml)
    },
    staleTime: 30_000,
  })
}

export function useStartInstances() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (instanceIds: string[]) => {
      const params: Record<string, string> = {}
      instanceIds.forEach((id, i) => { params[`InstanceId.${i + 1}`] = id })
      return ec2Query('StartInstances', params)
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['ec2', 'instances'] })
    },
  })
}
```

### Pattern 4: Table with useCollection

```typescript
// Simplified excerpt — full component in InstancesTab.tsx
const { data: instances = [], isLoading, refetch } = useInstances()
const [preferences, setPreferences] = useState({ pageSize: 25 })
const [selectedItems, setSelectedItems] = useState<Ec2Instance[]>([])

const { items, collectionProps, filterProps, paginationProps } = useCollection(instances, {
  propertyFiltering: {
    filteringProperties: [
      { key: 'state', label: 'State', operators: ['=', '!='] },
      { key: 'instanceType', label: 'Instance type', operators: ['=', '!='] },
    ],
    empty: <Box>No instances</Box>,
    noMatch: <Box>No matches</Box>,
  },
  pagination: { pageSize: preferences.pageSize },
  sorting: {},
  selection: {},
})

<Table
  {...collectionProps}
  items={items}
  loading={isLoading}
  selectedItems={selectedItems}
  onSelectionChange={({ detail }) => setSelectedItems(detail.selectedItems)}
  selectionType="multi"
  columnDefinitions={INSTANCE_COLUMNS}
  filter={<PropertyFilter {...filterProps} filteringProperties={...} />}
  pagination={<Pagination {...paginationProps} />}
  preferences={<CollectionPreferences ... />}
  header={
    <Header
      counter={`(${instances.length})`}
      actions={<ActionBar selectedItems={selectedItems} onRefresh={refetch} />}
    >
      Instances
    </Header>
  }
/>
```

### Pattern 5: SplitPanel Detail View

AppLayout `splitPanel` prop receives the `<SplitPanel>` component. State lives in Zustand (splitPanelOpen, selectedResourceId) or local state scoped to the tab.

```typescript
// ConsoleShell.tsx must expose splitPanel + splitPanelOpen + onSplitPanelToggle props
// IMPORTANT: Phase 1 ConsoleShell.tsx does NOT wire splitPanel yet.
// Phase 2 Plan 1 must extend ConsoleShell to thread splitPanel props through AppLayout.

<AppLayout
  splitPanel={splitPanel}          // passed down from EC2 page
  splitPanelOpen={splitPanelOpen}
  onSplitPanelToggle={...}
  splitPanelSize={splitPanelSize}
  onSplitPanelResize={...}
  // ... existing props
/>
```

**Pitfall:** AppLayout must receive `splitPanel` as a prop from the parent, not from a child. The EC2 page renders inside `<Outlet />` — it cannot directly set AppLayout's `splitPanel` prop. Two valid approaches:

1. **Context approach (recommended):** Create `SplitPanelContext` that ConsoleShell reads. EC2 page sets context value (the SplitPanel element + open state). ConsoleShell reads context and passes to AppLayout. [ASSUMED — based on Cloudscape documentation pattern for nested split panel control]

2. **Route-specific layout:** Define an `Ec2Layout` route wrapper that renders its own AppLayout with splitPanel. Replace the generic ConsoleShell for EC2 routes. More explicit but duplicates AppLayout config.

The context approach is cleaner. ConsoleShell already manages `sidebarOpen` via Zustand — extend with split panel state.

### Pattern 6: Delete Confirmation Modal

```typescript
// DeleteModal.tsx
export function DeleteModal({ resourceId, onConfirm, onCancel }: Props) {
  const [confirmValue, setConfirmValue] = useState('')
  return (
    <Modal
      visible
      onDismiss={onCancel}
      header="Delete resource"
      footer={
        <SpaceBetween direction="horizontal" size="xs">
          <Button variant="link" onClick={onCancel}>Cancel</Button>
          <Button
            variant="primary"
            disabled={confirmValue !== resourceId}  // type-to-confirm
            onClick={onConfirm}
          >
            Delete
          </Button>
        </SpaceBetween>
      }
    >
      <Alert type="warning">This action cannot be undone.</Alert>
      <FormField label="Type the resource ID to confirm">
        <Input value={confirmValue} onChange={({ detail }) => setConfirmValue(detail.value)} />
      </FormField>
    </Modal>
  )
}
```

### Pattern 7: Route Extension for EC2

```typescript
// routes.tsx extension — add inside the children array
{
  path: 'services/ec2',
  element: withSuspense(lazy(() => import('../services/ec2/pages/Ec2Dashboard'))),
  children: [
    { index: true, element: <Navigate to="instances" replace /> },
    { path: 'instances', element: withSuspense(lazy(() => import('../services/ec2/pages/InstancesTab'))) },
    { path: 'vpcs', element: withSuspense(lazy(() => import('../services/ec2/pages/VpcsTab'))) },
    // ... etc for all 12 tabs
  ],
},
```

ServiceHome.tsx must detect `serviceKey === 'ec2'` and redirect to `/services/ec2/instances` instead of rendering the summary card. Or routes.tsx overrides the `services/:serviceKey` route for ec2 specifically with the more-specific `services/ec2` route (React Router matches most-specific first).

### Anti-Patterns to Avoid

- **Hand-rolling table pagination/sorting/filtering:** Never implement these manually. `useCollection` handles all three. Any custom filter loop will break PropertyFilter token logic.
- **One giant EC2 component:** Split by resource type. Each tab is a separate lazy-loaded component. The planner avoids a 1,000-line `Ec2Page.tsx`.
- **Inline XML parsing in hooks:** Extract to `xml.ts` utilities. Hooks call parsers; hooks do not build DOM.
- **Storing fetched data in Zustand:** TanStack Query owns all server state. Zustand owns only UI state (selected row, split panel open, active tab preference). Mixing causes stale data bugs.
- **Directly modifying AppLayout in child components:** Use context or prop threading. Child routes cannot reach up to AppLayout directly.

---

## EC2 Backend Actions (Verified)

[VERIFIED: ministack/services/ec2.py — line numbers confirmed]

| Resource Type | Read Action | Create Action | Delete Action | Phase 2 Scope |
|---------------|-------------|---------------|---------------|---------------|
| Instances | DescribeInstances (L314) | RunInstances (L256) | TerminateInstances (L345) | Full CRUD + Start/Stop/Reboot |
| VPCs | DescribeVpcs (L610) | CreateVpc | DeleteVpc | Full CRUD |
| Subnets | DescribeSubnets (L675) | CreateSubnet | DeleteSubnet | Full CRUD |
| Security Groups | DescribeSecurityGroups (L475) | CreateSecurityGroup | DeleteSecurityGroup | Full CRUD |
| Key Pairs | DescribeKeyPairs (L576) | CreateKeyPair | DeleteKeyPair | Full CRUD |
| EBS Volumes | DescribeVolumes (L1276) | CreateVolume | DeleteVolume | Full CRUD |
| Snapshots | DescribeSnapshots | CreateSnapshot | DeleteSnapshot | Full CRUD |
| Elastic IPs | DescribeAddresses (L1167) | AllocateAddress | ReleaseAddress | Full CRUD |
| Internet Gateways | DescribeInternetGateways | CreateInternetGateway | DeleteInternetGateway | Full CRUD |
| NAT Gateways | DescribeNatGateways (L1970) | CreateNatGateway | DeleteNatGateway | Full CRUD |
| Route Tables | DescribeRouteTables | — | — | List-only (D-12) |
| Network Interfaces | DescribeNetworkInterfaces | — | — | List-only (D-12) |

**Instance-specific actions:** StartInstances (L378), StopInstances (L362), RebootInstances (L394), DescribeImages (stub, 3 AMIs: Amazon Linux 2, Ubuntu 22.04, Windows Server 2022).

**Default resources (always present after backend import):**
- VPC: `vpc-00000001`, CIDR `172.31.0.0/16`
- Subnet: `subnet-00000001`, CIDR `172.31.0.0/20`
- Security Group: `sg-00000001` (default)
- Internet Gateway: `igw-00000001`
- Route Table: `rtb-00000001`

**RunInstances parameter handling:** ImageId (any string accepted), InstanceType, MinCount/MaxCount (defaults to 1), KeyName, SubnetId (defaults to `subnet-00000001`), `SecurityGroupId.1`, `SecurityGroupId.2`... (member list pattern).

---

## EC2 XML Response Structures (Key Fields)

[VERIFIED: ministack/services/ec2.py — `_instance_xml`, `_volume_inner_xml`, etc.]

### DescribeInstances Response (nested structure — critical)

```xml
<DescribeInstancesResponse>
  <reservationSet>
    <item>
      <reservationId>r-xxx</reservationId>
      <instancesSet>
        <item>
          <instanceId>i-xxx</instanceId>
          <imageId>ami-xxx</imageId>
          <instanceType>t2.micro</instanceType>
          <instanceState>
            <code>16</code>
            <name>running</name>   <!-- KEY: parse name, not code -->
          </instanceState>
          <placement>
            <availabilityZone>us-east-1a</availabilityZone>
          </placement>
          <publicIpAddress>54.x.x.x</publicIpAddress>
          <privateIpAddress>10.0.x.x</privateIpAddress>
          <vpcId>vpc-xxx</vpcId>
          <subnetId>subnet-xxx</subnetId>
          <keyName>my-key</keyName>
          <launchTime>1234567890.0</launchTime>
          <architecture>x86_64</architecture>
          <groupSet>
            <item><groupId>sg-xxx</groupId><groupName>default</groupName></item>
          </groupSet>
          <tagSet>
            <item><key>Name</key><value>my-instance</value></item>
          </tagSet>
        </item>
      </instancesSet>
    </item>
  </reservationSet>
</DescribeInstancesResponse>
```

**Parsing pitfall:** `instancesSet > item` elements are nested inside `reservationSet > item`. Using `doc.getElementsByTagName('instanceId')` works but `closest('item')` must navigate UP to the instance-level `<item>`, not the reservation-level one. Use `el.parentElement` traversal or tag-specific queries to avoid ambiguity.

**Tag lookup pitfall:** `<groupSet>` and `<tagSet>` are NESTED inside the instance item. `doc.getElementsByTagName('groupSet')` returns ALL groupSets in the document. Always query from the specific instance element, not from the document root.

### DescribeVpcs / DescribeSubnets (flat structure — simpler)

```xml
<DescribeVpcsResponse>
  <vpcSet>
    <item>
      <vpcId>vpc-xxx</vpcId>
      <cidrBlock>172.31.0.0/16</cidrBlock>
      <state>available</state>
      <isDefault>true</isDefault>
      <dhcpOptionsId>dopt-xxx</dhcpOptionsId>
      <instanceTenancy>default</instanceTenancy>
    </item>
  </vpcSet>
</DescribeVpcsResponse>
```

Flat structure — `getItems(doc, 'item')` safe to use directly.

---

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| Table pagination | Custom page slice logic | `useCollection` from `@cloudscape-design/collection-hooks` | PropertyFilter token state is entangled with pagination offset; manual sync is fragile |
| Table sorting | `[...items].sort(...)` in render | `useCollection` sorting config | Sort comparators for nested values (e.g. `item.state`) need null-safety; `useCollection` handles it |
| Structured filter parsing | Token parser | `useCollection` with `propertyFiltering` config | Cloudscape PropertyFilter's token format is opaque; only `useCollection` understands it |
| XML parsing | String regex or `split('<tag>')` | `DOMParser` + element traversal | Regex breaks on CDATA, namespaces, attribute variations |
| Confirmation dialogs | Custom confirm component | Cloudscape `Modal` + `Input` | Accessibility focus trap, keyboard handling, ARIA labels all provided |
| Flashbar notifications | Custom toast | Cloudscape `Flashbar` | Already established pattern in UI-SPEC; Cloudscape handles stacking and dismiss |
| Multi-member list params | Manual URLSearchParams loop | Helper function `addMemberList(params, 'InstanceId', ids)` | EC2 Query protocol indexes from 1, not 0: `InstanceId.1`, `InstanceId.2`, etc. |

**Key insight:** The `useCollection` hook is the most dangerous area to hand-roll. PropertyFilter's token format (`{ propertyKey, value, operator }[]`) integrates only through `useCollection`. Any manual implementation will silently break when users combine tokens.

---

## Common Pitfalls

### Pitfall 1: SplitPanel Cannot Be Set from Child Routes

**What goes wrong:** EC2 tab component tries to render `<SplitPanel>` and set it on AppLayout, but AppLayout is in ConsoleShell — the tab component is a grandchild rendered inside `<Outlet />`.

**Why it happens:** React rendering flows top-down. Children cannot inject props into ancestor components.

**How to avoid:** Create a `SplitPanelContext` in ConsoleShell. EC2 pages call `useSplitPanel()` context hook to set the panel content and open state. ConsoleShell reads context and passes to AppLayout. [ASSUMED — standard React context pattern]

**Warning signs:** TypeScript error "splitPanel is not a prop of Outlet" or panel never renders.

### Pitfall 2: getElementsByTagName Leaks Across Nested XML

**What goes wrong:** `doc.getElementsByTagName('item')` returns ALL `<item>` elements including deeply nested ones (e.g., reservation items AND instance items AND security group items all named `<item>`).

**Why it happens:** EC2 XML reuses the generic `<item>` tag for every list element. `getElementsByTagName` searches the entire subtree.

**How to avoid:** Query from a specific parent element, not from `doc`:
```typescript
// WRONG:
const items = doc.getElementsByTagName('item') // returns everything

// CORRECT:
const instanceSet = doc.getElementsByTagName('instancesSet')[0]
const items = instanceSet?.getElementsByTagName('item') ?? []
```

**Warning signs:** Instance count is 3x expected value; security group IDs appear as instance IDs.

### Pitfall 3: useCollection with Empty Data Array

**What goes wrong:** Passing `undefined` or `null` to `useCollection(data, config)` when TanStack Query returns `undefined` before fetch completes crashes the hook.

**Why it happens:** `useCollection` expects an array, not undefined.

**How to avoid:**
```typescript
const { data: instances = [] } = useInstances()  // default to []
const { items } = useCollection(instances, config)
```

**Warning signs:** Runtime error "Cannot read properties of undefined (reading 'length')" in collection hook.

### Pitfall 4: EC2 Member List Parameter Indexing

**What goes wrong:** `InstanceId.0=i-xxx` is ignored by the backend. The EC2 Query protocol indexes from 1.

**Why it happens:** AWS spec uses 1-based indexing for member list parameters.

**How to avoid:**
```typescript
function addMemberList(params: Record<string, string>, key: string, ids: string[]) {
  ids.forEach((id, i) => { params[`${key}.${i + 1}`] = id })
}
// Usage:
addMemberList(params, 'InstanceId', selectedIds)
addMemberList(params, 'SecurityGroupId', sgIds)
```

**Warning signs:** Action succeeds but affects no instances; backend logs show empty ids list.

### Pitfall 5: Route Conflict Between `services/ec2` and `services/:serviceKey`

**What goes wrong:** Adding `services/ec2` route after `services/:serviceKey` in `routes.tsx` causes React Router to match the wildcard first for `/services/ec2`.

**Why it happens:** React Router 7 matches routes in definition order when both patterns match.

**How to avoid:** Place the more-specific `services/ec2` route BEFORE `services/:serviceKey` in the routes array, or use a nested route structure where ec2's dashboard replaces the ServiceHome outlet.

**Warning signs:** `/services/ec2/instances` renders ServiceHome (count card) instead of EC2 Dashboard.

### Pitfall 6: SplitPanel Size State Not Persisted Correctly

**What goes wrong:** Split panel collapses to zero height every time the tab changes because splitPanelSize state lives inside InstancesTab and resets on unmount.

**Why it happens:** Each tab is a separate component; unmounting resets local state.

**How to avoid:** Store `splitPanelSize` in Zustand `uiStore` (or in ConsoleShell's SplitPanelContext) so it persists across tab navigation.

### Pitfall 7: StateIndicator `type` Prop Values

**What goes wrong:** Passing `type="stopped"` throws a runtime prop type warning — "stopped" is not a valid `StatusIndicator` type.

**Why it happens:** Cloudscape StatusIndicator types are: `success`, `warning`, `error`, `info`, `stopped`, `in-progress`, `pending`, `loading`. "stopped" IS valid but check against actual component types, not AWS state names.

**How to avoid:** Build a `stateToIndicatorType` map once:
```typescript
const EC2_STATE_MAP: Record<string, StatusIndicatorProps.Type> = {
  running: 'success',
  stopped: 'warning',
  terminated: 'error',
  pending: 'in-progress',
  'shutting-down': 'in-progress',
  stopping: 'in-progress',
  rebooting: 'in-progress',
}
```

**Note:** The UI-SPEC says `stopped` state = `warning` type (amber). `stopped` is also a valid StatusIndicator type but produces a grey icon. Use `warning` for stopped instances to get amber/yellow. [VERIFIED: UI-SPEC §Status Indicator Color Map]

---

## Code Examples

### EC2 Query Helper

```typescript
// web/src/services/ec2/api/ec2Client.ts
import { apiClient } from '../../../shared/api/client'

const ORIGIN = typeof window !== 'undefined' && window.location?.origin
  ? window.location.origin : ''

export async function ec2Query(
  action: string,
  params: Record<string, string> = {}
): Promise<string> {
  const body = new URLSearchParams({
    Action: action,
    Version: '2016-11-15',
    ...params,
  }).toString()
  return apiClient.post(`${ORIGIN}/`, {
    headers: {
      'Content-Type': 'application/x-www-form-urlencoded',
      Authorization: 'AWS4-HMAC-SHA256 Credential=test/20260407/us-east-1/ec2/aws4_request',
    },
    body,
  }).text()
}

export function addMemberList(
  params: Record<string, string>,
  key: string,
  ids: string[]
): void {
  ids.forEach((id, i) => { params[`${key}.${i + 1}`] = id })
}
```

### Instance Column Definitions

```typescript
// Source: UI-SPEC §"Table Contract" + D-02
import type { TableProps } from '@cloudscape-design/components/table'
import StatusIndicator from '@cloudscape-design/components/status-indicator'
import type { Ec2Instance } from '../api/instances'

export const INSTANCE_COLUMNS: TableProps.ColumnDefinition<Ec2Instance>[] = [
  {
    id: 'name',
    header: 'Name',
    cell: (item) => item.nameTag || '—',
    sortingField: 'nameTag',
    isRowHeader: true,
  },
  {
    id: 'instanceId',
    header: 'Instance ID',
    cell: (item) => item.instanceId,
    sortingField: 'instanceId',
  },
  {
    id: 'state',
    header: 'Instance state',
    cell: (item) => (
      <StatusIndicator type={EC2_STATE_MAP[item.state] ?? 'info'}>
        {item.state}
      </StatusIndicator>
    ),
    sortingField: 'state',
  },
  {
    id: 'instanceType',
    header: 'Instance type',
    cell: (item) => item.instanceType,
    sortingField: 'instanceType',
  },
  {
    id: 'az',
    header: 'Availability zone',
    cell: (item) => item.availabilityZone,
    sortingField: 'availabilityZone',
  },
  {
    id: 'publicIp',
    header: 'Public IPv4',
    cell: (item) => item.publicIpAddress || '—',
    sortingField: 'publicIpAddress',
  },
]
```

---

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| Manual pagination logic | `useCollection` from collection-hooks | Collection hooks package release | Zero hand-rolled pagination/sort/filter |
| Separate filter + sort state | Single `useCollection` call | Phase 2 onward | One source of truth for all table state |
| Raw AppLayout (Phase 1) | AppLayout + SplitPanel (Phase 2) | This phase | ConsoleShell must be extended to thread splitPanel props |

---

## Assumptions Log

| # | Claim | Section | Risk if Wrong |
|---|-------|---------|---------------|
| A1 | SplitPanel context pattern is the correct approach for threading panel state from child routes to ConsoleShell's AppLayout | §"Architecture Patterns, Pattern 5" | If wrong: need route-specific layout wrapper instead; adds one extra component per service but is equivalent in correctness |
| A2 | `EC2_STATE_MAP` status "stopped" should use StatusIndicator type `"warning"` (amber) not `"stopped"` (grey) | §"Common Pitfalls, Pitfall 7" | If wrong: stopped instances appear grey not amber — contradicts UI-SPEC |

---

## Open Questions

1. **ServiceHome redirect for EC2**
   - What we know: `routes.tsx` has `services/:serviceKey` matching all services including ec2. A more-specific `services/ec2` route must override it for EC2.
   - What's unclear: Should the `services/ec2` route completely replace `services/:serviceKey` for ec2, or should ServiceHome detect `serviceKey === 'ec2'` and render a redirect link instead of the summary card?
   - Recommendation: Use a more-specific route `services/ec2` placed before `services/:serviceKey`. React Router 7 matches more-specific static segments before wildcards. This avoids conditional logic in ServiceHome.

2. **Copy strings for EC2 actions**
   - What we know: `web/src/shared/copy.ts` centralizes all user-facing strings (Phase 1 pattern).
   - What's unclear: Phase 2 adds ~50 new strings (tab labels, action button labels, form field labels, error messages). Should they go in `copy.ts` or in a service-scoped `ec2/copy.ts`?
   - Recommendation: Create `web/src/services/ec2/copy.ts` for EC2-specific strings. Keep `shared/copy.ts` for shell-level strings only. Scales better when S3/Lambda add their own copy files.

---

## Environment Availability

Step 2.6: All tools used in Phase 2 are pure frontend (TypeScript/React). No external CLI tools, databases, or services are required beyond the already-running MiniStack backend. The vitest test environment (jsdom) is confirmed working. No environment audit needed.

---

## Validation Architecture

### Test Framework

| Property | Value |
|----------|-------|
| Framework | Vitest 3.2.4 + React Testing Library + MSW |
| Config file | `web/vite.config.ts` (test section, lines 29-41) |
| Quick run command | `npm run --prefix web test -- --run` |
| Full suite command | `npm run --prefix web test -- --run` |

**Current baseline:** 8 test files, 16 tests, 100% passing. [VERIFIED: npm test run]

### Phase Requirements → Test Map

| Req ID | Behavior | Test Type | Automated Command | File Exists? |
|--------|----------|-----------|-------------------|-------------|
| EC2-01 | StatusIndicator shows `success` for `running`, `warning` for `stopped`, `error` for `terminated` | unit | `npm run --prefix web test -- --run src/services/ec2` | ❌ Wave 0 |
| EC2-02 | StartInstances/StopInstances/TerminateInstances/RebootInstances POSTs correct Action and refreshes table | unit | `npm run --prefix web test -- --run` | ❌ Wave 0 |
| EC2-03 | DescribeVpcs/Subnets/SGs/KeyPairs responses are parsed and rendered in table | unit | `npm run --prefix web test -- --run` | ❌ Wave 0 |
| EC2-04 | CreateVolume/DeleteVolume/CreateSnapshot/DeleteSnapshot fire correct action and invalidate query | unit | `npm run --prefix web test -- --run` | ❌ Wave 0 |
| EC2-05 | AllocateAddress/ReleaseAddress/CreateNatGateway/DeleteNatGateway/CreateIGW/DeleteIGW tested | unit | `npm run --prefix web test -- --run` | ❌ Wave 0 |
| EC2-06 | Wizard renders 4 steps; dropdowns populated from DescribeImages/DescribeVpcs/DescribeSubnets/DescribeSGs; RunInstances called on submit | unit | `npm run --prefix web test -- --run` | ❌ Wave 0 |
| CRUD-01 | Table shows all items; PropertyFilter token `state = running` filters to running items; page size 10/25/50 works | unit | `npm run --prefix web test -- --run` | ❌ Wave 0 |
| CRUD-02 | Clicking a table row opens SplitPanel with resource attributes | unit | `npm run --prefix web test -- --run` | ❌ Wave 0 |
| CRUD-03 | Create modal form opens; submit fires correct Create action; modal closes on success | unit | `npm run --prefix web test -- --run` | ❌ Wave 0 |
| CRUD-04 | Delete modal requires typed resource ID; confirm button disabled until ID matches | unit | `npm run --prefix web test -- --run` | ❌ Wave 0 |
| CRUD-05 | Start/Stop disabled when instance already in target state; Terminate enabled for running/stopped | unit | `npm run --prefix web test -- --run` | ❌ Wave 0 |
| CRUD-06 | Refresh button calls `queryClient.invalidateQueries`; table re-fetches after action | unit | `npm run --prefix web test -- --run` | ❌ Wave 0 |

### Sampling Rate

- **Per task commit:** `npm run --prefix web test -- --run`
- **Per wave merge:** `npm run --prefix web test -- --run` (full suite)
- **Phase gate:** Full suite green + 0 TypeScript errors (`npm run --prefix web build`) before `/gsd-verify-work`

### Wave 0 Gaps

All Phase 2 test files are new. The existing test infrastructure (`renderWithProviders`, `mswServer`, `setupMswForTest`, `makeTestQueryClient`) is reusable — no new test utilities needed.

- [ ] `web/src/services/ec2/__tests__/xml.test.ts` — Unit tests for xml.ts parser functions (parseInstances, parseVpcs, etc.)
- [ ] `web/src/services/ec2/__tests__/InstancesTab.test.tsx` — Table render, StatusIndicator, action buttons, refresh
- [ ] `web/src/services/ec2/__tests__/VpcsTab.test.tsx` — VPC list, create modal, delete modal
- [ ] `web/src/services/ec2/__tests__/SubnetsTab.test.tsx`
- [ ] `web/src/services/ec2/__tests__/SecurityGroupsTab.test.tsx`
- [ ] `web/src/services/ec2/__tests__/KeyPairsTab.test.tsx`
- [ ] `web/src/services/ec2/__tests__/VolumesTab.test.tsx`
- [ ] `web/src/services/ec2/__tests__/SnapshotsTab.test.tsx`
- [ ] `web/src/services/ec2/__tests__/ElasticIpsTab.test.tsx`
- [ ] `web/src/services/ec2/__tests__/GatewaysTab.test.tsx` — IGW + NAT GW
- [ ] `web/src/services/ec2/__tests__/InstanceWizard.test.tsx` — 4-step wizard
- [ ] `web/src/services/ec2/__tests__/DeleteModal.test.tsx` — type-to-confirm logic

---

## Security Domain

> `security_enforcement` is not set to `false` in config.json — included per protocol.

### Applicable ASVS Categories

| ASVS Category | Applies | Standard Control |
|---------------|---------|-----------------|
| V2 Authentication | No | Local dev tool, no auth (out of scope per REQUIREMENTS.md) |
| V3 Session Management | No | Local dev tool, no sessions |
| V4 Access Control | No | Local dev tool, single-user |
| V5 Input Validation | Yes | CIDR block format in VPC/subnet create forms; resource name constraints. Use HTML5 `pattern` attr or simple regex in form validation before submit. |
| V6 Cryptography | No | No secrets handled in UI |

### Known Threat Patterns for {stack}

| Pattern | STRIDE | Standard Mitigation |
|---------|--------|---------------------|
| XSS via resource names/tags displayed in table | Tampering | Cloudscape component renders via React — all string values are auto-escaped. Never use `dangerouslySetInnerHTML`. |
| CIDR injection via VPC create form | Tampering | Validate CIDR format with regex before submitting (`/^(\d{1,3}\.){3}\d{1,3}\/\d{1,2}$/`) |

> Risk is minimal: MiniStack is a local developer tool with no production deployment or multi-user exposure.

---

## Sources

### Primary (HIGH confidence)
- `ministack/services/ec2.py` — EC2 backend action map, XML response shapes, default resources [VERIFIED: direct file inspection]
- `web/node_modules/@cloudscape-design/collection-hooks/cjs/index.js` — exports `useCollection` only [VERIFIED: node inspection]
- `web/vite.config.ts` — test configuration, vitest include/exclude patterns [VERIFIED: direct file read]
- Phase 1 artifacts (`counts.ts`, `client.ts`, `ConsoleShell.tsx`, `routes.tsx`, `uiStore.ts`) — established patterns [VERIFIED: direct file reads]
- `npm test` run — 16 tests passing [VERIFIED: executed]

### Secondary (MEDIUM confidence)
- `02-UI-SPEC.md` (Phase 2) — Cloudscape component inventory, column definitions, status indicator map, spacing tokens [VERIFIED: direct file read — approved spec]
- `02-CONTEXT.md` — Decision set D-01 through D-16 [VERIFIED: direct file read]

### Tertiary (LOW confidence)
- SplitPanel context threading pattern — standard React pattern, not verified with live Cloudscape code [ASSUMED]

---

## Metadata

**Confidence breakdown:**
- EC2 backend actions: HIGH — directly verified in ec2.py
- Standard stack: HIGH — all packages already installed and version-verified
- Architecture patterns: HIGH — extended from verified Phase 1 patterns
- SplitPanel threading: MEDIUM/ASSUMED — standard React context approach; verified at design level not runtime
- Pitfalls: HIGH — derived directly from codebase inspection and XML structure review

**Research date:** 2026-04-10
**Valid until:** 2026-05-10 (stable Cloudscape + stable backend — no fast-moving dependencies)
