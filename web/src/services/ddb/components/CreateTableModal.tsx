import { useEffect, useState } from 'react'
import Modal from '@cloudscape-design/components/modal'
import Form from '@cloudscape-design/components/form'
import FormField from '@cloudscape-design/components/form-field'
import Input from '@cloudscape-design/components/input'
import Select from '@cloudscape-design/components/select'
import Toggle from '@cloudscape-design/components/toggle'
import RadioGroup from '@cloudscape-design/components/radio-group'
import Button from '@cloudscape-design/components/button'
import SpaceBetween from '@cloudscape-design/components/space-between'
import Alert from '@cloudscape-design/components/alert'
import Box from '@cloudscape-design/components/box'
import { copy } from '../../../shared/copy'
import { useCreateTable } from '../api/useCreateTable'
import type { CreateTableInput } from '../api/useCreateTable'

type DdbKeyType = 'S' | 'N' | 'B'
type BillingMode = 'PAY_PER_REQUEST' | 'PROVISIONED'

type Props = {
  visible: boolean
  onDismiss: () => void
  onCreated: (name: string) => void
  onFailed?: (msg: string) => void
}

const TYPE_OPTIONS: { label: string; value: DdbKeyType }[] = [
  { label: 'String (S)', value: 'S' },
  { label: 'Number (N)', value: 'N' },
  { label: 'Binary (B)', value: 'B' },
]

const NAME_REGEX = /^[a-zA-Z0-9_.-]{3,255}$/

/**
 * CreateTableModal — [DDB-01]
 *
 * Partition key + optional Sort key + BillingMode (PAY_PER_REQUEST default).
 * [Plan 03-03 Rule 2] State resets on re-open via useEffect([visible]).
 */
