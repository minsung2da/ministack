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
} as const
