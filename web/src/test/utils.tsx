import { ReactNode } from 'react'
import { render, RenderOptions } from '@testing-library/react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { MemoryRouter } from 'react-router-dom'

export function makeTestQueryClient() {
  return new QueryClient({
    defaultOptions: {
      queries: { retry: false, gcTime: 0, staleTime: 0 },
    },
  })
}

export function renderWithProviders(
  ui: ReactNode,
  opts: { route?: string } & RenderOptions = {}
) {
  const { route = '/', ...rest } = opts
  const client = makeTestQueryClient()
  // MemoryRouter requires the initial entry to include the basename, otherwise
  // React Router refuses to render the tree. Tests express routes relative to
  // the app (e.g. "/", "/services/ec2") and we prepend "/_console" here.
  const entry = `/_console${route === '/' ? '' : route}` || '/_console'
  return render(
    <QueryClientProvider client={client}>
      <MemoryRouter initialEntries={[entry]} basename="/_console">
        {ui}
      </MemoryRouter>
    </QueryClientProvider>,
    rest,
  )
}
