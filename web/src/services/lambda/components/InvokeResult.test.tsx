import { describe, test, expect } from 'vitest'
import { render, screen } from '@testing-library/react'
import { InvokeResult } from './InvokeResult'
import type { InvokeResult as InvokeResultType } from '../../../shared/types'

/**
 * [LAM-02 / D-06] InvokeResult — vertical stack (Alert? → Response → Logs).
 * No tabs. UTF-8 logs preserved (Pitfall 1 end-to-end via render).
 */

const successResult: InvokeResultType = {
  body: { statusCode: 200, body: 'hello world' },
  logResult: 'START RequestId: abc\n안녕 from Lambda\nEND RequestId: abc',
  functionError: null,
  executedVersion: '$LATEST',
}

const errorResult: InvokeResultType = {
  body: { errorMessage: 'division by zero', errorType: 'ValueError' },
  logResult: 'about to crash',
  functionError: 'Unhandled',
  executedVersion: '$LATEST',
}

describe('InvokeResult', () => {
  test('success: no Alert, pretty-printed response, logs text rendered', () => {
    const { container } = render(<InvokeResult result={successResult} />)
    // No Alert on success (no function-error heading)
    expect(
      container.textContent?.includes('Function returned an error'),
    ).toBeFalsy()
    // Response contains pretty-printed JSON
    expect(container.textContent).toContain('"statusCode": 200')
    expect(container.textContent).toContain('"body": "hello world"')
    // Logs contain decoded string
    expect(container.textContent).toContain('START RequestId: abc')
  })

  test('UTF-8 multi-byte characters preserved in logs (Pitfall 1)', () => {
    const { container } = render(<InvokeResult result={successResult} />)
    expect(container.textContent).toContain('안녕 from Lambda')
  })

  test('function-error: red Alert rendered ABOVE Response (D-06 ordering)', () => {
    const { container } = render(<InvokeResult result={errorResult} />)
    const html = container.innerHTML
    const alertIdx = html.indexOf('Function returned an error')
    const responseIdx = html.indexOf('Response payload')
    expect(alertIdx).toBeGreaterThanOrEqual(0)
    expect(responseIdx).toBeGreaterThanOrEqual(0)
    expect(alertIdx).toBeLessThan(responseIdx)
    // Response body still visible on error path
    expect(container.textContent).toContain('division by zero')
  })

  test('missing logResult renders empty-state copy, no <pre> for logs', () => {
    const result: InvokeResultType = {
      ...successResult,
      logResult: null,
    }
    const { container } = render(<InvokeResult result={result} />)
    expect(container.textContent).toContain('No logs returned')
    // exactly one <pre> (response only)
    const preCount = container.querySelectorAll('pre').length
    expect(preCount).toBe(1)
  })

  test('no Tabs component rendered (D-06 vertical stack)', () => {
    render(<InvokeResult result={successResult} />)
    expect(screen.queryByRole('tablist')).toBeNull()
  })

  test('Response and Logs each render in a <pre> (D-06)', () => {
    const { container } = render(<InvokeResult result={successResult} />)
    const preCount = container.querySelectorAll('pre').length
    expect(preCount).toBe(2)
  })
})
