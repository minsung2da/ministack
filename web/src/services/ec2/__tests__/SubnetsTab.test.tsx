import { describe, test, beforeAll } from 'vitest'
import { mswServer } from '../../../test/msw'
import { ec2Handlers } from './msw-handlers'

beforeAll(() => mswServer.use(...ec2Handlers))

describe('SubnetsTab', () => {
  describe('EC2-03: Subnet list', () => {
    test.todo('renders Subnet table with correct columns')
    test.todo('parses DescribeSubnets XML response')
  })

  describe('CRUD-03: Create Subnet', () => {
    test.todo('Create modal has VPC dropdown populated from API')
    test.todo('Submit calls CreateSubnet with VpcId, CidrBlock, AZ')
  })

  describe('CRUD-04: Delete Subnet', () => {
    test.todo('Delete modal requires type-to-confirm')
  })
})
