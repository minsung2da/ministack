<!-- GSD:project-start source:PROJECT.md -->
## Project

**MiniStack Web Console**

MiniStack은 무료 오픈소스 로컬 AWS 에뮬레이터로, 현재 35+ AWS 서비스를 API 레벨에서 에뮬레이션한다. 이 프로젝트는 MiniStack에 **AWS 콘솔과 동일한 웹 UI**를 추가하여, 브라우저에서 모든 에뮬레이션 서비스의 리소스를 시각적으로 조회/생성/수정/삭제할 수 있게 하는 것이다.

**Core Value:** 브라우저에서 AWS 콘솔처럼 로컬 에뮬레이터의 모든 리소스를 시각적으로 관리할 수 있어야 한다.

### Constraints

- **Tech stack**: Python 백엔드 유지 (기존 ASGI 앱에 통합)
- **Architecture**: 기존 4566 포트에 웹 UI 라우트 추가 (별도 서버 X)
- **Compatibility**: 기존 AWS API 에뮬레이션에 영향 없어야 함
- **Dependencies**: 최소한의 추가 의존성 (기존 ministack의 경량 철학 유지)
<!-- GSD:project-end -->

<!-- GSD:stack-start source:research/STACK.md -->
## Technology Stack

## Recommended Stack
### Frontend Framework
| Technology | Version | Purpose | Why | Confidence |
|------------|---------|---------|-----|------------|
| React | 19.x | UI framework | Cloudscape (AWS's own design system) is React-only. No alternative framework can use it. React 19 is stable with 19.2.x releases, full ecosystem support. | HIGH |
| TypeScript | 5.7+ | Type safety | Non-negotiable for 35+ service dashboards with complex state. Catches API contract drift at compile time. | HIGH |
### Design System / UI Components
| Technology | Version | Purpose | Why | Confidence |
|------------|---------|---------|-----|------------|
| @cloudscape-design/components | 3.x | AWS console UI components | This IS the AWS console design system, open-sourced by AWS. Tables, forms, navigation, app layout -- all match AWS console pixel-for-pixel. Peer dep `react>=16.8.0` means React 19 compatible. Actively maintained (v3.0.1259 published Apr 2026). No other library comes close for AWS console fidelity. | HIGH |
| @cloudscape-design/global-styles | 1.x | Global Cloudscape styles | Required companion to components package. | HIGH |
| @cloudscape-design/design-tokens | 3.x | Design tokens | Theme tokens for consistent styling. | HIGH |
### Build Tool
| Technology | Version | Purpose | Why | Confidence |
|------------|---------|---------|-----|------------|
| Vite | 6.x | Build & dev server | Industry standard for React SPAs in 2026. Sub-second HMR, zero-config TypeScript, small bundles. CRA is officially dead. Next.js is overkill -- we need a pure SPA served from Python, not a Node.js server. | HIGH |
### Routing
| Technology | Version | Purpose | Why | Confidence |
|------------|---------|---------|-----|------------|
| React Router | 7.x (library mode) | Client-side routing | Standard React router. Use library mode (not framework mode) since we build a standalone SPA served by Python. Supports lazy loading for per-service code splitting. | HIGH |
### State Management
| Technology | Version | Purpose | Why | Confidence |
|------------|---------|---------|-----|------------|
| TanStack Query | 5.x | Server state (API data) | Handles caching, background refetch, deduplication, stale-while-revalidate for all AWS service API calls. This is 90% of our state -- resource lists, details, status polling. | HIGH |
| Zustand | 5.x | Client state (UI state) | 1.2KB gzipped. For sidebar open/closed, selected region, service navigation state, filter preferences. NOT for server data -- TanStack Query owns that. | HIGH |
### HTTP Client
| Technology | Version | Purpose | Why | Confidence |
|------------|---------|---------|-----|------------|
| ky | 1.x | HTTP requests | Tiny (3.3KB), built on fetch, supports hooks/interceptors for adding AWS headers. Lighter than axios, modern API. Used by TanStack Query as the fetcher. | MEDIUM |
### Backend Integration (Python side)
| Technology | Version | Purpose | Why | Confidence |
|------------|---------|---------|-----|------------|
| aiofiles | 24.x | Async static file serving | Serve built frontend assets from the existing ASGI app without blocking the event loop. | HIGH |
## Architecture: Frontend-Backend Integration
### Python-side integration pattern:
# Thin ASGI middleware, ~50 lines, no framework needed
### Frontend API layer:
## What NOT to Use
| Category | Rejected | Why Not |
|----------|----------|---------|
| Framework | Next.js, Remix | Require Node.js server. We serve from Python. SPA is correct here -- no SEO needed for a dev tool. |
| Framework | Vue, Svelte, Angular | Cloudscape is React-only. Rebuilding AWS console components from scratch would take months. |
| UI Library | Ant Design, MUI, Chakra | None look like the AWS console. Cloudscape IS the AWS console. |
| CSS | Tailwind, CSS Modules | Cloudscape provides all styling. Adding Tailwind would fight the design system. |
| State | Redux, MobX, Jotai | Redux is too much boilerplate for this use case. TanStack Query + Zustand covers 100% of needs with less code. |
| Build | Webpack, Parcel, Turbopack | Vite is the standard. Webpack is legacy overhead. |
| Python framework | FastAPI, Starlette | Adding a full framework increases dependency surface. A 50-line ASGI middleware for static file serving is sufficient. MiniStack's philosophy is minimal dependencies. |
| HTTP client | axios | 13KB vs ky's 3.3KB. Axios's interceptor API is more complex than needed. |
## Installation
### Frontend (new `web/` directory)
# Initialize
# Core UI
# Routing
# State management
# HTTP
# Dev dependencies
### Backend (Python)
# Only if async file serving is needed (optional -- can use sync for low traffic)
## Project Structure
## Build Pipeline
# Development: Vite dev server proxies API to :4566
# Production: Build and copy to Python static dir
# Docker: Multi-stage build
# Stage 1: npm install && npm run build
# Stage 2: Python image with built assets
## Sources
- [Cloudscape Design System](https://cloudscape.design/) - AWS's open-source design system
- [@cloudscape-design/components on npm](https://www.npmjs.com/package/@cloudscape-design/components) - v3.0.1259, actively maintained
- [Cloudscape components GitHub](https://github.com/cloudscape-design/components) - Updated Apr 2, 2026
- [Vite Getting Started](https://vite.dev/guide/) - v6.x, standard React SPA build tool
- [React Router SPA mode](https://reactrouter.com/how-to/spa) - v7 library mode for SPAs
- [TanStack Query](https://tanstack.com/query/latest) - v5.96.x for server state
- [Zustand GitHub](https://github.com/pmndrs/zustand) - v5.x, ~1.2KB gzipped
- [Starlette Static Files](https://starlette.dev/staticfiles/) - Reference for ASGI static file patterns
- [React 19 stable](https://react.dev/versions) - v19.2.x production-ready
<!-- GSD:stack-end -->

<!-- GSD:conventions-start source:CONVENTIONS.md -->
## Conventions

Conventions not yet established. Will populate as patterns emerge during development.
<!-- GSD:conventions-end -->

<!-- GSD:architecture-start source:ARCHITECTURE.md -->
## Architecture

Architecture not yet mapped. Follow existing patterns found in the codebase.
<!-- GSD:architecture-end -->

<!-- GSD:workflow-start source:GSD defaults -->
## GSD Workflow Enforcement

Before using Edit, Write, or other file-changing tools, start work through a GSD command so planning artifacts and execution context stay in sync.

Use these entry points:
- `/gsd:quick` for small fixes, doc updates, and ad-hoc tasks
- `/gsd:debug` for investigation and bug fixing
- `/gsd:execute-phase` for planned phase work

Do not make direct repo edits outside a GSD workflow unless the user explicitly asks to bypass it.
<!-- GSD:workflow-end -->



<!-- GSD:profile-start -->
## Developer Profile

> Profile not yet configured. Run `/gsd:profile-user` to generate your developer profile.
> This section is managed by `generate-claude-profile` -- do not edit manually.
<!-- GSD:profile-end -->
