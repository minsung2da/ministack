import { useEffect, useState } from 'react'
import FormField from '@cloudscape-design/components/form-field'
import Textarea from '@cloudscape-design/components/textarea'
import Select, { type SelectProps } from '@cloudscape-design/components/select'
import SpaceBetween from '@cloudscape-design/components/space-between'
import { SAMPLE_PAYLOADS } from './samplePayloads'
import { copy } from '../../../shared/copy'

/**
 * PayloadEditor [LAM-02 / D-04]
 *
 * Controlled Cloudscape Textarea for JSON payload entry + a dropdown of
 * sample templates. Realtime `JSON.parse` validation — invalid input
 * surfaces as a FormField errorText and propagates upward via
 * `onValidityChange` so the parent (InvokePanel) can disable Invoke.
 *
 * D-04: Cloudscape Textarea only — see 04-CONTEXT.md §D-04 for the full
 * rationale. Adding a heavyweight code-editor dependency would violate
 * Registry Safety (Pitfall C-2) and inflate the bundle.
 */

type Props = {
  payload: string
  onPayloadChange: (value: string) => void
  onValidityChange?: (valid: boolean) => void
  disabled?: boolean
}

function validateJson(input: string): { valid: boolean; error?: string } {
  try {
    JSON.parse(input)
    return { valid: true }
  } catch (e) {
    return { valid: false, error: (e as Error).message }
  }
}

export function PayloadEditor({
  payload,
  onPayloadChange,
  onValidityChange,
  disabled,
}: Props) {
  const [selectedSample, setSelectedSample] =
    useState<SelectProps.Option | null>(null)
  const validation = validateJson(payload)

  useEffect(() => {
    onValidityChange?.(validation.valid)
  }, [validation.valid, onValidityChange])

  const sampleOptions: SelectProps.Option[] = SAMPLE_PAYLOADS.map((s) => ({
    label: s.label,
    value: s.label,
  }))

  return (
    <SpaceBetween size="s">
      <FormField
        label={copy.lambda.payloadSampleLabel}
        description="Load a sample event shape into the payload editor."
      >
        <Select
          selectedOption={selectedSample}
          options={sampleOptions}
          onChange={({ detail }) => {
            const chosen = SAMPLE_PAYLOADS.find(
              (s) => s.label === detail.selectedOption?.value,
            )
            if (chosen) {
              onPayloadChange(chosen.value)
              setSelectedSample(detail.selectedOption)
            }
          }}
          placeholder="Load sample payload"
          disabled={disabled}
        />
      </FormField>
      <FormField
        label={copy.lambda.payloadLabel}
        errorText={
          !validation.valid
            ? copy.lambda.payloadInvalidJson(validation.error ?? '')
            : undefined
        }
      >
        <Textarea
          value={payload}
          onChange={(e) => onPayloadChange(e.detail.value)}
          rows={12}
          spellcheck={false}
          disabled={disabled}
        />
      </FormField>
    </SpaceBetween>
  )
}
