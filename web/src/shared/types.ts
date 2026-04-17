export type ServiceCategory =
  | 'Compute'
  | 'Storage'
  | 'Database'
  | 'Networking & Content Delivery'
  | 'Application Integration'
  | 'Management & Governance'
  | 'Security, Identity & Compliance'
  | 'Other'

export type Service = {
  key: string
  name: string
  category: ServiceCategory
}

// S3 domain types (Phase 3)

export type S3Bucket = { name: string; creationDate: string }

export type S3ObjectEntry =
  | { kind: 'folder'; key: string; name: string }
  | {
      kind: 'file'
      key: string
      name: string
      size: number
      lastModified: string
      etag: string
    }

export type ListObjectsResult = {
  entries: S3ObjectEntry[]
  isTruncated: boolean
  nextContinuationToken: string | null
  keyCount: number
}

export type S3ObjectMetadata = {
  contentType: string
  contentLength: number
  etag: string
  lastModified: string
  storageClass?: string
  userMetadata: Record<string, string> // x-amz-meta-* stripped (Pitfall 10)
}

export type S3Tag = { key: string; value: string }
