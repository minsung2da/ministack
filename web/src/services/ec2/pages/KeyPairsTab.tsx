/**
 * KeyPairsTab — EC2 Key Pair management page.
 *
 * Features:
 *   - 4-column table: Name, Key pair ID, Type, Fingerprint
 *   - Create Key Pair modal with Name (required) and Type (rsa/ed25519)
 *   - On create success: shows private key material in a one-time alert (T-02-13)
 *   - Delete with type-to-confirm modal
 *   - Row click opens SplitPanel with key pair details
 *   - Flashbar success/error feedback
 */

import { useState, useCallback } from 'react'
import { useQueryClient } from '@tanstack/react-query'
import type { TableProps } from '@cloudscape-design/components/table'
import type { PropertyFilterProps } from '@cloudscape-design/components/property-filter'
import Button from '@cloudscape-design/components/button'
import SpaceBetween from '@cloudscape-design/components/space-between'
import FormField from '@cloudscape-design/components/form-field'
import Input from '@cloudscape-design/components/input'
import Select from '@cloudscape-design/components/select'
import Alert from '@cloudscape-design/components/alert'
import Textarea from '@cloudscape-design/components/textarea'
import Box from '@cloudscape-design/components/box'
import Modal from '@cloudscape-design/components/modal'

import type { Ec2KeyPair } from '../api/types'
import type { CreateKeyPairResult } from '../api/keyPairs'
import { useKeyPairs, useCreateKeyPair, useDeleteKeyPair } from '../api/keyPairs'
import { ResourceTable } from '../components/ResourceTable'
import { CreateModal } from '../components/CreateModal'
import { DeleteModal } from '../components/DeleteModal'
import { SplitPanelDetail } from '../components/SplitPanelDetail'
import {
  useFlashNotifications,
  FlashNotifications,
} from '../components/FlashNotifications'
import { useSplitPanel } from '../../../contexts/SplitPanelContext'

// ---------------------------------------------------------------------------
// Column definitions
// ---------------------------------------------------------------------------
const COLUMN_DEFINITIONS: TableProps.ColumnDefinition<Ec2KeyPair>[] = [
  {
    id: 'name',
    header: 'Name',
    cell: (item) => item.keyName || '-',
    sortingField: 'keyName',
    minWidth: 180,
  },
  {
    id: 'keyPairId',
    header: 'Key pair ID',
    cell: (item) => item.keyPairId,
    sortingField: 'keyPairId',
    width: 200,
  },
  {
    id: 'keyType',
    header: 'Type',
    cell: (item) => item.keyType || '-',
    sortingField: 'keyType',
    width: 100,
  },
  {
    id: 'keyFingerprint',
    header: 'Fingerprint',
    cell: (item) => item.keyFingerprint || '-',
    sortingField: 'keyFingerprint',
    minWidth: 300,
  },
]

// ---------------------------------------------------------------------------
// Filtering properties
// ---------------------------------------------------------------------------
const FILTERING_PROPERTIES: PropertyFilterProps.FilteringProperty[] = [
  {
    key: 'keyName',
    propertyLabel: 'Name',
    operators: ['=', '!=', ':', '!:'],
    groupValuesLabel: 'Name values',
  },
  {
    key: 'keyPairId',
    propertyLabel: 'Key pair ID',
    operators: ['=', '!=', ':', '!:'],
    groupValuesLabel: 'Key pair ID values',
  },
  {
    key: 'keyType',
    propertyLabel: 'Type',
    operators: ['=', '!='],
    groupValuesLabel: 'Type values',
  },
]

// ---------------------------------------------------------------------------
// Key type options
// ---------------------------------------------------------------------------
const KEY_TYPE_OPTIONS = [
  { value: 'rsa', label: 'RSA' },
  { value: 'ed25519', label: 'ED25519' },
]

