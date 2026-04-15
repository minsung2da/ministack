---
phase: 02-ec2-dashboard-crud-patterns
reviewed: 2026-04-15T00:00:00Z
depth: standard
files_reviewed: 41
files_reviewed_list:
  - web/src/shared/api/xml.ts
  - web/src/shared/copy.ts
  - web/src/stores/uiStore.ts
  - web/src/contexts/SplitPanelContext.tsx
  - web/src/app/ConsoleShell.tsx
  - web/src/app/routes.tsx
  - web/src/services/ec2/api/ec2Client.ts
  - web/src/services/ec2/api/types.ts
  - web/src/services/ec2/api/instances.ts
  - web/src/services/ec2/api/vpcs.ts
  - web/src/services/ec2/api/subnets.ts
  - web/src/services/ec2/api/securityGroups.ts
  - web/src/services/ec2/api/keyPairs.ts
  - web/src/services/ec2/api/volumes.ts
  - web/src/services/ec2/api/snapshots.ts
  - web/src/services/ec2/api/elasticIps.ts
  - web/src/services/ec2/api/internetGateways.ts
  - web/src/services/ec2/api/natGateways.ts
  - web/src/services/ec2/api/routeTables.ts
  - web/src/services/ec2/api/networkInterfaces.ts
  - web/src/services/ec2/api/images.ts
  - web/src/services/ec2/components/ResourceTable.tsx
  - web/src/services/ec2/components/StatusBadge.tsx
  - web/src/services/ec2/components/DeleteModal.tsx
  - web/src/services/ec2/components/CreateModal.tsx
  - web/src/services/ec2/components/SplitPanelDetail.tsx
  - web/src/services/ec2/components/FlashNotifications.tsx
  - web/src/services/ec2/pages/Ec2Dashboard.tsx
  - web/src/services/ec2/pages/InstancesTab.tsx
  - web/src/services/ec2/pages/InstanceWizard.tsx
  - web/src/services/ec2/pages/VpcsTab.tsx
  - web/src/services/ec2/pages/SubnetsTab.tsx
  - web/src/services/ec2/pages/SecurityGroupsTab.tsx
  - web/src/services/ec2/pages/KeyPairsTab.tsx
  - web/src/services/ec2/pages/VolumesTab.tsx
  - web/src/services/ec2/pages/SnapshotsTab.tsx
  - web/src/services/ec2/pages/ElasticIpsTab.tsx
  - web/src/services/ec2/pages/InternetGatewaysTab.tsx
  - web/src/services/ec2/pages/NatGatewaysTab.tsx
  - web/src/services/ec2/pages/RouteTablesTab.tsx
  - web/src/services/ec2/pages/NetworkInterfacesTab.tsx
findings:
  critical: 0
  warning: 6
  info: 5
  total: 11
status: issues_found
---

# Phase 02: Code Review Report

**Reviewed:** 2026-04-15
**Depth:** standard
**Files Reviewed:** 41
**Status:** issues_found

## Summary

This phase implements a full EC2 dashboard with 12 resource tabs, shared components, and an XML-based API layer. The architecture is consistent and well-structured. The XML parsing approach is safe and scoped correctly. State management, TanStack Query patterns, and Cloudscape usage are all correct. No critical security issues were found.

Six warnings were identified — four are logic bugs that will produce incorrect runtime behavior (stale SplitPanel content, incorrect mutation dependency in `useCallback`, a `setTimeout` leak in flash notifications, and a misleading loading state in the snapshot volume selector). Two more are edge cases that affect UX correctness. Five info items cover dead code, minor type casts, and a hardcoded constant.

## Warnings

### WR-01: SplitPanel shows stale data after row click on already-selected row

**File:** `web/src/services/ec2/pages/InstancesTab.tsx:361-368`
**Issue:** `handleRowClick` calls `setPanel` with a JSX element that closes over the `instance` value at the time of the click. If the TanStack Query cache refreshes in the background (stale time is 30 s, window-focus refetch is on), the SplitPanel will continue to show the old snapshot of the instance. The same pattern applies to all 10 other tabs that use `SplitPanelDetail`. This is not a crash but will show visually stale data without any indication to the user.
**Fix:** Pass only the resource ID to the split panel context, and look up the live resource from the cached data array inside the panel component. Alternatively, pass a selector function:
```tsx
// Instead of closing over `instance` at click time:
const handleRowClick = useCallback(
  (instance: Ec2Instance) => {
    setPanel(
      <InstanceDetailPanel instanceId={instance.instanceId} />,
      instance.instanceId,
    )
  },
  [setPanel],
)

// InstanceDetailPanel reads from live query data:
function InstanceDetailPanel({ instanceId }: { instanceId: string }) {
  const { data: instances = [] } = useInstances()
  const instance = instances.find((i) => i.instanceId === instanceId)
  if (!instance) return null
  // ... render
}
```

