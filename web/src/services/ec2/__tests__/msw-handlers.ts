import { http, HttpResponse } from 'msw'
import { EC2_FIXTURES } from './fixtures'

/**
 * MSW http handlers for all EC2 Query protocol API actions.
 * The EC2 Query protocol uses a single POST endpoint.
 * The Action parameter in the request body determines which operation to perform.
 *
 * Usage: mswServer.use(...ec2Handlers)
 */
export const ec2Handlers = [
  http.post('/', async ({ request }) => {
    const body = await request.text()
    const params = new URLSearchParams(body)
    const action = params.get('Action') ?? ''

    switch (action) {
      case 'DescribeInstances':
        return HttpResponse.xml(EC2_FIXTURES.describeInstances)

      case 'DescribeVpcs':
        return HttpResponse.xml(EC2_FIXTURES.describeVpcs)

      case 'DescribeSubnets':
        return HttpResponse.xml(EC2_FIXTURES.describeSubnets)

      case 'DescribeSecurityGroups':
        return HttpResponse.xml(EC2_FIXTURES.describeSecurityGroups)

      case 'DescribeKeyPairs':
        return HttpResponse.xml(EC2_FIXTURES.describeKeyPairs)

      case 'DescribeVolumes':
        return HttpResponse.xml(EC2_FIXTURES.describeVolumes)

      case 'DescribeSnapshots':
        return HttpResponse.xml(EC2_FIXTURES.describeSnapshots)

      case 'DescribeAddresses':
        return HttpResponse.xml(EC2_FIXTURES.describeAddresses)

      case 'DescribeInternetGateways':
        return HttpResponse.xml(EC2_FIXTURES.describeInternetGateways)

      case 'DescribeNatGateways':
        return HttpResponse.xml(EC2_FIXTURES.describeNatGateways)

      case 'DescribeRouteTables':
        return HttpResponse.xml(EC2_FIXTURES.describeRouteTables)

      case 'DescribeNetworkInterfaces':
        return HttpResponse.xml(EC2_FIXTURES.describeNetworkInterfaces)

      case 'DescribeImages':
        return HttpResponse.xml(EC2_FIXTURES.describeImages)

      case 'RunInstances':
        return HttpResponse.xml(EC2_FIXTURES.runInstances)

      case 'StartInstances':
        return HttpResponse.xml(EC2_FIXTURES.startInstances)

      case 'StopInstances':
        return HttpResponse.xml(EC2_FIXTURES.stopInstances)

      case 'TerminateInstances':
        return HttpResponse.xml(EC2_FIXTURES.terminateInstances)

      case 'RebootInstances':
        return HttpResponse.xml(EC2_FIXTURES.rebootInstances)

      case 'CreateVpc':
        return HttpResponse.xml(EC2_FIXTURES.createVpc)

      case 'DeleteVpc':
        return HttpResponse.xml(EC2_FIXTURES.deleteVpc)

      case 'CreateSubnet':
        return HttpResponse.xml(EC2_FIXTURES.createSubnet)

      case 'DeleteSubnet':
        return HttpResponse.xml(EC2_FIXTURES.deleteSubnet)

      case 'CreateSecurityGroup':
        return HttpResponse.xml(EC2_FIXTURES.createSecurityGroup)

      case 'DeleteSecurityGroup':
        return HttpResponse.xml(EC2_FIXTURES.deleteSecurityGroup)

      case 'CreateKeyPair':
        return HttpResponse.xml(EC2_FIXTURES.createKeyPair)

      case 'DeleteKeyPair':
        return HttpResponse.xml(EC2_FIXTURES.deleteKeyPair)

      case 'CreateVolume':
        return HttpResponse.xml(EC2_FIXTURES.createVolume)

      case 'DeleteVolume':
        return HttpResponse.xml(EC2_FIXTURES.deleteVolume)

      case 'CreateSnapshot':
        return HttpResponse.xml(EC2_FIXTURES.createSnapshot)

      case 'DeleteSnapshot':
        return HttpResponse.xml(EC2_FIXTURES.deleteSnapshot)

      case 'AllocateAddress':
        return HttpResponse.xml(EC2_FIXTURES.allocateAddress)

      case 'ReleaseAddress':
        return HttpResponse.xml(EC2_FIXTURES.releaseAddress)

      case 'CreateInternetGateway':
        return HttpResponse.xml(EC2_FIXTURES.createInternetGateway)

      case 'DeleteInternetGateway':
        return HttpResponse.xml(EC2_FIXTURES.deleteInternetGateway)

      case 'CreateNatGateway':
        return HttpResponse.xml(EC2_FIXTURES.createNatGateway)

      case 'DeleteNatGateway':
        return HttpResponse.xml(EC2_FIXTURES.deleteNatGateway)

      default:
        return HttpResponse.xml(
          `<?xml version="1.0" encoding="UTF-8"?>
<ErrorResponse xmlns="http://ec2.amazonaws.com/doc/2016-11-15/">
  <Error>
    <Code>InvalidAction</Code>
    <Message>The action ${action} is not valid for this web service.</Message>
  </Error>
  <RequestId>test-request-id</RequestId>
</ErrorResponse>`,
          { status: 400 },
        )
    }
  }),
]
