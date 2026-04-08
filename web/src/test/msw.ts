import { setupServer } from 'msw/node'
import { http, HttpResponse } from 'msw'

export const mswServer = setupServer()

export { http, HttpResponse }