---

### WR-02: `handleActionDropdown` dependency array is missing mutation handlers

**File:** `web/src/services/ec2/pages/InstancesTab.tsx:397-415`
**Issue:** The `useCallback` dependency array at line 414 is `[handleStart, handleStop, handleReboot]` but `handleTerminate` (which sets `terminateModalVisible`) is triggered inside the same switch. The `terminate` case calls `setTerminateModalVisible(true)` directly — that is fine since `setState` is stable. However the bigger issue is that `handleStart`, `handleStop`, and `handleReboot` are themselves `useCallback` functions that capture `addSuccess` and `addError`. If those change identity (they are `useCallback` with `[removeItem]` dep), `handleActionDropdown` will hold a stale reference. The current code happens to work in practice because the closure chain is short, but the dependency array is technically incomplete and will cause lint warnings. The `handleTerminate` case is also silently omitted from the `switch`'s `default` which means an unexpected `id` is silently ignored.
**Fix:**
```tsx
const handleActionDropdown = useCallback(
  async ({ detail }: { detail: { id: string } }) => {
    switch (detail.id) {
      case 'start':  await handleStart(); break
      case 'stop':   await handleStop(); break
      case 'reboot': await handleReboot(); break
      case 'terminate': setTerminateModalVisible(true); break
      default: break
    }
  },
  [handleStart, handleStop, handleReboot], // setTerminateModalVisible is stable; no change needed there
)
```
The missing `terminate` case in the `switch` should be added explicitly (it currently falls through silently — the modal never opens via keyboard action).

---

### WR-03: `setTimeout` in `addSuccess` leaks when component unmounts

**File:** `web/src/services/ec2/components/FlashNotifications.tsx:40`
**Issue:** `setTimeout(() => removeItem(id), 5000)` is called inside `addSuccess` but the timer ID is never stored and never cancelled. If the component that owns the `useFlashNotifications` hook unmounts before 5 000 ms have elapsed (e.g., user navigates to another tab), the timeout fires and calls `removeItem` (which calls `setItems`) on an unmounted component. In React 18 strict mode this will produce a "Warning: Can't perform a React state update on an unmounted component" (or silently fail in production). It also holds a stale closure reference to `removeItem`.
**Fix:**
```tsx
const addSuccess = useCallback(
  (message: string) => {
    const id = generateId()
    const newItem: FlashItem = { /* ... */ }
    setItems((prev) => {
      const trimmed = prev.length >= 3 ? prev.slice(1) : prev
      return [...trimmed, newItem]
    })
    const timerId = setTimeout(() => removeItem(id), 5000)
    // store timerId in a ref and clear on unmount — see below
  },
  [removeItem],
)

// In the hook body, collect timers:
const timersRef = useRef<ReturnType<typeof setTimeout>[]>([])
useEffect(() => {
  return () => { timersRef.current.forEach(clearTimeout) }
}, [])
```

---

### WR-04: Volume `size` validation allows string "08" (octal-like) to pass as 8

**File:** `web/src/services/ec2/pages/VolumesTab.tsx:225`
**Issue:** The validation is `String(sizeNum) !== createSize.trim()`. This correctly rejects "8.5" and "abc", but the trim comparison `String(parseInt("08", 10)) === "8" !== "08"` would **reject** "08" with an error message even though 8 is a valid size. The user types "08", `parseInt("08", 10)` returns `8`, `String(8)` is `"8"`, which does not equal `"08"`, so validation fails with "Size must be an integer between 1 and 16384." This is a false negative that confuses users who type leading zeros.
**Fix:**
```tsx
const sizeNum = parseInt(createSize.trim(), 10)
const isValid = !isNaN(sizeNum) && sizeNum >= 1 && sizeNum <= 16384 &&
  /^\d+$/.test(createSize.trim()) // digits only, no sign/decimal/leading-zero
if (!isValid) {
  setCreateSizeError('Size must be a whole number between 1 and 16,384.')
  valid = false
}
```

---

### WR-05: Snapshot `statusType="loading"` when volumes array is empty — always loading if no volumes exist

**File:** `web/src/services/ec2/pages/SnapshotsTab.tsx:292`
**Issue:** `statusType={volumes.length === 0 ? 'loading' : 'finished'}` shows a permanent spinner if the account has no EBS volumes (which is a valid state). Users cannot distinguish between "still fetching" and "genuinely no volumes". They see an infinite spinner with no empty state.
**Fix:** Use the query's own loading state:
```tsx
const { data: volumes = [], isLoading: volumesLoading } = useVolumes()
// ...
statusType={volumesLoading ? 'loading' : 'finished'}
empty="No volumes available. Create a volume first."
```

