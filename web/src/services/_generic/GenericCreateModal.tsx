import { useEffect, useState } from 'react'
import Modal from '@cloudscape-design/components/modal'
import FormField from '@cloudscape-design/components/form-field'
import Input from '@cloudscape-design/components/input'
import Textarea from '@cloudscape-design/components/textarea'
import Toggle from '@cloudscape-design/components/toggle'
import Button from '@cloudscape-design/components/button'
import Box from '@cloudscape-design/components/box'
import SpaceBetween from '@cloudscape-design/components/space-between'
import { useDescriptorMutation } from './hooks/useGenericMutation'
import { GenericDiffPreviewModal } from './GenericDiffPreviewModal'
import { copy } from '../../shared/copy'
import type { JsonBodyShape, ServiceDescriptor } from './types'

type Props = {
  descriptor: ServiceDescriptor
  visible: boolean
  onDismiss: () => void
  onSuccess: () => void
  onError: (msg: string) => void
}

function validateJson(raw: string): string | null {
  if (raw.trim() === '') return null
  try {
    JSON.parse(raw)
    return null
  } catch (e) {
    return (e as Error).message
  }
}

function coerceInput(
  shape: JsonBodyShape,
  values: Record<string, unknown>,
): Record<string, unknown> {
  const out: Record<string, unknown> = {}
  for (const field of shape.fields) {
    const raw = values[field.name]
    if (raw === undefined || raw === '' || raw === null) {
      if (field.required) out[field.name] = raw
      continue
    }
    switch (field.kind) {
      case 'string':
        out[field.name] = String(raw)
        break
      case 'number': {
        const n = Number(raw)
        if (Number.isFinite(n)) out[field.name] = n
        break
      }
      case 'boolean':
        out[field.name] = !!raw
        break
      case 'json':
        try {
          out[field.name] = JSON.parse(String(raw))
        } catch {
          // falls through as raw string — preview will show the error
          out[field.name] = raw
        }
        break
    }
  }
  return out
}

/**
 * GenericCreateModal — form generated from MutationSpec.bodyShape.fields.
 *
 * D-07: "Review" opens GenericDiffPreviewModal showing the preview()
 * output (url / headers / body). Pitfall 7.2.6: identical `input` is passed
 * to preview() and send(); the hook layer guarantees byte-equality.
 */
export function GenericCreateModal({
  descriptor,
  visible,
  onDismiss,
  onSuccess,
  onError,
}: Props) {
  const { preview, sendAsync, isPending } = useDescriptorMutation(
    descriptor.serviceKey,
    'create',
  )
  const createSpec = descriptor.mutations?.create
  // Union across aws-json (bodyShape), rest (bodyShape), aws-query (paramShape).
  const shape: JsonBodyShape | undefined = createSpec
    ? createSpec.adapter === 'aws-query'
      ? createSpec.paramShape
      : createSpec.bodyShape
    : undefined

  const [values, setValues] = useState<Record<string, unknown>>({})
  const [jsonErr, setJsonErr] = useState<Record<string, string | null>>({})
  const [diffOpen, setDiffOpen] = useState(false)

  useEffect(() => {
    if (visible) {
      setValues({})
      setJsonErr({})
      setDiffOpen(false)
    }
  }, [visible])

  if (!shape || !createSpec) return null

  const requiredOk = shape.fields
    .filter((f) => f.required)
    .every((f) => {
      const v = values[f.name]
      return v !== undefined && v !== null && String(v).length > 0
    })
  const canReview = requiredOk && !isPending

  const inputForRequest = coerceInput(shape, values)
  let previewed:
    | { url: string; headers: Record<string, string>; body: string | undefined; method?: string }
    | null = null
  try {
    previewed = preview(inputForRequest)
  } catch (_e) {
    previewed = null
  }

  const handleSend = () => {
    // Pitfall 7.2.6: send receives the SAME coerced input preview saw.
    sendAsync(inputForRequest)
      .then(() => {
        setDiffOpen(false)
        onSuccess()
      })
      .catch((err: Error) => {
        setDiffOpen(false)
        onError(err.message)
      })
  }

  return (
    <>
      <Modal
        visible={visible && !diffOpen}
        header={`Create ${descriptor.displayName}`}
        size="medium"
        onDismiss={() => !isPending && onDismiss()}
        footer={
          <Box float="right">
            <SpaceBetween direction="horizontal" size="xs">
              <Button
                variant="link"
                onClick={onDismiss}
                disabled={isPending}
              >
                {copy.generic.cancelButton}
              </Button>
              <Button
                variant="primary"
                onClick={() => setDiffOpen(true)}
                disabled={!canReview}
              >
                {copy.generic.reviewButton}
              </Button>
            </SpaceBetween>
          </Box>
        }
      >
        <SpaceBetween size="m">
          {shape.fields.map((f) => {
            const v = values[f.name]
            if (f.kind === 'boolean') {
              return (
                <FormField key={f.name} label={f.label}>
                  <Toggle
                    checked={!!v}
                    onChange={({ detail }) =>
                      setValues((s) => ({ ...s, [f.name]: detail.checked }))
                    }
                  >
                    {f.placeholder ?? ''}
                  </Toggle>
                </FormField>
              )
            }
            if (f.kind === 'json') {
              return (
                <FormField
                  key={f.name}
                  label={f.label}
                  errorText={jsonErr[f.name] ?? undefined}
                >
                  <Textarea
                    rows={4}
                    value={(v as string) ?? ''}
                    placeholder={f.placeholder ?? '{}'}
                    onChange={({ detail }) => {
                      setValues((s) => ({ ...s, [f.name]: detail.value }))
                      setJsonErr((e) => ({
                        ...e,
                        [f.name]: validateJson(detail.value),
                      }))
                    }}
                  />
                </FormField>
              )
            }
            return (
              <FormField key={f.name} label={f.label}>
                <Input
                  type={f.kind === 'number' ? 'number' : 'text'}
                  value={(v as string) ?? ''}
                  placeholder={f.placeholder}
                  onChange={({ detail }) =>
                    setValues((s) => ({ ...s, [f.name]: detail.value }))
                  }
                />
              </FormField>
            )
          })}
        </SpaceBetween>
      </Modal>

      {previewed && (
        <GenericDiffPreviewModal
          visible={diffOpen}
          url={previewed.url}
          headers={previewed.headers}
          body={previewed.body}
          method={previewed.method}
          isPending={isPending}
          onDismiss={() => setDiffOpen(false)}
          onConfirm={handleSend}
        />
      )}
    </>
  )
}