// ---------------------------------------------------------------------------
// SplitPanel detail content
// ---------------------------------------------------------------------------
function KeyPairDetailPanel({ keyPair }: { keyPair: Ec2KeyPair }) {
  return (
    <SplitPanelDetail
      header={keyPair.keyName}
      keyValueItems={[
        { label: 'Key pair name', value: keyPair.keyName },
        { label: 'Key pair ID', value: keyPair.keyPairId },
        { label: 'Key type', value: keyPair.keyType || '-' },
        { label: 'Fingerprint', value: keyPair.keyFingerprint || '-' },
      ]}
    />
  )
}

// ---------------------------------------------------------------------------
// Private key display modal (one-time, T-02-13)
// ---------------------------------------------------------------------------
function PrivateKeyModal({
  visible,
  keyName,
  keyMaterial,
  onDismiss,
}: {
  visible: boolean
  keyName: string
  keyMaterial: string
  onDismiss: () => void
}) {
  const [copied, setCopied] = useState(false)

  const handleCopy = useCallback(() => {
    void navigator.clipboard.writeText(keyMaterial).then(() => {
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    })
  }, [keyMaterial])

  return (
    <Modal
      visible={visible}
      header={`Key pair created: ${keyName}`}
      onDismiss={onDismiss}
      size="large"
      footer={
        <Box float="right">
          <Button variant="primary" onClick={onDismiss}>
            Close
          </Button>
        </Box>
      }
    >
      <SpaceBetween size="m">
        <Alert type="warning">
          This is the only time you can download the private key file. After you close
          this dialog, AWS will not provide you access to the private key again.
        </Alert>
        <FormField label="Private key (PEM)">
          <Textarea
            value={keyMaterial}
            readOnly
            rows={12}
          />
        </FormField>
        <Button onClick={handleCopy} iconName={copied ? 'check' : 'copy'}>
          {copied ? 'Copied!' : 'Copy to clipboard'}
        </Button>
      </SpaceBetween>
    </Modal>
  )
}

