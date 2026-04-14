import { describe, test, beforeAll } from 'vitest'
import { mswServer } from '../../../test/msw'
import { ec2Handlers } from './msw-handlers'

beforeAll(() => mswServer.use(...ec2Handlers))

describe('InternetGatewaysTab', () => {
  describe('EC2-05: IGW management', () => {
    test.todo('renders IGW table with Name, IGW ID, State, VPC ID')
    test.todo('Create IGW with optional Name tag')
    test.todo('Delete IGW type-to-confirm')
  })
})

describe('NatGatewaysTab', () => {
  describe('EC2-05: NAT GW management', () => {
    test.todo('renders NAT GW table with Name, ID, State, Subnet, Public IP, VPC')
    test.todo('Create NAT GW requires Subnet and Elastic IP')
    test.todo('NAT GW create filters EIPs to unassociated only')
  })
})
