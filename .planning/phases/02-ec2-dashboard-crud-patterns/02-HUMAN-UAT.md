---
status: partial
phase: 02-ec2-dashboard-crud-patterns
source: [02-VERIFICATION.md]
started: 2026-04-15T18:00:00+09:00
updated: 2026-04-15T18:00:00+09:00
---

## Current Test

[awaiting human testing]

## Tests

### 1. EC2 dashboard renders and tab navigation works
expected: 12 tabs visible, URL syncs with tab selection, no layout breaks
result: [pending]

### 2. Instance state indicators and actions end-to-end
expected: Color-coded status (green/yellow/red), start/stop/terminate/reboot work via action buttons, state changes reflected
result: [pending]

### 3. Instance launch wizard with live API dropdowns
expected: 4-step wizard, VPC/subnet/SG dropdowns populated from API, subnet/SG filter by selected VPC
result: [pending]

### 4. VPC CRUD flow
expected: Create VPC modal with CIDR validation, type-to-confirm delete, detail SplitPanel with tabs
result: [pending]

### 5. Route Tables and Network Interfaces as list-only
expected: No Create/Delete buttons visible, TextFilter (not PropertyFilter), list and detail only
result: [pending]

## Summary

total: 5
passed: 0
issues: 0
pending: 5
skipped: 0
blocked: 0

## Gaps