export function CreateTableModal({
  visible,
  onDismiss,
  onCreated,
  onFailed,
}: Props) {
  const [name, setName] = useState('')
  const [pkName, setPkName] = useState('pk')
  const [pkType, setPkType] = useState<DdbKeyType>('S')
  const [hasSort, setHasSort] = useState(false)
  const [skName, setSkName] = useState('sk')
  const [skType, setSkType] = useState<DdbKeyType>('S')
  const [billing, setBilling] = useState<BillingMode>('PAY_PER_REQUEST')
  const [rcu, setRcu] = useState('5')
  const [wcu, setWcu] = useState('5')
  const [serverError, setServerError] = useState<string | null>(null)
  const [touched, setTouched] = useState(false)

  const mutation = useCreateTable()

  useEffect(() => {
    if (visible) {
      setName('')
      setPkName('pk')
      setPkType('S')
      setHasSort(false)
      setSkName('sk')
      setSkType('S')
      setBilling('PAY_PER_REQUEST')
      setRcu('5')
      setWcu('5')
      setServerError(null)
      setTouched(false)
      mutation.reset()
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [visible])

  const nameError = !name
    ? null
    : NAME_REGEX.test(name)
      ? null
      : copy.ddb.createTableNameInvalid

  const rcuN = Number(rcu)
  const wcuN = Number(wcu)
  const provisionedValid =
    billing === 'PAY_PER_REQUEST' ||
    (Number.isFinite(rcuN) && rcuN > 0 && Number.isFinite(wcuN) && wcuN > 0)

  const isValid =
    name.length > 0 &&
    !nameError &&
    pkName.length > 0 &&
    (!hasSort || skName.length > 0) &&
    provisionedValid

  const handleDismiss = () => {
    if (mutation.isPending) return
    onDismiss()
  }

  const handleSubmit = () => {
    setTouched(true)
    if (!isValid) return
    setServerError(null)
    const input: CreateTableInput = {
      TableName: name,
      hashKey: { name: pkName, type: pkType },
      ...(hasSort ? { sortKey: { name: skName, type: skType } } : {}),
      billingMode: billing,
      ...(billing === 'PROVISIONED' ? { rcu: rcuN, wcu: wcuN } : {}),
    }
    mutation.mutate(input, {
      onSuccess: () => {
        onCreated(name)
      },
      onError: (err) => {
        const message = (err as Error).message
        setServerError(message)
        onFailed?.(message)
      },
    })
  }

  const submitDisabled = !isValid || mutation.isPending

  return (
    <Modal
      visible={visible}
      header={copy.ddb.createTableHeader}
      size="medium"
      onDismiss={handleDismiss}
      footer={
        <Box float="right">
          <SpaceBetween direction="horizontal" size="xs">
            <Button
              variant="link"
              onClick={handleDismiss}
              disabled={mutation.isPending}
            >
              {copy.ddb.cancelButton}
            </Button>
            <Button
              variant="primary"
              onClick={handleSubmit}
              disabled={submitDisabled}
              loading={mutation.isPending}
            >
              {copy.ddb.createTableSubmit}
            </Button>
          </SpaceBetween>
        </Box>
      }
    >
      <Form>
        <SpaceBetween size="m">
          {serverError && <Alert type="error">{serverError}</Alert>}

          <FormField
            label={copy.ddb.createTableNameLabel}
            description={copy.ddb.createTableNameHelp}
            errorText={touched ? (nameError ?? undefined) : undefined}
          >
            <Input
              value={name}
              placeholder={copy.ddb.createTableNamePlaceholder}
              onChange={({ detail }) => setName(detail.value)}
              onBlur={() => setTouched(true)}
              disabled={mutation.isPending}
            />
          </FormField>

          <Box>
            <b>{copy.ddb.createTablePartitionKeyHeading}</b>
          </Box>
          <SpaceBetween direction="horizontal" size="s">
            <FormField label={copy.ddb.createTableKeyNameLabel}>
              <Input
                value={pkName}
                onChange={({ detail }) => setPkName(detail.value)}
                disabled={mutation.isPending}
              />
            </FormField>
            <FormField label={copy.ddb.createTableKeyTypeLabel}>
              <Select
                selectedOption={
                  TYPE_OPTIONS.find((o) => o.value === pkType) ?? null
                }
                options={TYPE_OPTIONS}
                onChange={({ detail }) =>
                  setPkType((detail.selectedOption?.value as DdbKeyType) ?? 'S')
                }
                disabled={mutation.isPending}
              />
            </FormField>
          </SpaceBetween>

          <Toggle
            checked={hasSort}
            onChange={({ detail }) => setHasSort(detail.checked)}
            disabled={mutation.isPending}
          >
            {copy.ddb.createTableSortKeyToggle}
          </Toggle>

          {hasSort && (
            <SpaceBetween direction="horizontal" size="s">
              <FormField label={copy.ddb.createTableKeyNameLabel}>
                <Input
                  value={skName}
                  onChange={({ detail }) => setSkName(detail.value)}
                  disabled={mutation.isPending}
                />
              </FormField>
              <FormField label={copy.ddb.createTableKeyTypeLabel}>
                <Select
                  selectedOption={
                    TYPE_OPTIONS.find((o) => o.value === skType) ?? null
                  }
                  options={TYPE_OPTIONS}
                  onChange={({ detail }) =>
                    setSkType(
                      (detail.selectedOption?.value as DdbKeyType) ?? 'S',
                    )
                  }
                  disabled={mutation.isPending}
                />
              </FormField>
            </SpaceBetween>
          )}

          <FormField label={copy.ddb.createTableBillingModeLabel}>
            <RadioGroup
              value={billing}
              onChange={({ detail }) =>
                setBilling(detail.value as BillingMode)
              }
              items={[
                {
                  value: 'PAY_PER_REQUEST',
                  label: copy.ddb.createTableBillingOnDemand,
                },
                {
                  value: 'PROVISIONED',
                  label: copy.ddb.createTableBillingProvisioned,
                },
              ]}
            />
          </FormField>

          {billing === 'PROVISIONED' && (
            <SpaceBetween direction="horizontal" size="s">
              <FormField label={copy.ddb.createTableRcuLabel}>
                <Input
                  type="number"
                  value={rcu}
                  onChange={({ detail }) => setRcu(detail.value)}
                  disabled={mutation.isPending}
                />
              </FormField>
              <FormField label={copy.ddb.createTableWcuLabel}>
                <Input
                  type="number"
                  value={wcu}
                  onChange={({ detail }) => setWcu(detail.value)}
                  disabled={mutation.isPending}
                />
              </FormField>
            </SpaceBetween>
          )}
        </SpaceBetween>
      </Form>
    </Modal>
  )
}