---

### WR-06: CIDR regex accepts invalid octets (e.g. 999.999.999.999/32)

**File:** `web/src/services/ec2/pages/VpcsTab.tsx:39`, `web/src/services/ec2/pages/SubnetsTab.tsx:40`
**Issue:** `CIDR_REGEX = /^(\d{1,3}\.){3}\d{1,3}\/\d{1,2}$/` accepts `999.999.999.999/99`. While the backend (MiniStack) will reject these values with an API error, the UI shows a green validation state for invalid input, and the error displayed is the raw API error string rather than the friendly validation message. For a local dev tool this is low severity but it is a logic error — the validation claim is false.
**Fix:**
```ts
const CIDR_REGEX =
  /^(25[0-5]|2[0-4]\d|1\d{2}|[1-9]\d|\d)\.(25[0-5]|2[0-4]\d|1\d{2}|[1-9]\d|\d)\.(25[0-5]|2[0-4]\d|1\d{2}|[1-9]\d|\d)\.(25[0-5]|2[0-4]\d|1\d{2}|[1-9]\d|\d)\/(3[0-2]|[12]\d|\d)$/
```

---

## Info

### IN-01: `SplitPanelDetail` `header` prop is declared but never used

**File:** `web/src/services/ec2/components/SplitPanelDetail.tsx:17-26`
**Issue:** `SplitPanelDetailProps` declares a `header: string` field, but the component body never renders it — it only renders `tabs` or `keyValueItems`. Every caller already passes the header string directly to `useSplitPanel().setPanel(content, header)` as the second argument. The prop is dead.
**Fix:** Remove `header` from `SplitPanelDetailProps` and the destructured parameter:
```tsx
type SplitPanelDetailProps = {
  tabs?: TabItem[]
  keyValueItems?: KeyValueItem[]
}

export function SplitPanelDetail({ tabs, keyValueItems }: SplitPanelDetailProps) {
```

---

### IN-02: `ec2Client.ts` `addMemberList` mutates caller-owned param — violates immutability convention

**File:** `web/src/services/ec2/api/ec2Client.ts:51-59`
**Issue:** The JSDoc explicitly states "Mutates `params` in place — callers own the object." The project's coding-style rule states "NEVER mutate". While all callers do own the object they pass in, this is a pattern inconsistency that could cause subtle bugs if a caller reuses the `params` object.
**Fix:**
```ts
export function addMemberList(
  params: Record<string, string>,
  key: string,
  ids: string[],
): Record<string, string> {
  return ids.reduce((acc, id, i) => ({ ...acc, [`${key}.${i + 1}`]: id }), { ...params })
}
```
Update all callers to use the return value.

---

### IN-03: `DEFAULT_AMI` is a hardcoded magic string in `InstanceWizard`

**File:** `web/src/services/ec2/pages/InstanceWizard.tsx:55`
**Issue:** `const DEFAULT_AMI = 'ami-00000000000000001'` is hardcoded. If MiniStack's default AMI ID changes (or if the emulator returns a different ID), launch will fail silently — the wizard submits the hardcoded ID with no fallback. The `useImages` hook exists and is imported in `images.ts` but is not used in the wizard.
**Fix:** Either surface an AMI selection field in Step 1, or call `useImages()` and use `images[0]?.imageId ?? DEFAULT_AMI` as the fallback. The current approach is acceptable for a local dev tool but the magic string should at minimum be documented with a comment explaining why it is safe.

---

### IN-04: `getAllItemsFromSet` is an unused re-export alias

**File:** `web/src/shared/api/xml.ts:39-41`
**Issue:** `getAllItemsFromSet` is identical to `getItems` and is exported but not imported by any file in the reviewed set. It adds API surface without value.
**Fix:** Remove the alias or, if it is used by future modules, keep it with a note.

---

### IN-05: Hardcoded AZ list in `SubnetsTab` and `VolumesTab` will not reflect emulator-reported AZs

**File:** `web/src/services/ec2/pages/SubnetsTab.tsx:46-50`, `web/src/services/ec2/pages/VolumesTab.tsx:47-55`
**Issue:** Both files hardcode a static list of AZs (`us-east-1a` through `us-east-1d` / `us-west-2*` / `eu-west-1*`). `VolumesTab` includes cross-region AZs (`us-west-2a`, `eu-west-1a`) which will never be valid in a single-region local emulator. If the user selects these, the API will reject the request.
**Fix:** Add a `useAvailabilityZones` hook that calls `DescribeAvailabilityZones` and populates the list dynamically, falling back to `us-east-1a` through `us-east-1d` if the call fails.

---

_Reviewed: 2026-04-15_
_Reviewer: Claude (gsd-code-reviewer)_
_Depth: standard_
