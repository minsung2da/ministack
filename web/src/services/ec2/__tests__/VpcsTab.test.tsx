import { describe, test, beforeAll } from 'vitest'
import { mswServer } from '../../../test/msw'
import { ec2Handlers } from './msw-handlers'

beforeAll(() => mswServer.use(...ec2Handlers))

describe('VpcsTab', () => {
  describe('EC2-03: VPC list', () => {
    test.todo('renders VPC table with Name, VPC ID, State, CIDR, Is default columns')
    test.todo('parses DescribeVpcs XML response correctly')
  })

  describe('CRUD-03: Create VPC', () => {
    test.todo('Create VPC modal opens with Name and CIDR fields')
    test.todo('Submit calls CreateVpc with CIDR')
    test.todo('CIDR validation rejects invalid format')
  })

  describe('CRUD-04: Delete VPC', () => {
    test.todo('Delete modal requires typing VPC ID to confirm')
    test.todo('Submit calls DeleteVpc')
  })
})
