# Research Summary: MiniStack Web Console

**Domain:** AWS Console-style Web UI for Local AWS Emulator
**Researched:** 2026-04-05
**Overall confidence:** HIGH

## Executive Summary

MiniStack is a Python ASGI-based local AWS emulator running on port 4566 with 35+ service handlers. The goal is to add an AWS Console-like web UI that lets developers visually manage all emulated resources through the browser. The key architectural insight is that the frontend should act as a standard AWS client -- making the same API calls that boto3/CLI make -- rather than requiring a parallel backend API.

The technology stack is unusually clear-cut for this project. AWS open-sourced their own console design system as Cloudscape, which is React-only. This single fact determines the frontend framework (React), the component library (Cloudscape), and eliminates all alternatives. Cloudscape v3 is actively maintained (1259+ releases, last update Apr 2, 2026), supports React 19, and provides every UI pattern the AWS Console uses: AppLayout, SideNavigation, Table with collection hooks, StatusIndicator, BreadcrumbGroup, and more.

The frontend builds as a static SPA via Vite, served by a thin ASGI middleware from the existing Python app on the same port 4566. No additional servers, no Node.js runtime in production. Development uses Vite's dev server with a proxy to the Python backend. The state management split is TanStack Query for all server data (resource lists, details, status) and Zustand for lightweight UI state (sidebar, filters, preferences).

The primary risk is scope explosion: 35+ services with full CRUD could generate hundreds of UI files. The mitigation is a schema-driven approach where services declare descriptors and shared generic components render them, combined with strict feature module boundaries and lazy loading per service.

## Key Findings

**Stack:** React 19 + Cloudscape v3 (AWS's own design system) + Vite 6 + TanStack Query v5 + Zustand v5, served as static SPA from existing Python ASGI app.

**Architecture:** Frontend calls the same AWS API endpoints on :4566 that CLI uses. No parallel UI backend needed. Thin `/_console/` prefix for SPA routing, thin `/_api/console/` for aggregate data only.

**Critical pitfall:** Service UI code explosion -- 35 services x 4 views = 140+ files if not abstracted. Use schema-driven generic components where each service is a descriptor, not a component tree.

## Implications for Roadmap

Based on research, suggested phase structure:

1. **Foundation** - App shell, build pipeline, ASGI middleware, AWS API client layer
   - Addresses: Navigation, routing, static file serving, API communication
   - Avoids: Starting with features before infrastructure is solid

2. **Core Services (Read-Only)** - EC2, S3, Lambda dashboards with table views and detail pages
   - Addresses: Table stakes features for the 3 most-used services
   - Avoids: CRUD complexity before read layer is proven
   - EC2 first because it has the most complex XML responses (proves the parser pattern)

3. **CRUD and Interactions** - Create/delete forms, Lambda test invoke, S3 upload/download, EC2 start/stop
   - Addresses: Full interactivity for core services
   - Avoids: Building forms before table/detail patterns are stable

4. **Service Scaling** - Expand to remaining 32+ services using established patterns
   - Addresses: Full service coverage
   - Avoids: Schema-driven approach must be solid before scaling

5. **Differentiators** - Cross-service resource graph, request inspector, dark mode, command palette
   - Addresses: Competitive advantage over LocalStack
   - Avoids: Nice-to-haves before core functionality

**Phase ordering rationale:**
- Phase 1 before 2: Cannot build service UIs without the app shell and API client layer
- Phase 2 before 3: Read-only views validate the data flow. CRUD adds complexity on top.
- EC2 first in Phase 2: Most complex XML parsing. If it works, all other services are easier.
- Phase 3 before 4: CRUD patterns must be proven on 3 services before scaling to 35+
- Phase 4 before 5: Core value (manage all services) before differentiators

**Research flags for phases:**
- Phase 1: Needs deeper research on Cloudscape AppLayout integration patterns and Vite proxy configuration
- Phase 2: Needs per-service research on exact API response formats for parsing
- Phase 4: Standard patterns by this point, unlikely to need research
- Phase 5: WebSocket integration with ASGI needs feasibility check

## Confidence Assessment

| Area | Confidence | Notes |
|------|------------|-------|
| Stack | HIGH | Cloudscape is the only real option for AWS console fidelity. React, Vite, TanStack Query are all industry standard. Verified versions via npm and web search. |
| Features | HIGH | AWS Console is the reference implementation. Feature list is well-defined by observation. |
| Architecture | HIGH | SPA served from ASGI is a well-established pattern. Frontend-as-AWS-client is the natural design given the emulator's nature. |
| Pitfalls | MEDIUM | XML parsing inconsistencies and schema-driven UI are based on AWS API documentation and community experience, not direct testing. Need validation during Phase 2. |

## Gaps to Address

- Exact Cloudscape AppLayout + React Router 7 integration example (may need Phase 1 spike)
- XML parsing library recommendation for the frontend (fast-xml-parser vs browser DOMParser)
- Whether Cloudscape's collection hooks handle all our table patterns or need extension
- WebSocket support from raw ASGI app for real-time updates (Phase 5 concern)
- Docker multi-stage build configuration for frontend + Python (Phase 1 implementation detail)
