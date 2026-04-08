import { afterAll, afterEach, beforeAll } from 'vitest'
import { mswServer } from './msw'

/**
 * Call once at module scope inside any test file that uses MSW handlers.
 * Registers per-file beforeAll/afterEach/afterAll hooks scoped to this file's run only.
 * Plan 04 tests do NOT call this — they use vi.mock and would error on unhandled requests.
 */
export function setupMswForTest(): void {
  beforeAll(() => mswServer.listen({ onUnhandledRequest: 'error' }))
  afterEach(() => mswServer.resetHandlers())
  afterAll(() => mswServer.close())
}
