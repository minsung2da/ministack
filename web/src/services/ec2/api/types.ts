/**
 * EC2 resource type interfaces.
 *
 * All 12 resource types supported by the Phase 2 EC2 dashboard.
 * Field names map directly to EC2 XML response element names after parsing.
 */

export interface Ec2Instance {
  instanceId: string
  instanceType: string
  state: string
  availabilityZone: string
  publicIpAddress: string
  privateIpAddress: string
  vpcId: string
  subnetId: string
  nameTag: string
  launchTime: string
  keyName: string
  imageId: string
  architecture: string
  platform: string
  securityGroups: Array<{ groupId: string; groupName: string }>
  monitoring: string
  privateDnsName: string
  publicDnsName: string
  rootDeviceName: string
  rootDeviceType: string
  blockDeviceMappings: Array<{ deviceName: string; volumeId: string }>
  iamInstanceProfile: string
}

export interface Ec2Vpc {
  vpcId: string
  state: string
  cidrBlock: string
  isDefault: boolean
  dhcpOptionsId: string
  instanceTenancy: string
  nameTag: string
  cidrBlockAssociations: Array<{ cidrBlock: string; state: string }>
}

export interface Ec2Subnet {
  subnetId: string
  state: string
  vpcId: string
  cidrBlock: string
  availabilityZone: string
  availableIpAddressCount: number
  nameTag: string
  mapPublicIpOnLaunch: boolean
}

export interface Ec2SecurityGroup {
  groupId: string
  groupName: string
  vpcId: string
  groupDescription: string
  nameTag: string
  inboundRules: Array<{
    protocol: string
    portRange: string
    source: string
    description: string
  }>
  outboundRules: Array<{
    protocol: string
    portRange: string
    destination: string
    description: string
  }>
}

export interface Ec2KeyPair {
  keyPairId: string
  keyName: string
  keyType: string
  keyFingerprint: string
}

export interface Ec2Volume {
  volumeId: string
  status: string
  size: number
  volumeType: string
  availabilityZone: string
  attachedInstanceId: string
  nameTag: string
  createTime: string
}

export interface Ec2Snapshot {
  snapshotId: string
  status: string
  volumeId: string
  volumeSize: number
  startTime: string
  description: string
  nameTag: string
}

export interface Ec2ElasticIp {
  allocationId: string
  publicIp: string
  instanceId: string
  privateIpAddress: string
  associationId: string
  nameTag: string
}

export interface Ec2InternetGateway {
  internetGatewayId: string
  attachedVpcId: string
  attachmentState: string
  nameTag: string
}

export interface Ec2NatGateway {
  natGatewayId: string
  state: string
  subnetId: string
  vpcId: string
  publicIp: string
  nameTag: string
}

export interface Ec2RouteTable {
  routeTableId: string
  vpcId: string
  isMain: boolean
  routeCount: number
  nameTag: string
}

export interface Ec2NetworkInterface {
  networkInterfaceId: string
  status: string
  vpcId: string
  subnetId: string
  privateIpAddress: string
  nameTag: string
}

/**
 * URL slug identifiers for all 12 EC2 resource types.
 * Used for routing, empty-state copy lookups, and API dispatch.
 */
export type Ec2ResourceType =
  | 'instances'
  | 'vpcs'
  | 'subnets'
  | 'security-groups'
  | 'key-pairs'
  | 'volumes'
  | 'snapshots'
  | 'elastic-ips'
  | 'internet-gateways'
  | 'nat-gateways'
  | 'route-tables'
  | 'network-interfaces'
