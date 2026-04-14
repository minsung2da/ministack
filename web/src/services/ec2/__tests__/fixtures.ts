/**
 * Shared EC2 XML response fixtures for MSW handlers.
 * Each value is a valid EC2 Query protocol XML response string.
 */
export const EC2_FIXTURES = {
  describeInstances: `<?xml version="1.0" encoding="UTF-8"?>
<DescribeInstancesResponse xmlns="http://ec2.amazonaws.com/doc/2016-11-15/">
  <requestId>test-request-id</requestId>
  <reservationSet>
    <item>
      <reservationId>r-00000001</reservationId>
      <ownerId>123456789012</ownerId>
      <groupSet/>
      <instancesSet>
        <item>
          <instanceId>i-running123</instanceId>
          <imageId>ami-12345678</imageId>
          <instanceState>
            <code>16</code>
            <name>running</name>
          </instanceState>
          <privateDnsName>ip-10-0-0-1.ec2.internal</privateDnsName>
          <dnsName>ec2-1-2-3-4.compute-1.amazonaws.com</dnsName>
          <keyName>my-key-pair</keyName>
          <instanceType>t2.micro</instanceType>
          <launchTime>2026-01-01T00:00:00.000Z</launchTime>
          <placement>
            <availabilityZone>us-east-1a</availabilityZone>
          </placement>
          <privateIpAddress>10.0.0.1</privateIpAddress>
          <ipAddress>1.2.3.4</ipAddress>
          <vpcId>vpc-12345678</vpcId>
          <subnetId>subnet-12345678</subnetId>
          <groupSet>
            <item>
              <groupId>sg-12345678</groupId>
              <groupName>default</groupName>
            </item>
          </groupSet>
          <blockDeviceMapping>
            <item>
              <deviceName>/dev/xvda</deviceName>
              <ebs>
                <volumeId>vol-12345678</volumeId>
                <status>attached</status>
              </ebs>
            </item>
          </blockDeviceMapping>
          <tagSet>
            <item>
              <key>Name</key>
              <value>running-instance</value>
            </item>
          </tagSet>
        </item>
        <item>
          <instanceId>i-stopped456</instanceId>
          <imageId>ami-12345678</imageId>
          <instanceState>
            <code>80</code>
            <name>stopped</name>
          </instanceState>
          <privateDnsName>ip-10-0-0-2.ec2.internal</privateDnsName>
          <dnsName/>
          <keyName>my-key-pair</keyName>
          <instanceType>t2.micro</instanceType>
          <launchTime>2026-01-02T00:00:00.000Z</launchTime>
          <placement>
            <availabilityZone>us-east-1b</availabilityZone>
          </placement>
          <privateIpAddress>10.0.0.2</privateIpAddress>
          <ipAddress/>
          <vpcId>vpc-12345678</vpcId>
          <subnetId>subnet-87654321</subnetId>
          <groupSet>
            <item>
              <groupId>sg-12345678</groupId>
              <groupName>default</groupName>
            </item>
          </groupSet>
          <blockDeviceMapping>
            <item>
              <deviceName>/dev/xvda</deviceName>
              <ebs>
                <volumeId>vol-87654321</volumeId>
                <status>attached</status>
              </ebs>
            </item>
          </blockDeviceMapping>
          <tagSet>
            <item>
              <key>Name</key>
              <value>stopped-instance</value>
            </item>
          </tagSet>
        </item>
      </instancesSet>
    </item>
  </reservationSet>
</DescribeInstancesResponse>`,

  describeVpcs: `<?xml version="1.0" encoding="UTF-8"?>
<DescribeVpcsResponse xmlns="http://ec2.amazonaws.com/doc/2016-11-15/">
  <requestId>test-request-id</requestId>
  <vpcSet>
    <item>
      <vpcId>vpc-default000</vpcId>
      <state>available</state>
      <cidrBlock>172.31.0.0/16</cidrBlock>
      <isDefault>true</isDefault>
      <cidrBlockAssociationSet>
        <item>
          <associationId>vpc-cidr-assoc-00000001</associationId>
          <cidrBlock>172.31.0.0/16</cidrBlock>
          <cidrBlockState>
            <state>associated</state>
          </cidrBlockState>
        </item>
      </cidrBlockAssociationSet>
      <tagSet/>
    </item>
    <item>
      <vpcId>vpc-12345678</vpcId>
      <state>available</state>
      <cidrBlock>10.0.0.0/16</cidrBlock>
      <isDefault>false</isDefault>
      <cidrBlockAssociationSet>
        <item>
          <associationId>vpc-cidr-assoc-00000002</associationId>
          <cidrBlock>10.0.0.0/16</cidrBlock>
          <cidrBlockState>
            <state>associated</state>
          </cidrBlockState>
        </item>
      </cidrBlockAssociationSet>
      <tagSet>
        <item>
          <key>Name</key>
          <value>my-vpc</value>
        </item>
      </tagSet>
    </item>
  </vpcSet>
</DescribeVpcsResponse>`,

  describeSubnets: `<?xml version="1.0" encoding="UTF-8"?>
<DescribeSubnetsResponse xmlns="http://ec2.amazonaws.com/doc/2016-11-15/">
  <requestId>test-request-id</requestId>
  <subnetSet>
    <item>
      <subnetId>subnet-12345678</subnetId>
      <state>available</state>
      <vpcId>vpc-12345678</vpcId>
      <cidrBlock>10.0.1.0/24</cidrBlock>
      <availabilityZone>us-east-1a</availabilityZone>
      <availableIpAddressCount>251</availableIpAddressCount>
      <mapPublicIpOnLaunch>true</mapPublicIpOnLaunch>
      <tagSet>
        <item>
          <key>Name</key>
          <value>public-subnet-1a</value>
        </item>
      </tagSet>
    </item>
    <item>
      <subnetId>subnet-87654321</subnetId>
      <state>available</state>
      <vpcId>vpc-12345678</vpcId>
      <cidrBlock>10.0.2.0/24</cidrBlock>
      <availabilityZone>us-east-1b</availabilityZone>
      <availableIpAddressCount>251</availableIpAddressCount>
      <mapPublicIpOnLaunch>false</mapPublicIpOnLaunch>
      <tagSet>
        <item>
          <key>Name</key>
          <value>private-subnet-1b</value>
        </item>
      </tagSet>
    </item>
  </subnetSet>
</DescribeSubnetsResponse>`,

  describeSecurityGroups: `<?xml version="1.0" encoding="UTF-8"?>
<DescribeSecurityGroupsResponse xmlns="http://ec2.amazonaws.com/doc/2016-11-15/">
  <requestId>test-request-id</requestId>
  <securityGroupInfo>
    <item>
      <groupId>sg-12345678</groupId>
      <groupName>default</groupName>
      <groupDescription>default VPC security group</groupDescription>
      <vpcId>vpc-12345678</vpcId>
      <ipPermissions>
        <item>
          <ipProtocol>tcp</ipProtocol>
          <fromPort>22</fromPort>
          <toPort>22</toPort>
          <groups/>
          <ipRanges>
            <item>
              <cidrIp>0.0.0.0/0</cidrIp>
            </item>
          </ipRanges>
        </item>
      </ipPermissions>
      <ipPermissionsEgress>
        <item>
          <ipProtocol>-1</ipProtocol>
          <groups/>
          <ipRanges>
            <item>
              <cidrIp>0.0.0.0/0</cidrIp>
            </item>
          </ipRanges>
        </item>
      </ipPermissionsEgress>
      <tagSet/>
    </item>
    <item>
      <groupId>sg-87654321</groupId>
      <groupName>web-sg</groupName>
      <groupDescription>Web server security group</groupDescription>
      <vpcId>vpc-12345678</vpcId>
      <ipPermissions>
        <item>
          <ipProtocol>tcp</ipProtocol>
          <fromPort>80</fromPort>
          <toPort>80</toPort>
          <groups/>
          <ipRanges>
            <item>
              <cidrIp>0.0.0.0/0</cidrIp>
            </item>
          </ipRanges>
        </item>
      </ipPermissions>
      <ipPermissionsEgress>
        <item>
          <ipProtocol>-1</ipProtocol>
          <groups/>
          <ipRanges>
            <item>
              <cidrIp>0.0.0.0/0</cidrIp>
            </item>
          </ipRanges>
        </item>
      </ipPermissionsEgress>
      <tagSet>
        <item>
          <key>Name</key>
          <value>web-sg</value>
        </item>
      </tagSet>
    </item>
  </securityGroupInfo>
</DescribeSecurityGroupsResponse>`,

  describeKeyPairs: `<?xml version="1.0" encoding="UTF-8"?>
<DescribeKeyPairsResponse xmlns="http://ec2.amazonaws.com/doc/2016-11-15/">
  <requestId>test-request-id</requestId>
  <keySet>
    <item>
      <keyPairId>key-12345678</keyPairId>
      <keyName>my-key-pair</keyName>
      <keyType>rsa</keyType>
      <keyFingerprint>12:34:56:78:9a:bc:de:f0:12:34:56:78:9a:bc:de:f0</keyFingerprint>
      <tagSet/>
    </item>
  </keySet>
</DescribeKeyPairsResponse>`,

  describeVolumes: `<?xml version="1.0" encoding="UTF-8"?>
<DescribeVolumesResponse xmlns="http://ec2.amazonaws.com/doc/2016-11-15/">
  <requestId>test-request-id</requestId>
  <volumeSet>
    <item>
      <volumeId>vol-12345678</volumeId>
      <status>in-use</status>
      <size>8</size>
      <volumeType>gp2</volumeType>
      <availabilityZone>us-east-1a</availabilityZone>
      <createTime>2026-01-01T00:00:00.000Z</createTime>
      <attachmentSet>
        <item>
          <volumeId>vol-12345678</volumeId>
          <instanceId>i-running123</instanceId>
          <device>/dev/xvda</device>
          <status>attached</status>
          <attachTime>2026-01-01T00:01:00.000Z</attachTime>
        </item>
      </attachmentSet>
      <tagSet>
        <item>
          <key>Name</key>
          <value>root-volume</value>
        </item>
      </tagSet>
    </item>
    <item>
      <volumeId>vol-87654321</volumeId>
      <status>available</status>
      <size>20</size>
      <volumeType>gp2</volumeType>
      <availabilityZone>us-east-1b</availabilityZone>
      <createTime>2026-01-02T00:00:00.000Z</createTime>
      <attachmentSet/>
      <tagSet>
        <item>
          <key>Name</key>
          <value>data-volume</value>
        </item>
      </tagSet>
    </item>
  </volumeSet>
</DescribeVolumesResponse>`,

  describeSnapshots: `<?xml version="1.0" encoding="UTF-8"?>
<DescribeSnapshotsResponse xmlns="http://ec2.amazonaws.com/doc/2016-11-15/">
  <requestId>test-request-id</requestId>
  <snapshotSet>
    <item>
      <snapshotId>snap-12345678</snapshotId>
      <volumeId>vol-12345678</volumeId>
      <status>completed</status>
      <startTime>2026-01-03T00:00:00.000Z</startTime>
      <progress>100%</progress>
      <volumeSize>8</volumeSize>
      <description>My snapshot</description>
      <tagSet>
        <item>
          <key>Name</key>
          <value>my-snapshot</value>
        </item>
      </tagSet>
    </item>
  </snapshotSet>
</DescribeSnapshotsResponse>`,

  describeAddresses: `<?xml version="1.0" encoding="UTF-8"?>
<DescribeAddressesResponse xmlns="http://ec2.amazonaws.com/doc/2016-11-15/">
  <requestId>test-request-id</requestId>
  <addressesSet>
    <item>
      <allocationId>eipalloc-12345678</allocationId>
      <publicIp>54.1.2.3</publicIp>
      <instanceId/>
      <privateIpAddress/>
      <domain>vpc</domain>
      <tagSet/>
    </item>
  </addressesSet>
</DescribeAddressesResponse>`,

  describeInternetGateways: `<?xml version="1.0" encoding="UTF-8"?>
<DescribeInternetGatewaysResponse xmlns="http://ec2.amazonaws.com/doc/2016-11-15/">
  <requestId>test-request-id</requestId>
  <internetGatewaySet>
    <item>
      <internetGatewayId>igw-12345678</internetGatewayId>
      <attachmentSet>
        <item>
          <vpcId>vpc-12345678</vpcId>
          <state>attached</state>
        </item>
      </attachmentSet>
      <tagSet>
        <item>
          <key>Name</key>
          <value>my-igw</value>
        </item>
      </tagSet>
    </item>
  </internetGatewaySet>
</DescribeInternetGatewaysResponse>`,

  describeNatGateways: `<?xml version="1.0" encoding="UTF-8"?>
<DescribeNatGatewaysResponse xmlns="http://ec2.amazonaws.com/doc/2016-11-15/">
  <requestId>test-request-id</requestId>
  <natGatewaySet>
    <item>
      <natGatewayId>nat-12345678</natGatewayId>
      <state>available</state>
      <subnetId>subnet-12345678</subnetId>
      <vpcId>vpc-12345678</vpcId>
      <natGatewayAddressSet>
        <item>
          <publicIp>54.1.2.4</publicIp>
          <allocationId>eipalloc-87654321</allocationId>
          <privateIp>10.0.1.10</privateIp>
          <networkInterfaceId>eni-12345678</networkInterfaceId>
        </item>
      </natGatewayAddressSet>
      <tagSet>
        <item>
          <key>Name</key>
          <value>my-nat-gw</value>
        </item>
      </tagSet>
    </item>
  </natGatewaySet>
</DescribeNatGatewaysResponse>`,

  describeRouteTables: `<?xml version="1.0" encoding="UTF-8"?>
<DescribeRouteTablesResponse xmlns="http://ec2.amazonaws.com/doc/2016-11-15/">
  <requestId>test-request-id</requestId>
  <routeTableSet>
    <item>
      <routeTableId>rtb-12345678</routeTableId>
      <vpcId>vpc-12345678</vpcId>
      <associationSet>
        <item>
          <routeTableAssociationId>rtbassoc-12345678</routeTableAssociationId>
          <routeTableId>rtb-12345678</routeTableId>
          <main>true</main>
        </item>
      </associationSet>
      <routeSet>
        <item>
          <destinationCidrBlock>10.0.0.0/16</destinationCidrBlock>
          <gatewayId>local</gatewayId>
          <state>active</state>
          <origin>CreateRouteTable</origin>
        </item>
        <item>
          <destinationCidrBlock>0.0.0.0/0</destinationCidrBlock>
          <gatewayId>igw-12345678</gatewayId>
          <state>active</state>
          <origin>CreateRoute</origin>
        </item>
      </routeSet>
      <tagSet/>
    </item>
  </routeTableSet>
</DescribeRouteTablesResponse>`,

  describeNetworkInterfaces: `<?xml version="1.0" encoding="UTF-8"?>
<DescribeNetworkInterfacesResponse xmlns="http://ec2.amazonaws.com/doc/2016-11-15/">
  <requestId>test-request-id</requestId>
  <networkInterfaceSet>
    <item>
      <networkInterfaceId>eni-12345678</networkInterfaceId>
      <status>in-use</status>
      <vpcId>vpc-12345678</vpcId>
      <subnetId>subnet-12345678</subnetId>
      <privateIpAddress>10.0.1.10</privateIpAddress>
      <description>NAT gateway network interface</description>
      <tagSet/>
    </item>
  </networkInterfaceSet>
</DescribeNetworkInterfacesResponse>`,

  describeImages: `<?xml version="1.0" encoding="UTF-8"?>
<DescribeImagesResponse xmlns="http://ec2.amazonaws.com/doc/2016-11-15/">
  <requestId>test-request-id</requestId>
  <imagesSet>
    <item>
      <imageId>ami-amazon-linux</imageId>
      <name>Amazon Linux 2023</name>
      <description>Amazon Linux 2023 AMI</description>
      <state>available</state>
      <architecture>x86_64</architecture>
      <platform/>
    </item>
    <item>
      <imageId>ami-ubuntu-22</imageId>
      <name>Ubuntu Server 22.04 LTS</name>
      <description>Ubuntu 22.04 LTS AMI</description>
      <state>available</state>
      <architecture>x86_64</architecture>
      <platform/>
    </item>
    <item>
      <imageId>ami-windows-2022</imageId>
      <name>Windows Server 2022</name>
      <description>Windows Server 2022 Base AMI</description>
      <state>available</state>
      <architecture>x86_64</architecture>
      <platform>windows</platform>
    </item>
  </imagesSet>
</DescribeImagesResponse>`,

  // Mutation responses
  runInstances: `<?xml version="1.0" encoding="UTF-8"?>
<RunInstancesResponse xmlns="http://ec2.amazonaws.com/doc/2016-11-15/">
  <requestId>test-request-id</requestId>
  <reservationId>r-new00001</reservationId>
  <ownerId>123456789012</ownerId>
  <instancesSet>
    <item>
      <instanceId>i-new123456</instanceId>
      <instanceState>
        <code>0</code>
        <name>pending</name>
      </instanceState>
      <instanceType>t2.micro</instanceType>
    </item>
  </instancesSet>
</RunInstancesResponse>`,

  startInstances: `<?xml version="1.0" encoding="UTF-8"?>
<StartInstancesResponse xmlns="http://ec2.amazonaws.com/doc/2016-11-15/">
  <requestId>test-request-id</requestId>
  <instancesSet>
    <item>
      <instanceId>i-stopped456</instanceId>
      <previousState>
        <code>80</code>
        <name>stopped</name>
      </previousState>
      <currentState>
        <code>0</code>
        <name>pending</name>
      </currentState>
    </item>
  </instancesSet>
</StartInstancesResponse>`,

  stopInstances: `<?xml version="1.0" encoding="UTF-8"?>
<StopInstancesResponse xmlns="http://ec2.amazonaws.com/doc/2016-11-15/">
  <requestId>test-request-id</requestId>
  <instancesSet>
    <item>
      <instanceId>i-running123</instanceId>
      <previousState>
        <code>16</code>
        <name>running</name>
      </previousState>
      <currentState>
        <code>64</code>
        <name>stopping</name>
      </currentState>
    </item>
  </instancesSet>
</StopInstancesResponse>`,

  terminateInstances: `<?xml version="1.0" encoding="UTF-8"?>
<TerminateInstancesResponse xmlns="http://ec2.amazonaws.com/doc/2016-11-15/">
  <requestId>test-request-id</requestId>
  <instancesSet>
    <item>
      <instanceId>i-running123</instanceId>
      <previousState>
        <code>16</code>
        <name>running</name>
      </previousState>
      <currentState>
        <code>32</code>
        <name>shutting-down</name>
      </currentState>
    </item>
  </instancesSet>
</TerminateInstancesResponse>`,

  rebootInstances: `<?xml version="1.0" encoding="UTF-8"?>
<RebootInstancesResponse xmlns="http://ec2.amazonaws.com/doc/2016-11-15/">
  <requestId>test-request-id</requestId>
  <return>true</return>
</RebootInstancesResponse>`,

  createVpc: `<?xml version="1.0" encoding="UTF-8"?>
<CreateVpcResponse xmlns="http://ec2.amazonaws.com/doc/2016-11-15/">
  <requestId>test-request-id</requestId>
  <vpc>
    <vpcId>vpc-new12345</vpcId>
    <state>pending</state>
    <cidrBlock>192.168.0.0/16</cidrBlock>
    <isDefault>false</isDefault>
  </vpc>
</CreateVpcResponse>`,

  deleteVpc: `<?xml version="1.0" encoding="UTF-8"?>
<DeleteVpcResponse xmlns="http://ec2.amazonaws.com/doc/2016-11-15/">
  <requestId>test-request-id</requestId>
  <return>true</return>
</DeleteVpcResponse>`,

  createSubnet: `<?xml version="1.0" encoding="UTF-8"?>
<CreateSubnetResponse xmlns="http://ec2.amazonaws.com/doc/2016-11-15/">
  <requestId>test-request-id</requestId>
  <subnet>
    <subnetId>subnet-new12345</subnetId>
    <state>pending</state>
    <vpcId>vpc-12345678</vpcId>
    <cidrBlock>10.0.3.0/24</cidrBlock>
    <availabilityZone>us-east-1c</availabilityZone>
  </subnet>
</CreateSubnetResponse>`,

  deleteSubnet: `<?xml version="1.0" encoding="UTF-8"?>
<DeleteSubnetResponse xmlns="http://ec2.amazonaws.com/doc/2016-11-15/">
  <requestId>test-request-id</requestId>
  <return>true</return>
</DeleteSubnetResponse>`,

  createSecurityGroup: `<?xml version="1.0" encoding="UTF-8"?>
<CreateSecurityGroupResponse xmlns="http://ec2.amazonaws.com/doc/2016-11-15/">
  <requestId>test-request-id</requestId>
  <groupId>sg-new12345</groupId>
</CreateSecurityGroupResponse>`,

  deleteSecurityGroup: `<?xml version="1.0" encoding="UTF-8"?>
<DeleteSecurityGroupResponse xmlns="http://ec2.amazonaws.com/doc/2016-11-15/">
  <requestId>test-request-id</requestId>
  <return>true</return>
</DeleteSecurityGroupResponse>`,

  createKeyPair: `<?xml version="1.0" encoding="UTF-8"?>
<CreateKeyPairResponse xmlns="http://ec2.amazonaws.com/doc/2016-11-15/">
  <requestId>test-request-id</requestId>
  <keyPairId>key-new12345</keyPairId>
  <keyName>new-key-pair</keyName>
  <keyMaterial>-----BEGIN RSA PRIVATE KEY-----\nMIIEpAIBAAKCAQEA0Z3VS...\n-----END RSA PRIVATE KEY-----</keyMaterial>
  <keyFingerprint>ab:cd:ef:01:23:45:67:89:ab:cd:ef:01:23:45:67:89</keyFingerprint>
</CreateKeyPairResponse>`,

  deleteKeyPair: `<?xml version="1.0" encoding="UTF-8"?>
<DeleteKeyPairResponse xmlns="http://ec2.amazonaws.com/doc/2016-11-15/">
  <requestId>test-request-id</requestId>
  <return>true</return>
</DeleteKeyPairResponse>`,

  createVolume: `<?xml version="1.0" encoding="UTF-8"?>
<CreateVolumeResponse xmlns="http://ec2.amazonaws.com/doc/2016-11-15/">
  <requestId>test-request-id</requestId>
  <volumeId>vol-new12345</volumeId>
  <status>creating</status>
  <size>10</size>
  <volumeType>gp2</volumeType>
  <availabilityZone>us-east-1a</availabilityZone>
  <createTime>2026-01-04T00:00:00.000Z</createTime>
</CreateVolumeResponse>`,

  deleteVolume: `<?xml version="1.0" encoding="UTF-8"?>
<DeleteVolumeResponse xmlns="http://ec2.amazonaws.com/doc/2016-11-15/">
  <requestId>test-request-id</requestId>
  <return>true</return>
</DeleteVolumeResponse>`,

  createSnapshot: `<?xml version="1.0" encoding="UTF-8"?>
<CreateSnapshotResponse xmlns="http://ec2.amazonaws.com/doc/2016-11-15/">
  <requestId>test-request-id</requestId>
  <snapshotId>snap-new12345</snapshotId>
  <volumeId>vol-12345678</volumeId>
  <status>pending</status>
  <startTime>2026-01-04T00:00:00.000Z</startTime>
  <volumeSize>8</volumeSize>
  <description>New snapshot</description>
</CreateSnapshotResponse>`,

  deleteSnapshot: `<?xml version="1.0" encoding="UTF-8"?>
<DeleteSnapshotResponse xmlns="http://ec2.amazonaws.com/doc/2016-11-15/">
  <requestId>test-request-id</requestId>
  <return>true</return>
</DeleteSnapshotResponse>`,

  allocateAddress: `<?xml version="1.0" encoding="UTF-8"?>
<AllocateAddressResponse xmlns="http://ec2.amazonaws.com/doc/2016-11-15/">
  <requestId>test-request-id</requestId>
  <allocationId>eipalloc-new12345</allocationId>
  <publicIp>54.5.6.7</publicIp>
  <domain>vpc</domain>
</AllocateAddressResponse>`,

  releaseAddress: `<?xml version="1.0" encoding="UTF-8"?>
<ReleaseAddressResponse xmlns="http://ec2.amazonaws.com/doc/2016-11-15/">
  <requestId>test-request-id</requestId>
  <return>true</return>
</ReleaseAddressResponse>`,

  createInternetGateway: `<?xml version="1.0" encoding="UTF-8"?>
<CreateInternetGatewayResponse xmlns="http://ec2.amazonaws.com/doc/2016-11-15/">
  <requestId>test-request-id</requestId>
  <internetGateway>
    <internetGatewayId>igw-new12345</internetGatewayId>
    <attachmentSet/>
  </internetGateway>
</CreateInternetGatewayResponse>`,

  deleteInternetGateway: `<?xml version="1.0" encoding="UTF-8"?>
<DeleteInternetGatewayResponse xmlns="http://ec2.amazonaws.com/doc/2016-11-15/">
  <requestId>test-request-id</requestId>
  <return>true</return>
</DeleteInternetGatewayResponse>`,

  createNatGateway: `<?xml version="1.0" encoding="UTF-8"?>
<CreateNatGatewayResponse xmlns="http://ec2.amazonaws.com/doc/2016-11-15/">
  <requestId>test-request-id</requestId>
  <natGateway>
    <natGatewayId>nat-new12345</natGatewayId>
    <state>pending</state>
    <subnetId>subnet-12345678</subnetId>
    <vpcId>vpc-12345678</vpcId>
  </natGateway>
</CreateNatGatewayResponse>`,

  deleteNatGateway: `<?xml version="1.0" encoding="UTF-8"?>
<DeleteNatGatewayResponse xmlns="http://ec2.amazonaws.com/doc/2016-11-15/">
  <requestId>test-request-id</requestId>
  <natGatewayId>nat-12345678</natGatewayId>
  <state>deleting</state>
</DeleteNatGatewayResponse>`,
}
