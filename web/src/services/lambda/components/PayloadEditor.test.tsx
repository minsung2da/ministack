import { describe, test, expect, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import { useState } from 'react'
import { PayloadEditor } from './PayloadEditor'
import { SAMPLE_PAYLOADS } from './samplePayloads'

/**
 * [LAM-02 / D-04] PayloadEditor — controlled Cloudscape Textarea +
 * JSON validation + sample dropdown. No Monaco / CodeMirror allowed.
 */

function Harness({
  initial = '{}',
  onValidityChange,
}: {
  initial?: string
  onValidityChange?: (valid: boolean) => void
}) {
  const [payload, setPayload] = useState(initial)
  return (
    <PayloadEditor
      payload={payload}
      onPayloadChange={setPayload}
      onValidityChange={onValidityChange}
    />
  )
}

describe('PayloadEditor', () => {
  test('valid JSON shows no errorText', () => {
    const { container } = render(<Harness initial="{}" />)
    expect(container.textContent).not.toMatch(/Invalid JSON/i)
  })

  test('invalid JSON shows FormField errorText "Invalid JSON: ..."', () => {
    const { container } = render(<Harness initial="{invalid" />)
    expect(container.textContent).toMatch(/Invalid JSON:/i)
  })

  test('onValidityChange fires with false on invalid, true on valid', () => {
    const spy = vi.fn()
    const { rerender } = render(
      <PayloadEditor
        payload="{}"
        onPayloadChange={() => {}}
        onValidityChange={spy}
      />,
    )
    expect(spy).toHaveBeenLastCalledWith(true)
    rerender(
      <PayloadEditor
        payload="{bad"
        onPayloadChange={() => {}}
        onValidityChange={spy}
      />,
    )
    expect(spy).toHaveBeenLastCalledWith(false)
  })

  test('SAMPLE_PAYLOADS exports 4 templates matching D-04 / RESEARCH list', () => {
    expect(SAMPLE_PAYLOADS).toHaveLength(4)
    const labels = SAMPLE_PAYLOADS.map((s) => s.label)
    expect(labels).toEqual(
      expect.arrayContaining([
        expect.stringMatching(/Empty/i),
        expect.stringMatching(/API Gateway/i),
        expect.stringMatching(/S3/i),
        expect.stringMatching(/SQS/i),
      ]),
    )
  })

  test('sample dropdown trigger is rendered with placeholder (Cloudscape Select)', () => {
    render(<Harness />)
    // Cloudscape Select renders the placeholder inline inside its trigger.
    const triggers = screen.getAllByText(/Load sample payload/i)
    expect(triggers.length).toBeGreaterThan(0)
  })

  test('no Monaco or CodeMirror in component imports (D-04)', () => {
    // Indirect assertion: the compiled module has no monaco/codemirror
    // symbols. We assert via DOM output having no such class hooks.
    const { container } = render(<Harness />)
    expect(container.innerHTML).not.toMatch(/monaco|codemirror/i)
  })

  test('SAMPLE_PAYLOADS all parse as JSON', () => {
    for (const sample of SAMPLE_PAYLOADS) {
      expect(() => JSON.parse(sample.value)).not.toThrow()
    }
  })
})
