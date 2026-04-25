import { useEffect, useState } from 'react'
import Box from '@cloudscape-design/components/box'
import FormField from '@cloudscape-design/components/form-field'
import SpaceBetween from '@cloudscape-design/components/space-between'
import Textarea from '@cloudscape-design/components/textarea'
import { copy } from '../../../shared/copy'

type Props = {
  value: string
  onChange: (next: string, parsed: unknown | null, valid: boolean) => void
}

/**
 * ItemJsonEditor — Textarea with realtime JSON.parse validation.
 * Mirrors the Phase 4 PayloadEditor pattern.
 */
export function ItemJsonEditor({ value, onChange }: Props) {
  const [error, setError] = useState<string | null>(null)

  const validate = (input: string) => {
    try {
      const parsed = JSON.parse(input)
      setError(null)
      onChange(input, parsed, true)
    } catch (e) {
      setError((e as Error).message)
      onChange(input, null, false)
    }
  }

  // Initial validation — fire once on mount so the parent knows validity
  // before the first edit event.
  useEffect(() => {
    validate(value)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  return (
    <SpaceBetween size="xs">
      <FormField
        label={copy.ddb.itemJsonLabel}
        errorText={error ? copy.ddb.itemJsonInvalid(error) : undefined}
      >
        <Textarea
          value={value}
          onChange={(e) => validate(e.detail.value)}
          rows={16}
          spellcheck={false}
        />
      </FormField>
      {error && (
        <Box color="text-status-error">
          {copy.ddb.itemJsonInvalid(error)}
        </Box>
      )}
    </SpaceBetween>
  )
}
