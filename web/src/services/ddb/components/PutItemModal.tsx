import { useEffect, useMemo, useState } from 'react'
import Alert from '@cloudscape-design/components/alert'
import Box from '@cloudscape-design/components/box'
import Button from '@cloudscape-design/components/button'
import Modal from '@cloudscape-design/components/modal'
import SegmentedControl from '@cloudscape-design/components/segmented-control'
import SpaceBetween from '@cloudscape-design/components/space-between'
import { useQueryClient } from '@tanstack/react-query'
import { usePutItem } from '../api/usePutItem'
import { ddbJsonCall } from '../api/ddbClient'
import { marshalScalar } from '../api/attributeValue'
import { copy } from '../../../shared/copy'
import { ItemForm, type FormAttrMap } from './ItemForm'
import { ItemJsonEditor } from './ItemJsonEditor'
import type {
  DdbItem,
  DdbScalarType,
  DdbTableDescription,
} from '../../../shared/types/ddb'

type TableDescriptionWithKeys = DdbTableDescription & {
  hashKey: string | null
  sortKey: string | null
}

type Mode = 'form' | 'json'

type Props = {
  visible: boolean
  tableDescription: TableDescriptionWithKeys
  initialItem?: DdbItem
  initialHeader?: string
  onDismiss: () => void
  onSaved: () => void
  onFailed: (msg: string) => void
}

const SCALAR_AV_KEYS: ReadonlyArray<DdbScalarType> = [
  'S',
  'N',
  'B',
  'BOOL',
  'NULL',
]

/**
 * Check if every top-level value in a parsed JSON object is a scalar
 * AttributeValue. If so we can round-trip into the form editor.
 */
function allScalars(parsed: unknown): parsed is Record<string, DdbItem[string]> {
  if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) return false
  for (const v of Object.values(parsed)) {
    if (!v || typeof v !== 'object') return false
    const keys = Object.keys(v)
    if (keys.length !== 1) return false
    if (!SCALAR_AV_KEYS.includes(keys[0] as DdbScalarType)) return false
  }
  return true
}

/**
 * Reverse-parse a scalar DdbItem into FormAttrMap rows.
 */
function itemToForm(item: DdbItem): FormAttrMap {
  const out: FormAttrMap = {}
  for (const [name, av] of Object.entries(item)) {
    if ('S' in av) out[name] = { type: 'S', value: av.S }
    else if ('N' in av) out[name] = { type: 'N', value: av.N }
    else if ('B' in av) out[name] = { type: 'B', value: av.B }
    else if ('BOOL' in av) out[name] = { type: 'BOOL', value: av.BOOL }
    else if ('NULL' in av) out[name] = { type: 'NULL', value: null }
  }
  return out
}

function formToItem(form: FormAttrMap): DdbItem {
  const out: DdbItem = {}
  for (const [name, a] of Object.entries(form)) {
    out[name] = marshalScalar(
      a.value as string | number | boolean | null,
      a.type,
    )
  }
  return out
}

/**
 * PutItemModal [DDB-03] — Form / JSON toggle per D-03.
 *
 * Form mode uses ItemForm (scalars only per D-06) and dispatches through
 * `usePutItem` (hook marshals). JSON mode uses ItemJsonEditor and dispatches
 * raw through `ddbJsonCall('PutItem', ...)` — an escape hatch for complex
 * AttributeValue shapes (L/M/SS/NS/BS) that the form blocks.
 *
 * D-07 does NOT apply here — native DDB pages skip the preview (per
 * 05-CONTEXT.md D-07 scope boundary). Save dispatches immediately.
 */
