import { SplitPanelDetail } from '../../ec2/components/SplitPanelDetail'
import { copy } from '../../../shared/copy'
import type { S3Bucket } from '../../../shared/types'

/**
 * SplitPanel content for a selected bucket (UI-SPEC §"Bucket List Layout"
 * bottom panel). Key-value pairs for Name, Region, Creation date.
 */
export function BucketDetail({ bucket }: { bucket: S3Bucket }) {
  return (
    <SplitPanelDetail
      header={bucket.name}
      keyValueItems={[
        { label: copy.s3.bucketPropertyName, value: bucket.name },
        { label: copy.s3.bucketPropertyRegion, value: copy.region },
        {
          label: copy.s3.bucketPropertyCreationDate,
          value: bucket.creationDate,
        },
      ]}
    />
  )
}
