import { http, HttpResponse, type HttpHandler } from 'msw'
import { LAMBDA_FIXTURES } from './fixtures'

/**
 * MSW handlers for Lambda REST API (JSON, not XML).
 *
 * Order matters — more specific paths before wildcards.
 *
 * Usage: mswServer.use(...lambdaHandlers)
 */
export const lambdaHandlers: HttpHandler[] = [
  // Invoke — POST /2015-03-31/functions/:name/invocations
  http.post(
    '*/2015-03-31/functions/:name/invocations',
    ({ params }) => {
      const name = params.name as string
      if (name === 'boom') {
        return new HttpResponse(LAMBDA_FIXTURES.invokeErrorBody, {
          status: 200,
          headers: {
            'Content-Type': 'application/json',
            'X-Amz-Executed-Version': '$LATEST',
            'X-Amz-Log-Result': LAMBDA_FIXTURES.invokeErrorLogBase64,
            'X-Amz-Function-Error': 'Unhandled',
          },
        })
      }
      return new HttpResponse(LAMBDA_FIXTURES.invokeSuccessBody, {
        status: 200,
        headers: {
          'Content-Type': 'application/json',
          'X-Amz-Executed-Version': '$LATEST',
          'X-Amz-Log-Result': LAMBDA_FIXTURES.invokeSuccessLogBase64,
        },
      })
    },
  ),

  // UpdateFunctionConfiguration — PUT /2015-03-31/functions/:name/configuration
  http.put('*/2015-03-31/functions/:name/configuration', () => {
    return HttpResponse.json(LAMBDA_FIXTURES.updateConfigResponse)
  }),

  // GetFunctionConfiguration — GET /2015-03-31/functions/:name/configuration
  http.get('*/2015-03-31/functions/:name/configuration', ({ params }) => {
    const name = params.name as string
    if (name !== 'hello') {
      return HttpResponse.json(
        { Type: 'User', message: 'Function not found' },
        { status: 404 },
      )
    }
    return HttpResponse.json(LAMBDA_FIXTURES.configBase)
  }),

  // ListEventSourceMappings — GET /2015-03-31/event-source-mappings
  http.get('*/2015-03-31/event-source-mappings', ({ request }) => {
    const url = new URL(request.url)
    if (url.searchParams.get('FunctionName') === 'hello') {
      return HttpResponse.json(LAMBDA_FIXTURES.esmsOne)
    }
    return HttpResponse.json(LAMBDA_FIXTURES.esmsEmpty)
  }),

  // ListFunctionUrlConfigs — GET /2021-10-31/functions/:name/urls
  http.get('*/2021-10-31/functions/:name/urls', ({ params }) => {
    const name = params.name as string
    if (name === 'hello') {
      return HttpResponse.json(LAMBDA_FIXTURES.functionUrlOne)
    }
    return HttpResponse.json(LAMBDA_FIXTURES.functionUrlEmpty)
  }),

  // GetFunction — GET /2015-03-31/functions/:name
  http.get('*/2015-03-31/functions/:name', ({ params }) => {
    const name = params.name as string
    if (name !== 'hello') {
      return HttpResponse.json(
        { Type: 'User', message: 'Function not found' },
        { status: 404 },
      )
    }
    return HttpResponse.json(LAMBDA_FIXTURES.getFunctionHello)
  }),

  // DeleteFunction — DELETE /2015-03-31/functions/:name
  http.delete('*/2015-03-31/functions/:name', ({ params }) => {
    const name = params.name as string
    if (name === 'missing') {
      return HttpResponse.json(
        { Type: 'User', message: 'Function not found' },
        { status: 404 },
      )
    }
    return new HttpResponse(null, { status: 204 })
  }),

  // ListFunctions — GET /2015-03-31/functions
  http.get('*/2015-03-31/functions', ({ request }) => {
    const url = new URL(request.url)
    if (url.searchParams.has('Marker')) {
      return HttpResponse.json(LAMBDA_FIXTURES.listFunctionsTruncated)
    }
    return HttpResponse.json(LAMBDA_FIXTURES.listFunctionsTwo)
  }),

  // CreateFunction — POST /2015-03-31/functions
  http.post('*/2015-03-31/functions', () => {
    return HttpResponse.json(LAMBDA_FIXTURES.createFunctionResponse, {
      status: 201,
    })
  }),
]