export function PutItemModal({
  visible,
  tableDescription,
  initialItem,
  initialHeader,
  onDismiss,
  onSaved,
  onFailed,
}: Props) {
  const [mode, setMode] = useState<Mode>('form')
  const [formValues, setFormValues] = useState<FormAttrMap>(() =>
    initialItem ? itemToForm(initialItem) : {},
  )
  const [formValid, setFormValid] = useState(false)
  const [jsonText, setJsonText] = useState<string>('')
  const [jsonParsed, setJsonParsed] = useState<unknown | null>(null)
  const [jsonValid, setJsonValid] = useState(false)
  const [serverError, setServerError] = useState<string | null>(null)
  const [submitting, setSubmitting] = useState(false)
  const [formModeBlocked, setFormModeBlocked] = useState(false)

  const mutation = usePutItem(tableDescription.TableName)
  const qc = useQueryClient()

  // Reset on re-open.
  useEffect(() => {
    if (visible) {
      setMode('form')
      setFormValues(initialItem ? itemToForm(initialItem) : {})
      setFormValid(false)
      setJsonText(
        JSON.stringify(initialItem ?? {}, null, 2),
      )
      setJsonParsed(initialItem ?? {})
      setJsonValid(true)
      setServerError(null)
      setSubmitting(false)
      setFormModeBlocked(false)
      mutation.reset()
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [visible, initialItem])

  const canSave = useMemo(() => {
    if (submitting) return false
    return mode === 'form' ? formValid : jsonValid
  }, [mode, formValid, jsonValid, submitting])

  const handleModeChange = (next: Mode) => {
    if (next === mode) return
    if (mode === 'form' && next === 'json') {
      // Seed JSON from form state.
      const item = formToItem(formValues)
      setJsonText(JSON.stringify(item, null, 2))
      setJsonParsed(item)
      setJsonValid(true)
      setMode('json')
    } else if (mode === 'json' && next === 'form') {
      // Try to seed form from JSON — only if every value is a scalar AV.
      if (jsonValid && allScalars(jsonParsed)) {
        setFormValues(itemToForm(jsonParsed as DdbItem))
        setFormModeBlocked(false)
        setMode('form')
      } else {
        // Leave in JSON mode; show banner.
        setFormModeBlocked(true)
      }
    }
  }

  const handleDismiss = () => {
    if (submitting) return
    onDismiss()
  }

  const handleSubmit = async () => {
    if (!canSave) return
    setServerError(null)
    setSubmitting(true)
    try {
      if (mode === 'form') {
        await new Promise<void>((resolve, reject) => {
          mutation.mutate(formValues, {
            onSuccess: () => resolve(),
            onError: (e) => reject(e),
          })
        })
      } else {
        // JSON mode — raw AttributeValue map. Bypass marshal; call directly.
        const parsed = jsonParsed as DdbItem
        await ddbJsonCall('PutItem', {
          TableName: tableDescription.TableName,
          Item: parsed,
        })
        // Mirror usePutItem's predicate invalidation (Pitfall C-3).
        void qc.invalidateQueries({
          predicate: (q) =>
            Array.isArray(q.queryKey) &&
            q.queryKey[0] === 'ddb' &&
            q.queryKey[2] === tableDescription.TableName,
        })
      }
      setSubmitting(false)
      onSaved()
    } catch (e) {
      const message = (e as Error).message
      setSubmitting(false)
      setServerError(message)
      onFailed(message)
    }
  }

  return (
    <Modal
      visible={visible}
      header={initialHeader ?? copy.ddb.createItemHeader}
      size="large"
      onDismiss={handleDismiss}
      footer={
        <Box float="right">
          <SpaceBetween direction="horizontal" size="xs">
            <Button
              variant="link"
              onClick={handleDismiss}
              disabled={submitting}
            >
              {copy.ddb.cancelButton}
            </Button>
            <Button
              variant="primary"
              onClick={handleSubmit}
              disabled={!canSave}
              loading={submitting}
            >
              {copy.ddb.itemSaveButton}
            </Button>
          </SpaceBetween>
        </Box>
      }
    >
      <SpaceBetween size="m">
        {serverError && <Alert type="error">{serverError}</Alert>}
        {formModeBlocked && (
          <Alert type="warning">{copy.ddb.itemJsonToggleBlocked}</Alert>
        )}
        <SegmentedControl
          selectedId={mode}
          onChange={({ detail }) => handleModeChange(detail.selectedId as Mode)}
          options={[
            { text: copy.ddb.itemFormTab, id: 'form' },
            { text: copy.ddb.itemJsonTab, id: 'json' },
          ]}
        />
        {mode === 'form' ? (
          <ItemForm
            keySchema={tableDescription.KeySchema}
            initialValues={formValues}
            onChange={(rows, valid) => {
              setFormValues(rows)
              setFormValid(valid)
            }}
          />
        ) : (
          <ItemJsonEditor
            value={jsonText}
            onChange={(text, parsed, valid) => {
              setJsonText(text)
              setJsonParsed(parsed)
              setJsonValid(valid)
            }}
          />
        )}
      </SpaceBetween>
    </Modal>
  )
}
