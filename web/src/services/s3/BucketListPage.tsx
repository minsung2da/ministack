import { useState } from 'react'
import Header from '@cloudscape-design/components/header'
import SpaceBetween from '@cloudscape-design/components/space-between'
import { useBuckets } from './api/useBuckets'
import { copy } from '../../shared/copy'
import { BucketTable } from './components/BucketTable'
import { BucketDetail } from './components/BucketDetail'
import { CreateBucketModal } from './components/CreateBucketModal'
import {
  DeleteBucketModal,
  type DeleteBucketResult,
} from './components/DeleteBucketModal'
import {
  useFlashNotifications,
  FlashNotifications,
} from '../ec2/components/FlashNotifications'
import { useSplitPanel } from '../../contexts/SplitPanelContext'
import type { S3Bucket } from '../../shared/types'

export default function BucketListPage() {
  const { data: buckets = [], isLoading, error, refetch } = useBuckets()
  const { items: flashItems, addSuccess, addError } = useFlashNotifications()
  const { setPanel, closePanel } = useSplitPanel()

  const [selectedItems, setSelectedItems] = useState<S3Bucket[]>([])
  const [createOpen, setCreateOpen] = useState(false)
  const [deleteTargets, setDeleteTargets] = useState<S3Bucket[] | null>(null)

  const handleSelectionChange = (bucket: S3Bucket | null) => {
    // Multi-select semantics for bulk delete preserved via local state.
    if (bucket) {
      setSelectedItems([bucket])
      setPanel(<BucketDetail bucket={bucket} />, bucket.name)
    } else {
      setSelectedItems([])
      closePanel()
    }
  }

  const handleCreated = (name: string) => {
    addSuccess(copy.s3.createBucketSuccess(name))
  }

  const handleDeleted = (result: DeleteBucketResult) => {
    // Flashbar per UI-SPEC §"Flashbar Notification Contract"
    if (result.deleted.length === 1) {
      addSuccess(copy.s3.deleteBucketSuccess(result.deleted[0]))
    } else if (result.deleted.length > 1) {
      addSuccess(copy.s3.bulkDeleteBucketsSuccess(result.deleted.length))
    }
    for (const err of result.errors) {
      // code === 'BucketNotEmpty' already maps to the UI-SPEC copy in the modal
      addError(err.message)
    }
    setDeleteTargets(null)
    setSelectedItems([])
    closePanel()
  }

  return (
    <SpaceBetween size="l">
      <FlashNotifications items={flashItems} />
      <Header variant="h1" description={copy.s3.serviceDescription}>
        {copy.s3.serviceHeading}
      </Header>
      <BucketTable
        buckets={buckets}
        loading={isLoading}
        error={(error as Error | null) ?? null}
        selectedItems={selectedItems}
        onRefresh={() => void refetch()}
        onCreate={() => setCreateOpen(true)}
        onDeleteSelected={(list) => setDeleteTargets(list)}
        onSelectionChange={handleSelectionChange}
      />
      <CreateBucketModal
        visible={createOpen}
        onDismiss={() => setCreateOpen(false)}
        onCreated={handleCreated}
      />
      <DeleteBucketModal
        visible={deleteTargets !== null}
        buckets={deleteTargets ?? []}
        onDismiss={() => setDeleteTargets(null)}
        onDeleted={handleDeleted}
      />
    </SpaceBetween>
  )
}
