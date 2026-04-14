import { describe, test, beforeAll } from 'vitest'
import { mswServer } from '../../../test/msw'
import { ec2Handlers } from './msw-handlers'

beforeAll(() => mswServer.use(...ec2Handlers))

describe('ElasticIpsTab', () => {
  describe('EC2-05: Elastic IP management', () => {
    test.todo('renders EIP table with Allocation ID, Public IP, Associated instance')
    test.todo('Allocate is single-click (no modal form)')
    test.todo('Allocate calls AllocateAddress with Domain=vpc')
  })

  describe('CRUD-04: Release EIP', () => {
    test.todo('Release modal type-to-confirm with allocation ID')
  })
})
