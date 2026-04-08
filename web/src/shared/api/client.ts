import ky from 'ky'

// Same-origin in prod; Vite dev server proxies /_console/api to :5566.
// No prefixUrl — we use absolute paths so AWS-style calls (in Plan 05 counts.ts)
// can reuse the same client with bare `/` paths.
export const apiClient = ky.create({
  retry: 0, // TanStack Query handles retries
  timeout: 5000,
  // Default credentials: 'same-origin'
})
