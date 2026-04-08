import { createBrowserRouter, RouterProvider } from 'react-router-dom'
import { routes } from './app/routes'

const router = createBrowserRouter(routes, {
  // CRITICAL: matches Vite's base AND the ASGI /_console/ prefix.
  // Do NOT add a trailing slash — React Router will emit '//' links (see 01-RESEARCH.md Pitfall #1).
  basename: '/_console',
})

export default function App() {
  return <RouterProvider router={router} />
}
