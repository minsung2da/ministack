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

// Lambda domain types (Phase 4)

export type LambdaFunctionConfiguration = {
  FunctionName: string
  FunctionArn: string
  Runtime: string
  Handler: string
  CodeSize: number
  Description: string
  Timeout: number
  MemorySize: number
  LastModified: string // ISO string
  Version: string // '$LATEST' in Phase 4
  Role: string
  State: string
  LastUpdateStatus: string
  PackageType: 'Zip' | 'Image'
  Architectures: ('x86_64' | 'arm64')[]
  Environment: { Variables: Record<string, string> }
  Layers: { Arn: string }[]
  TracingConfig?: { Mode: 'PassThrough' | 'Active' }
  RevisionId: string
  EphemeralStorage?: { Size: number }
  LoggingConfig?: { LogFormat: string; LogGroup: string }
}

export type LambdaFunctionSummary = LambdaFunctionConfiguration

export type LambdaCodeSource =
  | { kind: 'zip'; ZipFile: string }
  | { kind: 's3'; S3Bucket: string; S3Key: string }
  | { kind: 'image'; ImageUri: string }

export type InvokeResult = {
  body: unknown
  logResult: string | null
  functionError: string | null
  executedVersion: string | null
}

export type LambdaEventSourceMapping = {
  UUID: string
  FunctionArn: string
  FunctionName?: string
  EventSourceArn: string
  State: string
  Enabled: boolean
  BatchSize: number
  LastModified: number // epoch seconds as float
  LastProcessingResult?: string
}

export type LambdaFunctionUrl = {
  FunctionUrl: string
  FunctionArn: string
  AuthType: 'NONE' | 'AWS_IAM'
  Cors: Record<string, unknown>
  CreationTime: string
  LastModifiedTime: string
}

// SQS domain types (Phase 5) — authoritative source lives in shared/types/sqs.ts;
// re-exported here so both `shared/types` and `shared/types/sqs` paths resolve.
export type {
  SqsQueueSummary,
  SqsRawAttributes,
  SqsQueueAttributes,
  SqsMessageAttribute,
  SqsMessage,
} from './types/sqs'
