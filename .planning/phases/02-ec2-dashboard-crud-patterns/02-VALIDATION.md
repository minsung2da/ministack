---
phase: 02
slug: ec2-dashboard-crud-patterns
status: draft
nyquist_compliant: true
wave_0_complete: true
created: 2026-04-10
---

# Phase 02 — Validation Strategy

> Per-phase validation contract for feedback sampling during execution.

---

## Test Infrastructure

| Property | Value |
|----------|-------|
| **Framework** | vitest 3.x (unit/component) + Playwright (E2E) |
| **Config file** | `web/vitest.config.ts`, `web/playwright.config.ts` |
| **Quick run command** | `cd web && npx vitest run --reporter=verbose` |
| **Full suite command** | `cd web && npx vitest run --reporter=verbose && npx playwright test` |
| **Estimated runtime** | ~15 seconds (unit), ~30 seconds (E2E) |

---

## Sampling Rate

- **After every task commit:** Run `cd web && npx vitest run --reporter=verbose`
- **After every plan wave:** Run `cd web && npx vitest run --reporter=verbose && npx playwright test`
- **Before `/gsd-verify-work`:** Full suite must be green
- **Max feedback latency:** 30 seconds

---

## Per-Task Verification Map

| Task ID | Plan | Wave | Requirement | Threat Ref | Secure Behavior | Test Type | Automated Command | File Exists | Status |
|---------|------|------|-------------|------------|-----------------|-----------|-------------------|-------------|--------|
| 02-01-01 | 01 | 1 | CRUD-01 | — | N/A | unit | `cd web && npx vitest run` | ❌ W0 | ⬜ pending |
| 02-01-02 | 01 | 1 | CRUD-02 | — | N/A | unit | `cd web && npx vitest run` | ❌ W0 | ⬜ pending |
| 02-01-03 | 01 | 1 | CRUD-03 | — | N/A | unit | `cd web && npx vitest run` | ❌ W0 | ⬜ pending |
| 02-01-04 | 01 | 1 | CRUD-04 | — | N/A | unit | `cd web && npx vitest run` | ❌ W0 | ⬜ pending |
| 02-01-05 | 01 | 1 | CRUD-05 | — | N/A | unit | `cd web && npx vitest run` | ❌ W0 | ⬜ pending |
| 02-01-06 | 01 | 1 | CRUD-06 | — | N/A | unit | `cd web && npx vitest run` | ❌ W0 | ⬜ pending |
| 02-02-01 | 02 | 2 | EC2-01 | — | N/A | unit | `cd web && npx vitest run` | ❌ W0 | ⬜ pending |
| 02-02-02 | 02 | 2 | EC2-02 | — | N/A | unit | `cd web && npx vitest run` | ❌ W0 | ⬜ pending |
| 02-02-03 | 02 | 2 | EC2-03 | — | N/A | unit | `cd web && npx vitest run` | ❌ W0 | ⬜ pending |
| 02-02-04 | 02 | 2 | EC2-04 | — | N/A | unit | `cd web && npx vitest run` | ❌ W0 | ⬜ pending |
| 02-02-05 | 02 | 2 | EC2-05 | — | N/A | unit | `cd web && npx vitest run` | ❌ W0 | ⬜ pending |
| 02-02-06 | 02 | 2 | EC2-06 | — | N/A | unit | `cd web && npx vitest run` | ❌ W0 | ⬜ pending |

*Status: ⬜ pending · ✅ green · ❌ red · ⚠️ flaky*

---

## Wave 0 Requirements

- [ ] Test stubs for all 12 requirement IDs (CRUD-01..06, EC2-01..06)
- [ ] MSW handlers for EC2 XML responses (DescribeInstances, DescribeVpcs, etc.)
- [ ] Shared test fixtures for EC2 resource mock data

*Existing `renderWithProviders` + `setupMswForTest` infrastructure from Phase 1 covers base needs.*

---

## Manual-Only Verifications

| Behavior | Requirement | Why Manual | Test Instructions |
|----------|-------------|------------|-------------------|
| Color-coded status indicators visually correct | EC2-01 | Visual color verification | Inspect StatusIndicator renders green/yellow/red for running/stopped/terminated |
| SplitPanel opens on row click | CRUD-02 | Interaction + layout | Click instance row, verify split panel shows detail tabs |
| Wizard step navigation | EC2-06 | Multi-step form flow | Walk through all 4 wizard steps, verify dropdowns populate |

---

## Validation Sign-Off

- [ ] All tasks have `<automated>` verify or Wave 0 dependencies
- [ ] Sampling continuity: no 3 consecutive tasks without automated verify
- [ ] Wave 0 covers all MISSING references
- [ ] No watch-mode flags
- [ ] Feedback latency < 30s
- [ ] `nyquist_compliant: true` set in frontmatter

**Approval:** pending
