// scalars-only per D-06 — L / M / SS / NS / BS require JSON advanced mode
import { useEffect, useState } from 'react'
import Box from '@cloudscape-design/components/box'
import Button from '@cloudscape-design/components/button'
import FormField from '@cloudscape-design/components/form-field'
import Input from '@cloudscape-design/components/input'
import Select from '@cloudscape-design/components/select'
import SpaceBetween from '@cloudscape-design/components/space-between'
import Toggle from '@cloudscape-design/components/toggle'
import { copy } from '../../../shared/copy'
import type {
  DdbKeySchemaEntry,
  DdbScalarType,
} from '../../../shared/types/ddb'

export type FormAttrValue = {
  type: DdbScalarType
  value: string | boolean | null
}
export type FormAttrMap = Record<string, FormAttrValue>

type Row = {
  key: string
  name: string
  type: DdbScalarType
  value: string | boolean | null
  fixed: boolean
}

type Props = {
  keySchema: DdbKeySchemaEntry[]
  initialValues?: FormAttrMap
  onChange: (rows: FormAttrMap, valid: boolean) => void
}

// D-06 scope: EXACTLY 5 scalar types — NO L / M / SS / NS / BS options.
const TYPE_OPTIONS: { label: string; value: DdbScalarType }[] = [
  { label: 'String (S)', value: 'S' },
  { label: 'Number (N)', value: 'N' },
  { label: 'Binary (B)', value: 'B' },
  { label: 'Boolean (BOOL)', value: 'BOOL' },
  { label: 'Null (NULL)', value: 'NULL' },
]

let nextId = 1
const mkKey = () => `row-${nextId++}`

function defaultValueFor(type: DdbScalarType): string | boolean | null {
  if (type === 'BOOL') return false
  if (type === 'NULL') return null
  return ''
}

function isNumericString(s: string): boolean {
  if (s.trim() === '') return false
  const n = Number(s)
  return Number.isFinite(n)
}

/**
 * ItemForm — schema-based scalar form for PutItem (D-03 / D-06 scalars only).
 *
 * Renders one FIXED (non-removable, name read-only) row per KeySchema entry,
 * then any free-form rows added by the user. Per Pitfall 7.10 new rows
 * default to type 'S'. N-type values are validated as numeric strings but
 * STORED as strings on the wire (Pitfall 7.2.1 — the hook never calls
 * `Number()` on the value; only the display renderer does).
 */
export function ItemForm({ keySchema, initialValues, onChange }: Props) {
  const [rows, setRows] = useState<Row[]>(() => {
    const keyRows: Row[] = keySchema.map((k) => ({
      key: mkKey(),
      name: k.AttributeName,
      type: (initialValues?.[k.AttributeName]?.type ?? 'S') as DdbScalarType,
      value:
        initialValues?.[k.AttributeName]?.value ??
        defaultValueFor(
          (initialValues?.[k.AttributeName]?.type ?? 'S') as DdbScalarType,
        ),
      fixed: true,
    }))
    const extras: Row[] = []
    if (initialValues) {
      for (const [name, v] of Object.entries(initialValues)) {
        if (keySchema.some((k) => k.AttributeName === name)) continue
        extras.push({
          key: mkKey(),
          name,
          type: v.type,
          value: v.value,
          fixed: false,
        })
      }
    }
    return [...keyRows, ...extras]
  })

  const rowValid = (r: Row): boolean => {
    if (!r.name) return false
    if (r.type === 'BOOL' || r.type === 'NULL') return true
    if (r.type === 'N') return isNumericString(String(r.value ?? ''))
    // S / B: non-empty string
    return String(r.value ?? '').length > 0
  }

  useEffect(() => {
    const map: FormAttrMap = {}
    for (const r of rows) {
      if (!r.name) continue
      map[r.name] = { type: r.type, value: r.value }
    }
    const valid = rows.every(rowValid) && rows.every((r) => !!r.name)
    onChange(map, valid)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [rows])

  const updateRow = (key: string, patch: Partial<Row>) => {
    setRows((rs) =>
      rs.map((r) => {
        if (r.key !== key) return r
        const next = { ...r, ...patch }
        if (patch.type && patch.type !== r.type) {
          // Reset value when the type changes so stale string doesn't contaminate a BOOL/NULL.
          next.value = defaultValueFor(patch.type)
        }
        return next
      }),
    )
  }

  const addRow = () => {
    // Pitfall 7.10 — new attribute defaults to type 'S'.
    setRows((rs) => [
      ...rs,
      { key: mkKey(), name: '', type: 'S', value: '', fixed: false },
    ])
  }

  const removeRow = (key: string) => {
    setRows((rs) => rs.filter((r) => r.key !== key))
  }

  return (
    <SpaceBetween size="s">
      {rows.map((r) => (
        <SpaceBetween key={r.key} direction="horizontal" size="s">
          <FormField label={copy.ddb.itemFormAttributeNameLabel}>
            <Input
              value={r.name}
              disabled={r.fixed}
              onChange={({ detail }) =>
                updateRow(r.key, { name: detail.value })
              }
            />
          </FormField>
          <FormField label={copy.ddb.itemFormAttributeTypeLabel}>
            <Select
              selectedOption={
                TYPE_OPTIONS.find((o) => o.value === r.type) ?? null
              }
              options={TYPE_OPTIONS}
              onChange={({ detail }) =>
                updateRow(r.key, {
                  type: detail.selectedOption?.value as DdbScalarType,
                })
              }
            />
          </FormField>
          <FormField
            label={copy.ddb.itemFormAttributeValueLabel}
            errorText={
              r.type === 'N' &&
              String(r.value ?? '') !== '' &&
              !isNumericString(String(r.value ?? ''))
                ? copy.ddb.itemFormNumberInvalid
                : undefined
            }
          >
            {r.type === 'BOOL' ? (
              <Toggle
                checked={!!r.value}
                onChange={({ detail }) =>
                  updateRow(r.key, { value: detail.checked })
                }
              />
            ) : r.type === 'NULL' ? (
              <Box color="text-status-inactive">(null)</Box>
            ) : r.type === 'N' ? (
              <Input
                type="number"
                value={String(r.value ?? '')}
                onChange={({ detail }) =>
                  // Pitfall 7.2.1 — keep as string; NEVER Number() it here.
                  updateRow(r.key, { value: detail.value })
                }
              />
            ) : (
              <Input
                value={String(r.value ?? '')}
                onChange={({ detail }) =>
                  updateRow(r.key, { value: detail.value })
                }
              />
            )}
          </FormField>
          {!r.fixed && (
            <Box padding={{ top: 'l' }}>
              <Button
                variant="link"
                onClick={() => removeRow(r.key)}
                ariaLabel={`${copy.ddb.itemFormRemoveAttributeButton} ${r.name}`}
              >
                {copy.ddb.itemFormRemoveAttributeButton}
              </Button>
            </Box>
          )}
        </SpaceBetween>
      ))}
      <Button onClick={addRow} iconName="add-plus">
        {copy.ddb.itemFormAddAttributeButton}
      </Button>
    </SpaceBetween>
  )
}
