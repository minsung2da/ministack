# Technology Stack

**Project:** MiniStack Web Console
**Researched:** 2026-04-05

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

No additional Python framework needed. The existing raw ASGI app in `app.py` can serve static files and a REST API directly. Adding Starlette/FastAPI would be a heavier dependency than warranted -- a thin ASGI middleware for static files is sufficient.

## Architecture: Frontend-Backend Integration

The frontend builds to static files (`dist/`) which the Python ASGI app serves:

```
Request to :4566
  |
  +-- /_console/*  --> Serve static files (index.html, JS, CSS)
  |                    Fallback to index.html for SPA routing
  |
  +-- Everything else --> Existing AWS service handlers (unchanged)
```

### Python-side integration pattern:

```python
# Thin ASGI middleware, ~50 lines, no framework needed
async def console_middleware(scope, receive, send):
    path = scope["path"]
    if path.startswith("/_console"):
        # Serve from dist/ directory
        # Fallback unknown paths to index.html (SPA routing)
        ...
    else:
        await existing_app(scope, receive, send)
```

### Frontend API layer:

The frontend calls the SAME :4566 endpoints that AWS CLI/boto3 uses. No separate "UI API" needed. The console just makes AWS API calls to localhost:4566 with proper headers, then renders the responses.

For operations not in the AWS API (e.g., "list all services and their resource counts"), add a thin `/_api/console/...` namespace.

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

```bash
# Initialize
npm create vite@latest web -- --template react-ts
cd web

# Core UI
npm install @cloudscape-design/components @cloudscape-design/global-styles @cloudscape-design/design-tokens

# Routing
npm install react-router

# State management
npm install @tanstack/react-query zustand

# HTTP
npm install ky

# Dev dependencies
npm install -D @types/react @types/react-dom
```

### Backend (Python)

```bash
# Only if async file serving is needed (optional -- can use sync for low traffic)
pip install aiofiles
```

## Project Structure

```
ministack/
  web/                          # Frontend SPA
    src/
      app/                      # App shell, layout, routing
      features/                 # Per-service UI modules
        ec2/
        s3/
        lambda/
        dynamodb/
        ...
      shared/                   # Shared components, hooks, utils
        api/                    # API client, TanStack Query config
        components/             # Reusable Cloudscape wrappers
        hooks/                  # Shared hooks
      stores/                   # Zustand stores (UI state only)
    vite.config.ts
    tsconfig.json
  ministack/
    web/                        # Python-side console middleware
      __init__.py
      middleware.py             # Static file serving ASGI middleware
      static/                   # Built frontend assets (git-ignored, populated by build)
```

## Build Pipeline

```bash
# Development: Vite dev server proxies API to :4566
cd web && npm run dev   # :5173 with proxy to :4566

# Production: Build and copy to Python static dir
cd web && npm run build
cp -r dist/* ../ministack/web/static/

# Docker: Multi-stage build
# Stage 1: npm install && npm run build
# Stage 2: Python image with built assets
```

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