// ---------------------------------------------------------------------------
// KeyPairsTab component
// ---------------------------------------------------------------------------
export default function KeyPairsTab() {
  const queryClient = useQueryClient()
  const { data: keyPairs = [], isLoading } = useKeyPairs()
  const [selectedItems, setSelectedItems] = useState<Ec2KeyPair[]>([])

  // Create modal state
  const [createVisible, setCreateVisible] = useState(false)
  const [createName, setCreateName] = useState('')
  const [createNameError, setCreateNameError] = useState('')
  const [createKeyType, setCreateKeyType] = useState<{ value: string; label: string }>(
    KEY_TYPE_OPTIONS[0],
  )

  // Private key modal state (T-02-13: one-time display)
  const [privateKeyVisible, setPrivateKeyVisible] = useState(false)
  const [privateKeyResult, setPrivateKeyResult] = useState<CreateKeyPairResult | null>(null)

  // Delete modal state
  const [deleteVisible, setDeleteVisible] = useState(false)
  const [deleteTarget, setDeleteTarget] = useState<Ec2KeyPair | null>(null)

  const { items: flashItems, addSuccess, addError } = useFlashNotifications()
  const { setPanel } = useSplitPanel()

  const createMutation = useCreateKeyPair()
  const deleteMutation = useDeleteKeyPair()

  // ----- refresh -----
  const handleRefresh = useCallback(() => {
    void queryClient.invalidateQueries({ queryKey: ['ec2', 'key-pairs'] })
  }, [queryClient])

  // ----- row click -----
  const handleRowClick = useCallback(
    (keyPair: Ec2KeyPair) => {
      setPanel(<KeyPairDetailPanel keyPair={keyPair} />, keyPair.keyName)
    },
    [setPanel],
  )

  // ----- create -----
  const openCreate = () => {
    setCreateName('')
    setCreateNameError('')
    setCreateKeyType(KEY_TYPE_OPTIONS[0])
    setCreateVisible(true)
  }

  const handleCreate = useCallback(async () => {
    const trimmed = createName.trim()
    if (!trimmed) {
      setCreateNameError('Key pair name is required.')
      return
    }
    setCreateNameError('')
    try {
      const result = await createMutation.mutateAsync({
        keyName: trimmed,
        keyType: createKeyType.value as 'rsa' | 'ed25519',
      })
      setCreateVisible(false)
      if (result.keyMaterial) {
        // T-02-13: show private key once, never persist
        setPrivateKeyResult(result)
        setPrivateKeyVisible(true)
      } else {
        addSuccess(`Key pair "${trimmed}" created successfully.`)
      }
    } catch (err) {
      addError(`Failed to create key pair: ${String(err)}`)
    }
  }, [createName, createKeyType, createMutation, addSuccess, addError])

  const handlePrivateKeyClose = useCallback(() => {
    setPrivateKeyVisible(false)
    if (privateKeyResult) {
      addSuccess(`Key pair "${privateKeyResult.keyName}" created successfully.`)
    }
    setPrivateKeyResult(null)
  }, [privateKeyResult, addSuccess])

  // ----- delete -----
  const openDelete = () => {
    if (selectedItems.length === 0) return
    setDeleteTarget(selectedItems[0])
    setDeleteVisible(true)
  }

  const handleDeleteConfirm = useCallback(async () => {
    if (!deleteTarget) return
    try {
      await deleteMutation.mutateAsync(deleteTarget.keyPairId)
      addSuccess(`Key pair "${deleteTarget.keyName}" deleted.`)
      setDeleteVisible(false)
      setDeleteTarget(null)
      setSelectedItems([])
    } catch (err) {
      addError(`Failed to delete key pair: ${String(err)}`)
      setDeleteVisible(false)
    }
  }, [deleteTarget, deleteMutation, addSuccess, addError])

  return (
    <>
      <FlashNotifications items={flashItems} />

      <ResourceTable
        items={keyPairs}
        loading={isLoading}
        columnDefinitions={COLUMN_DEFINITIONS}
        resourceType="key-pairs"
        filteringProperties={FILTERING_PROPERTIES}
        selectedItems={selectedItems}
        onSelectionChange={setSelectedItems}
        onRowClick={handleRowClick}
        headerActions={
          <SpaceBetween direction="horizontal" size="xs">
            <Button
              iconName="refresh"
              variant="icon"
              onClick={handleRefresh}
              ariaLabel="Refresh key pairs"
            />
            <Button
              disabled={selectedItems.length === 0 || deleteMutation.isPending}
              onClick={openDelete}
            >
              Delete
            </Button>
            <Button variant="primary" onClick={openCreate}>
              Create key pair
            </Button>
          </SpaceBetween>
        }
      />

      {/* Create key pair modal */}
      <CreateModal
        visible={createVisible}
        header="Create key pair"
        onDismiss={() => setCreateVisible(false)}
        onSubmit={handleCreate}
        loading={createMutation.isPending}
        submitLabel="Create key pair"
      >
        <FormField
          label={
            <>
              Name <Box display="inline" color="text-status-error">*</Box>
            </>
          }
          errorText={createNameError}
          description="A unique name for the key pair."
        >
          <Input
            value={createName}
            onChange={({ detail }) => {
              setCreateName(detail.value)
              if (createNameError) setCreateNameError('')
            }}
            placeholder="my-key-pair"
          />
        </FormField>
        <FormField label="Key pair type">
          <Select
            selectedOption={createKeyType}
            onChange={({ detail }) =>
              setCreateKeyType(detail.selectedOption as { value: string; label: string })
            }
            options={KEY_TYPE_OPTIONS}
          />
        </FormField>
      </CreateModal>

      {/* Private key one-time display (T-02-13) */}
      {privateKeyResult && privateKeyResult.keyMaterial && (
        <PrivateKeyModal
          visible={privateKeyVisible}
          keyName={privateKeyResult.keyName}
          keyMaterial={privateKeyResult.keyMaterial}
          onDismiss={handlePrivateKeyClose}
        />
      )}

      {/* Delete key pair modal */}
      {deleteTarget && (
        <DeleteModal
          visible={deleteVisible}
          resourceType="Key pair"
          resourceId={deleteTarget.keyPairId}
          onConfirm={handleDeleteConfirm}
          onDismiss={() => {
            setDeleteVisible(false)
            setDeleteTarget(null)
          }}
          loading={deleteMutation.isPending}
        />
      )}
    </>
  )
}
