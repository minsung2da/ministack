import { describe, test, beforeAll } from 'vitest'
import { mswServer } from '../../../test/msw'
import { ec2Handlers } from './msw-handlers'

beforeAll(() => mswServer.use(...ec2Handlers))

describe('SecurityGroupsTab', () => {
  describe('EC2-03: Security Group list', () => {
    test.todo('renders SG table with Group ID, Name, VPC ID, Description, rule counts')
    test.todo('parses inbound and outbound rules from XML')
  })

  describe('CRUD-02: Detail view', () => {
    test.todo('detail panel shows Inbound rules and Outbound rules tabs')
  })

  describe('CRUD-03: Create Security Group', () => {
    test.todo('Create modal has Name, Description, VPC fields')
  })
})
