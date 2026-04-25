export const copy = {
  // ── Phase 1 ─────────────────────────────────────────────────────────────────
  brand: 'MiniStack',
  brandTagline: 'Local AWS Emulator',
  searchPlaceholder: 'Search services',
  searchEmpty: (q: string) => `No services match "${q}"`,
  searchNoServices:
    'No services are active. Start MiniStack with at least one service enabled.',
  sidebarHeader: 'Services',
  consoleHomeHeading: 'Console Home',
  consoleHomeDescription:
    'Browse and manage all resources in your local MiniStack emulator.',
  serviceHomeDescription: (name: string) =>
    `Resources managed by the ${name} emulator.`,
  serviceHomeEmptyHeading: 'No resources yet',
  serviceHomeEmptyBody:
    'Create resources via the AWS CLI or SDK pointed at http://localhost:4566, then refresh this page.',
  serviceHomeErrorHeading: 'Could not load resources',
  serviceHomeErrorBody: (name: string) =>
    `MiniStack returned an error while reading ${name} state. Check that the service is enabled and try again.`,
  serviceHomeErrorRetry: 'Try Again',
  notFoundHeading: 'Page not found',
  notFoundBody:
    'The page you are looking for does not exist in the MiniStack console.',
  notFoundLink: 'Go to Console Home',
  region: 'us-east-1',
  breadcrumbRoot: 'Console',

  // ── Phase 2 — EC2 Dashboard ──────────────────────────────────────────────────

  // Page-level
  ec2Heading: 'EC2',
  ec2Description: 'Manage your EC2 instances and related resources.',

  // Table header: "Instances (12)"
  ec2TableHeader: (resource: string, count: number) => `${resource} (${count})`,

  // Empty state headings
  ec2EmptyHeading: (resource: string) => `No ${resource}`,

  // Empty state bodies keyed by Ec2ResourceType slug
  ec2EmptyBody: {
    instances:
      'You have no EC2 instances in this region. Launch an instance to get started.',
    vpcs: 'You have no VPCs. Create a VPC to define a virtual network.',
    subnets: 'You have no subnets. Create a subnet within a VPC.',
    'security-groups':
      'You have no security groups. Create a security group to control traffic.',
    'key-pairs': 'You have no key pairs. Create a key pair for SSH access.',
    volumes:
      'You have no EBS volumes. Create a volume for persistent storage.',
    snapshots:
      'You have no snapshots. Create a snapshot to back up a volume.',
    'elastic-ips':
      'You have no Elastic IPs allocated. Allocate an Elastic IP for a static public address.',
    'internet-gateways':
      'You have no internet gateways. Create one to enable internet access for a VPC.',
    'nat-gateways':
      'You have no NAT gateways. Create one to allow private subnets to access the internet.',
    'route-tables':
      'No route tables found. Route tables are created automatically with VPCs.',
    'network-interfaces':
      'No network interfaces found. Network interfaces are created with instances and other resources.',
  } as Record<string, string>,

  // Empty state CTAs keyed by Ec2ResourceType slug (list-only resources have no CTA)
  ec2EmptyCta: {
    instances: 'Launch instance',
    vpcs: 'Create VPC',
    subnets: 'Create subnet',
    'security-groups': 'Create security group',
    'key-pairs': 'Create key pair',
    volumes: 'Create volume',
    snapshots: 'Create snapshot',
    'elastic-ips': 'Allocate Elastic IP address',
    'internet-gateways': 'Create internet gateway',
    'nat-gateways': 'Create NAT gateway',
  } as Record<string, string>,

  // Error state copy
  ec2LoadError: (resource: string) => `Could not load ${resource}`,
  ec2LoadErrorBody: (resource: string) =>
    `MiniStack returned an error while fetching ${resource}. Check that the EC2 service is enabled and try again.`,
  ec2LoadErrorRetry: 'Retry',

  // Action success messages (Flashbar) keyed by action + resource
  ec2ActionSuccess: {
    launchInstance: (instanceId: string) =>
      `Instance ${instanceId} launched successfully.`,
    startInstance: (instanceId: string) =>
      `Start initiated for instance ${instanceId}.`,
    stopInstance: (instanceId: string) =>
      `Stop initiated for instance ${instanceId}.`,
    rebootInstance: (instanceId: string) =>
      `Reboot initiated for instance ${instanceId}.`,
    terminateInstance: (instanceId: string) =>
      `Termination initiated for instance ${instanceId}.`,
    createVpc: (vpcId: string) => `VPC ${vpcId} created successfully.`,
    createSubnet: (subnetId: string) =>
      `Subnet ${subnetId} created successfully.`,
    createSecurityGroup: (sgId: string) =>
      `Security group ${sgId} created successfully.`,
    createKeyPair: (keyName: string) =>
      `Key pair ${keyName} created successfully.`,
    createVolume: (volumeId: string) =>
      `Volume ${volumeId} created successfully.`,
    createSnapshot: (snapshotId: string) =>
      `Snapshot ${snapshotId} created successfully.`,
    allocateElasticIp: (allocationId: string) =>
      `Elastic IP ${allocationId} allocated successfully.`,
    createInternetGateway: (igwId: string) =>
      `Internet gateway ${igwId} created successfully.`,
    createNatGateway: (natGwId: string) =>
      `NAT gateway ${natGwId} created successfully.`,
    deleteResource: (resourceType: string, resourceId: string) =>
      `${resourceType} ${resourceId} deleted successfully.`,
    bulkDeleteResources: (count: number, resourceType: string) =>
      `${count} ${resourceType}s deleted successfully.`,
  },

  // Delete confirmation copy
  ec2DeleteHeader: (resourceType: string) => `Delete ${resourceType}`,
  ec2DeleteBody: (resourceType: string, resourceId: string) =>
    `Are you sure you want to delete ${resourceType} ${resourceId}? This action cannot be undone.`,
  ec2DeleteConfirmPrompt: (resourceId: string) =>
    `To confirm deletion, type "${resourceId}"`,
  ec2BulkDeleteHeader: (count: number, resourceType: string) =>
    `Delete ${count} ${resourceType}s`,
  ec2BulkDeleteBody: (count: number, resourceType: string) =>
    `Are you sure you want to delete these ${count} ${resourceType}s? This action cannot be undone.`,
  ec2BulkDeleteConfirmPrompt: 'To confirm deletion, type "delete"',
  ec2TerminateHeader: 'Terminate instance',
  ec2TerminateBody: (instanceId: string) =>
    `Are you sure you want to terminate instance ${instanceId}? This action cannot be undone. All data on instance store volumes will be lost.`,
  ec2TerminateConfirmPrompt: (instanceId: string) =>
    `To confirm, type "${instanceId}"`,
  ec2TerminateCta: 'Terminate',
  ec2BulkTerminateHeader: (count: number) => `Terminate ${count} instances`,
  ec2BulkTerminateBody: (count: number) =>
    `Are you sure you want to terminate these ${count} instances? This action cannot be undone.`,
  ec2BulkTerminateConfirmPrompt: 'To confirm, type "terminate"',

  // Wizard copy
  ec2WizardHeader: 'Launch an instance',
  ec2WizardSteps: [
    { title: 'Name and instance type', description: 'Choose a name and instance type for your instance.' },
    { title: 'Network settings', description: 'Configure the network settings for your instance.' },
    { title: 'Security', description: 'Configure security groups and key pairs.' },
    { title: 'Review and launch', description: 'Review your instance configuration before launching.' },
  ],
  ec2WizardCancel: 'Discard and exit',
  ec2WizardSubmit: 'Launch instance',

  // Miscellaneous UI copy
  ec2RefreshTooltip: 'Refresh',
  ec2FilterPlaceholder: 'Search by property or value',
  ec2PreferencesButton: 'Preferences',
  ec2PageSizeLabel: 'Page size',
  ec2NoMatchHeading: 'No matches',
  ec2NoMatchBody: (resource: string) =>
    `No ${resource} match the selected filters.`,
  ec2NoMatchCta: 'Clear filters',

  // ── Phase 3 — S3 ──────────────────────────────────────────────────────────────
  s3: {
    // Page-level
    serviceHeading: 'S3',
    serviceDescription: 'Manage buckets and objects.',
    objectBrowserHeading: (bucketName: string) => bucketName,

    // Bucket list
    bucketsTableHeader: (count: number) => `Buckets (${count})`,
    bucketsFilterPlaceholder: 'Find buckets',
    bucketsEmptyHeading: 'No buckets',
    bucketsEmptyBody:
      'You have no S3 buckets. Create a bucket to store objects.',
    bucketsEmptyCta: 'Create bucket',
    bucketsNoMatchHeading: 'No matches',
    bucketsNoMatchBody: 'No buckets match the filter.',
    bucketsNoMatchCta: 'Clear filter',
    bucketsLoadErrorHeading: 'Could not load buckets',
    bucketsLoadErrorBody:
      'MiniStack returned an error while fetching buckets. Check that the S3 service is enabled and try again.',
    bucketsLoadErrorRetry: 'Retry',

    // Create Bucket modal
    createBucketHeader: 'Create bucket',
    createBucketNameLabel: 'Bucket name',
    createBucketNameHelp:
      '3-63 characters, lowercase letters, numbers, and hyphens only.',
    createBucketNamePlaceholder: 'my-bucket-name',
    createBucketButton: 'Create bucket',
    createBucketCancel: 'Cancel',
    createBucketSuccess: (bucketName: string) =>
      `Bucket ${bucketName} created successfully.`,

    // Delete bucket
    deleteBucketHeader: 'Delete bucket',
    deleteBucketBody: (bucketName: string) =>
      `Are you sure you want to delete bucket ${bucketName}? The bucket must be empty before it can be deleted. This action cannot be undone.`,
    deleteBucketConfirmPrompt: (bucketName: string) =>
      `To confirm deletion, type "${bucketName}"`,
    deleteBucketCta: 'Delete',
    deleteBucketCancel: 'Cancel',
    bulkDeleteBucketsHeader: (count: number) => `Delete ${count} buckets`,
    bulkDeleteBucketsBody: (count: number) =>
      `Are you sure you want to delete these ${count} buckets? Each bucket must be empty before it can be deleted. This action cannot be undone.`,
    bulkDeleteBucketsConfirmPrompt: 'To confirm deletion, type "delete"',
    bulkDeleteBucketsCta: 'Delete',
    deleteBucketSuccess: (bucketName: string) =>
      `Bucket ${bucketName} deleted successfully.`,
    bulkDeleteBucketsSuccess: (count: number) =>
      `${count} buckets deleted successfully.`,
    deleteBucketNotEmpty: (bucketName: string) =>
      `Cannot delete bucket ${bucketName}: bucket is not empty. Delete all objects first.`,

    // Object browser
    objectsTableHeader: (count: number) => `Objects (${count})`,
    objectsFilterPlaceholder: 'Find objects by name',
    objectsParentRowName: '..',
    emptyBucketHeading: 'Empty bucket',
    emptyBucketBody:
      'Drag files here to upload, or use the Upload button above.',
    emptyBucketCta: 'Upload',
    emptyPrefixHeading: 'No objects in this folder',
    emptyPrefixBody:
      'This folder has no objects. Drag files here or upload to a different prefix.',
    objectsNoMatchHeading: 'No matches',
    objectsNoMatchBody: 'No objects on this page match the filter.',
    objectsNoMatchCta: 'Clear filter',
    objectsLoadErrorHeading: 'Could not load objects',
    objectsLoadErrorBody: (bucketName: string) =>
      `MiniStack returned an error while fetching objects from ${bucketName}. Check that the S3 service is enabled and try again.`,
    objectsLoadErrorRetry: 'Retry',
    dropZoneOverlayRoot: 'Drop files to upload to bucket root',
    dropZoneOverlayWithPrefix: (currentPrefix: string) =>
      `Drop files to upload to ${currentPrefix}`,
    dropZoneAria: 'Drop files to upload',

    // Upload
    uploadButton: 'Upload',
    uploadQueuedHeader: (filename: string) => `Queued: ${filename}`,
    uploadQueuedBody: 'Waiting to start',
    uploadInProgressHeader: (filename: string) => `Uploading: ${filename}`,
    uploadInProgressBody: (percent: number, uploaded: string, total: string) =>
      `${percent}% — ${uploaded} of ${total}`,
    uploadSuccessHeader: (filename: string) => `Uploaded: ${filename}`,
    uploadSuccessBody: (bucketName: string, fullKey: string) =>
      `Uploaded to s3://${bucketName}/${fullKey}`,
    uploadFailureHeader: (filename: string) => `Upload failed: ${filename}`,
    uploadFailureBody: (errorMessage: string) => errorMessage,
    uploadRetryLink: 'Retry',
    uploadCancelledHeader: (filename: string) =>
      `Upload cancelled: ${filename}`,
    uploadCancelledBody: 'Upload was cancelled before completion.',
    uploadCancelButton: 'Cancel',

    // Download
    downloadButton: 'Download',
    downloadInProgressHeader: (filename: string) => `Downloading: ${filename}`,
    downloadSuccessHeader: (filename: string) => `Downloaded: ${filename}`,
    downloadFailureHeader: 'Could not download object',
    downloadFailureBody: (objectKey: string, errorMessage: string) =>
      `Failed to download ${objectKey}: ${errorMessage}`,

    // Object detail
    splitPanelTabProperties: 'Properties',
    splitPanelTabMetadata: 'Metadata',
    splitPanelTabTags: 'Tags',
    metadataEmpty: 'No user metadata set for this object.',
    tagsEmpty: 'No tags on this object.',
    propertyKey: 'Key',
    propertySize: 'Size',
    propertyContentType: 'Content type',
    propertyLastModified: 'Last modified',
    propertyEtag: 'ETag',
    propertyStorageClass: 'Storage class',
    copyKeyButton: 'Copy key',
    copyS3UriButton: 'Copy S3 URI',
    copyBucketNameButton: 'Copy bucket name',

    // Object delete
    deleteObjectHeader: 'Delete object',
    deleteObjectBody: (fullObjectKey: string) =>
      `Are you sure you want to delete ${fullObjectKey}? This action cannot be undone.`,
    deleteObjectConfirmPrompt: (fullObjectKey: string) =>
      `To confirm deletion, type "${fullObjectKey}"`,
    deleteObjectCta: 'Delete',
    bulkDeleteObjectsHeader: (count: number) => `Delete ${count} objects`,
    bulkDeleteObjectsBody: (count: number) =>
      `Are you sure you want to delete these ${count} objects? This action cannot be undone.`,
    bulkDeleteObjectsConfirmPrompt: 'To confirm deletion, type "delete"',
    bulkDeleteObjectsCta: 'Delete',
    deleteObjectSuccess: (objectKey: string) =>
      `Object ${objectKey} deleted successfully.`,
    bulkDeleteObjectsSuccess: (count: number) =>
      `${count} objects deleted successfully.`,
    partialBulkDeleteFailure: (failedCount: number, totalCount: number) =>
      `Failed to delete ${failedCount} of ${totalCount} objects.`,
    deleteObjectFailure: (objectKey: string, errorMessage: string) =>
      `Failed to delete ${objectKey}: ${errorMessage}`,

    // Miscellaneous
    refreshTooltip: 'Refresh',
    preferencesButton: 'Preferences',
    pageSizeLabel: 'Page size',
    actionsDropdownButton: 'Actions',
    previousPageButton: 'Previous',
    nextPageButton: 'Next',
    splitPanelCloseLabel: 'Close panel',
    bucketDetailTabProperties: 'Properties',
    bucketPropertyName: 'Name',
    bucketPropertyRegion: 'Region',
    bucketPropertyCreationDate: 'Creation date',
    bucketPropertyObjects: 'Objects',
    loadingBuckets: 'Loading buckets',
    loadingObjects: 'Loading objects',
  },

  // ── Phase 4 — Lambda ─────────────────────────────────────────────────────────
  lambda: {
    // Page-level
    serviceHeading: 'Lambda',
    serviceDescription:
      'Manage Lambda functions — list, configure, test-invoke, and delete.',

    // Function list
    functionsTableHeader: (count: number) => `Functions (${count})`,
    functionsFilterPlaceholder: 'Find functions',
    functionsEmptyHeading: 'No functions',
    functionsEmptyBody: 'Create your first Lambda function to get started.',
    functionsEmptyCta: 'Create function',
    functionsNoMatchHeading: 'No matches',
    functionsNoMatchBody: 'No functions match the filter.',
    functionsNoMatchCta: 'Clear filter',
    functionsLoadErrorHeader: 'Could not load functions',
    functionsLoadErrorBody:
      'MiniStack returned an error while fetching Lambda functions. Check that the Lambda service is enabled and try again.',
    functionsLoadErrorRetry: 'Retry',
    loadingFunctions: 'Loading functions',

    // Miscellaneous UI
    refreshTooltip: 'Refresh',
    preferencesButton: 'Preferences',
    pageSizeLabel: 'Page size',
    actionsDropdownButton: 'Actions',
    previousPageButton: 'Previous',
    nextPageButton: 'Next',
    cancelButton: 'Cancel',

    // Create function modal
    createFunctionButton: 'Create function',
    createFunctionHeader: 'Create function',
    createFunctionSubmit: 'Create',
    createFunctionNameLabel: 'Function name',
    createFunctionNameHelp:
      '1–64 chars; letters, numbers, hyphens, underscores.',
    createFunctionNamePlaceholder: 'my-function',
    createFunctionRuntimeLabel: 'Runtime',
    createFunctionHandlerLabel: 'Handler',
    createFunctionRoleLabel: 'Execution role ARN',
    createFunctionMemoryLabel: 'Memory (MB)',
    createFunctionTimeoutLabel: 'Timeout (seconds)',
    createFunctionCodeSourceLabel: 'Code source',
    createFunctionNameInvalid:
      'Function name must be 1–64 chars of letters, numbers, hyphens, underscores.',
    createFunctionSuccess: (name: string) =>
      `Function ${name} created successfully.`,
    createFunctionFailure: (message: string) => `Create failed: ${message}`,

    // Code source tiles
    codeSourceZipLabel: 'Upload .zip file',
    codeSourceZipDescription: 'Upload a pre-built deployment package.',
    codeSourceS3Label: 'S3 bucket + key',
    codeSourceS3Description:
      'Backend fetches the zip from S3. Recommended for files larger than 50 MB.',
    codeSourceImageLabel: 'Container image URI',
    codeSourceImageDescription:
      'Use a prebuilt container image from ECR or a public registry.',
    codeSourceZipFileLabel: 'Zip file',
    codeSourceZipFileHint: 'Select a .zip deployment package',
    codeSourceZipUploadButton: 'Choose file',
    codeSourceZipUploadLimit: (n: number) => `Only ${n} file allowed`,
    codeSourceS3BucketLabel: 'S3 bucket',
    codeSourceS3KeyLabel: 'S3 key',
    codeSourceImageUriLabel: 'Image URI',

    // Delete function modal
    deleteFunctionHeader: (name: string) => `Delete function ${name}?`,
    deleteFunctionBody: (name: string) =>
      `Are you sure you want to delete the function ${name}? This action cannot be undone.`,
    deleteFunctionConfirmPrompt: (name: string) => `Type ${name} to confirm.`,
    deleteFunctionSubmit: 'Delete',
    deleteFunctionSuccess: (name: string) => `Function ${name} deleted.`,
    deleteFunctionFailure: (name: string, message: string) =>
      `Delete failed for ${name}: ${message}`,

    // Detail page sections (reserved for Plan 04/05)
    configurationHeading: 'Configuration',
    environmentHeading: 'Environment variables',
    triggersHeading: 'Triggers',
    testHeading: 'Test',
    environmentEmpty: 'No environment variables configured.',
    triggersEmpty: 'No triggers configured for this function.',
    triggersEsmsEmpty: 'No event source mappings configured for this function.',
    triggersUrlsEmpty: 'No function URLs configured for this function.',
    eventSourceMappingsHeading: 'Event source mappings',
    functionUrlsHeading: 'Function URLs',

    // Detail page load / error
    notFoundHeader: 'Function not found',
    notFoundBody: 'This function does not exist.',
    notFoundBackLink: 'Back to functions',
    detailLoadErrorHeader: 'Could not load function',
    copyFunctionNameButton: 'Copy name',
    copyArnButton: 'Copy',
    testTabPlaceholder: 'Test tab coming in Plan 05.',

    // Invoke (reserved for Plan 05)
    invokeButton: 'Invoke',
    invokingCopy: 'Invoking... cold start으로 10초+ 걸릴 수 있습니다',
    stillInvokingCopy: 'Still invoking...',
    invokeResponseHeader: 'Response payload',
    invokeLogsHeader: 'Logs',
    invokeLogsEmpty: 'No logs returned for this invocation.',
    invokeFunctionErrorHeading: 'Function returned an error',
    payloadLabel: 'Payload',
    payloadSampleLabel: 'Sample payload',
    payloadInvalidJson: (msg: string) => `Invalid JSON: ${msg}`,
  },

  // ── Phase 5 — DynamoDB ──────────────────────────────────────────────────────
  ddb: {
    // Page-level
    serviceHeading: 'DynamoDB',
    serviceDescription:
      'Manage tables and items — browse, scan, and edit.',

    // Table list
    tablesTableHeader: (count: number) => `Tables (${count})`,
    tablesFilterPlaceholder: 'Find tables',
    tablesEmptyHeading: 'No tables',
    tablesEmptyBody: 'Create your first table to get started.',
    tablesEmptyCta: 'Create table',
    tablesNoMatchHeading: 'No matches',
    tablesNoMatchBody: 'No tables match the filter.',
    tablesLoadErrorHeader: 'Could not load tables',
    tablesLoadErrorBody:
      'MiniStack returned an error while fetching DynamoDB tables.',
    tablesLoadErrorRetry: 'Retry',
    loadingTables: 'Loading tables',

    // Miscellaneous UI
    refreshTooltip: 'Refresh',
    preferencesButton: 'Preferences',
    pageSizeLabel: 'Page size',
    actionsDropdownButton: 'Actions',
    previousPageButton: 'Previous',
    nextPageButton: 'Next',
    cancelButton: 'Cancel',

    // Create table modal
    createTableButton: 'Create table',
    createTableHeader: 'Create table',
    createTableSubmit: 'Create',
    createTableNameLabel: 'Table name',
    createTableNameHelp:
      '3–255 chars; letters, numbers, dot, hyphen, underscore.',
    createTableNamePlaceholder: 'my-table',
    createTableNameInvalid:
      'Table name must be 3–255 chars of letters, numbers, dot, hyphen, underscore.',
    createTablePartitionKeyHeading: 'Partition key',
    createTableSortKeyToggle: 'Add sort key',
    createTableSortKeyHeading: 'Sort key',
    createTableKeyNameLabel: 'Attribute name',
    createTableKeyTypeLabel: 'Type',
    createTableBillingModeLabel: 'Billing mode',
    createTableBillingProvisioned: 'Provisioned',
    createTableBillingOnDemand: 'On-demand (pay per request)',
    createTableRcuLabel: 'Read capacity units',
    createTableWcuLabel: 'Write capacity units',
    createTableSuccess: (name: string) => `Table ${name} created.`,
    createTableFailure: (msg: string) => `Create failed: ${msg}`,

    // Delete table modal
    deleteTableHeader: (name: string) => `Delete table ${name}?`,
    deleteTableBody: (name: string) =>
      `Are you sure you want to delete ${name}? All items will be lost. This action cannot be undone.`,
    deleteTableConfirmPrompt: (name: string) => `Type ${name} to confirm.`,
    deleteTableSubmit: 'Delete',
    deleteTableSuccess: (name: string) => `Table ${name} deleted.`,
    deleteTableFailure: (name: string, msg: string) =>
      `Delete failed for ${name}: ${msg}`,

    // Table columns
    tableColumnName: 'Name',
    tableColumnStatus: 'Status',
    tableColumnItems: 'Items',
    tableColumnSizeBytes: 'Size (bytes)',
    tableColumnCreated: 'Created',

    // Detail page (Tabs)
    itemsHeading: 'Items',
    configurationHeading: 'Configuration',
    notFoundHeader: 'Table not found',
    notFoundBody: 'This table does not exist.',
    notFoundBackLink: 'Back to tables',
    detailLoadErrorHeader: 'Could not load table',
    copyTableNameButton: 'Copy name',

    // Items tab (scan controls)
    itemsScanFilterLabel: 'FilterExpression',
    itemsScanFilterPlaceholder: 'attribute_exists(pk)',
    itemsScanRunButton: 'Run scan',
    itemsPrevButton: 'Previous',
    itemsNextButton: 'Next',
    itemsEmpty: 'No items in this table.',
    itemsScanError: (msg: string) => `Scan failed: ${msg}`,
    itemsPutButton: 'Put item',
    itemsEditButton: 'Edit',
    itemsDeleteButton: 'Delete',

    // Configuration tab
    configKeySchemaHeading: 'Key schema',
    configAttributeDefinitionsHeading: 'Attribute definitions',
    configGsiHeading: 'Global secondary indexes',
    configGsiEmpty: 'No secondary indexes.',
    configBillingModeHeading: 'Billing mode',
    configProvisionedThroughputHeading: 'Provisioned throughput',
    configTableStatusLabel: 'Status',
    configTableArnLabel: 'ARN',
    configCreationDateTimeLabel: 'Created',
    configItemCountLabel: 'Items',
    configTableSizeBytesLabel: 'Size (bytes)',
    configRcuLabel: 'Read capacity',
    configWcuLabel: 'Write capacity',
    configAttrNameColumn: 'Attribute name',
    configAttrKeyTypeColumn: 'Key type',
    configAttrTypeColumn: 'Type',

    // Item CRUD — PutItem (form / JSON toggle per D-03)
    createItemButton: 'Put item',
    createItemHeader: 'Put item',
    editItemHeader: (key: string) => `Edit item ${key}`,
    itemFormTab: 'Form',
    itemJsonTab: 'JSON',
    itemFormAddAttributeButton: 'Add attribute',
    itemFormRemoveAttributeButton: 'Remove',
    itemFormAttributeNameLabel: 'Attribute name',
    itemFormAttributeTypeLabel: 'Type',
    itemFormAttributeValueLabel: 'Value',
    itemFormNumberInvalid: 'Not a valid number.',
    itemJsonLabel: 'JSON (AttributeValue map)',
    itemJsonInvalid: (msg: string) => `Invalid JSON: ${msg}`,
    itemJsonToggleBlocked:
      'Contains non-scalar attributes — JSON mode only per D-06.',
    itemSaveButton: 'Save',
    itemSaveSuccess: 'Item saved.',
    itemSaveFailure: (msg: string) => `Save failed: ${msg}`,

    // Item CRUD — DeleteItem
    deleteItemHeader: 'Delete item',
    deleteItemBody: (key: string) =>
      `Are you sure you want to delete item ${key}? This action cannot be undone.`,
    deleteItemConfirmPrompt: (key: string) => `Type ${key} to confirm.`,
    deleteItemSubmit: 'Delete',
    deleteItemSuccess: 'Item deleted.',
    deleteItemFailure: (msg: string) => `Delete failed: ${msg}`,
  },

  // ── Phase 5 — SQS ───────────────────────────────────────────────────────────
  sqs: {
    serviceHeading: 'Simple Queue Service',
    serviceDescription: 'Manage queues and messages.',
    queuesTableHeader: (count: number) => `Queues (${count})`,
    queuesFilterPlaceholder: 'Find queues',
    queuesEmptyHeading: 'No queues',
    queuesEmpty: 'No queues yet. Click Create queue to get started.',
    queuesNoMatchHeading: 'No matches',
    queuesNoMatchBody: 'No queues match the filter.',
    queuesLoadErrorHeader: 'Could not load queues',
    loadingQueues: 'Loading queues',
    loadErrorRetry: 'Retry',
    refreshTooltip: 'Refresh',
    preferencesButton: 'Preferences',
    pageSizeLabel: 'Page size',
    actionsDropdownButton: 'Actions',
    cancelButton: 'Cancel',
    // Create
    createButton: 'Create queue',
    createHeader: 'Create queue',
    queueNameLabel: 'Queue name',
    queueNameInvalid: '1–80 chars; letters, numbers, hyphens, underscores.',
    attributesLabel: 'Attributes',
    attributesDescription: 'Optional key/value attribute pairs.',
    addAttributeButton: 'Add attribute',
    createSuccess: (name: string) => `Queue ${name} created successfully.`,
    createErrorHeader: 'Could not create queue',
    // Delete
    deleteButton: 'Delete',
    deleteHeader: (name: string) => `Delete queue ${name}?`,
    deleteBody: (name: string) =>
      `Are you sure you want to delete ${name}? All messages will be lost. This action cannot be undone.`,
    deleteConfirmPrompt: (name: string) => `Type ${name} to confirm.`,
    deleteSuccess: (name: string) => `Queue ${name} deleted.`,
    // Send
    sendButton: 'Send message',
    sendHeader: 'Send message',
    sendSuccess: 'Message sent successfully.',
    messageBodyLabel: 'Message body',
    messageAttributesLabel: 'Message attributes',
    // Poll
    pollButton: 'Poll',
    pollErrorHeader: 'Poll failed',
    lastPolled: (iso: string) =>
      `Last polled at ${new Date(iso).toLocaleTimeString()}`,
    clearPolled: 'Clear polled messages',
    messagesEmpty:
      'No messages polled yet. Click Poll to receive up to 10 messages.',
    messagesHeading: 'Messages',
    configurationHeading: 'Configuration',
    configurationLoading: 'Loading attributes…',
    // Purge
    purgeButton: 'Purge queue',
    purgeHeader: (name: string) => `Purge queue ${name}?`,
    purgeConfirmCopy: (name: string) =>
      `This removes ALL messages in ${name}. Type the queue name to confirm.`,
    purgeSuccess: (name: string) =>
      `Queue ${name} purged. (Note: real AWS enforces a 60s cooldown; MiniStack clears immediately.)`,
    // Detail page not-found
    notFoundHeader: 'Queue not found',
    notFoundBackLink: 'Back to queues',
  },

  // ── Phase 5 — Generic service framework ─────────────────────────────────────
  generic: {
    reveal: 'Reveal',
    hide: 'Hide',
    reviewButton: 'Review request',
    sendButton: 'Send',
    cancelButton: 'Cancel',
    diffUrlHeader: 'URL',
    diffHeadersHeader: 'Headers',
    diffBodyHeader: 'Body',
    diffPreviewTitle: 'Review request',
    unknownService: (key: string) => `Unknown service: ${key}`,
    listEmpty: 'No resources yet.',
    detailLoading: 'Loading detail…',
    refreshTooltip: 'Refresh',
    createButton: 'Create',
    deleteButton: 'Delete',
    actionsDropdownButton: 'Actions',
  },

  // ── Phase 5 — IAM ───────────────────────────────────────────────────────────
  iam: {
    usersHeading: 'IAM Users',
    rolesHeading: 'IAM Roles',
    policiesHeading: 'IAM Policies',
    usersEmptyTitle: 'No IAM users',
    usersEmptySubtitle: 'Use the AWS CLI to create a user.',
    rolesEmptyTitle: 'No IAM roles',
    rolesEmptySubtitle: 'Use the AWS CLI to create a role.',
    policiesEmptyTitle: 'No customer-managed policies',
    policiesEmptySubtitle: 'Use the AWS CLI to create a policy.',
    deleteUserSuccess: 'User deleted.',
    deleteRoleSuccess: 'Role deleted.',
    deletePolicySuccess: 'Policy deleted.',
  },

  // ── Phase 5 — STS ───────────────────────────────────────────────────────────
  sts: {
    heading: 'Caller identity',
    subtitle:
      'The account, user and ARN of the current SigV4 credentials.',
  },

  // ── Phase 5 — Secrets Manager ───────────────────────────────────────────────
  secretsmanager: {
    heading: 'Secrets Manager',
    emptyTitle: 'No secrets',
    emptySubtitle: 'Create a secret to store a credential.',
    createSuccess: 'Secret created.',
    deleteSuccess: 'Secret deleted.',
  },

  // ── Phase 5 — Systems Manager (SSM) ─────────────────────────────────────────
  ssm: {
    heading: 'Systems Manager Parameters',
    emptyTitle: 'No parameters',
    emptySubtitle: 'Create a parameter via CLI to see it here.',
    deleteSuccess: 'Parameter deleted.',
  },

  // ── Phase 5 — KMS ───────────────────────────────────────────────────────────
  kms: {
    heading: 'KMS Keys',
    emptyTitle: 'No KMS keys',
    emptySubtitle: 'Create a key via CLI to see it here.',
  },
} as const
