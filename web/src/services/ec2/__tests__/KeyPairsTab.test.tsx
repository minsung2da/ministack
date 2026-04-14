import { describe, test, beforeAll } from 'vitest'
import { mswServer } from '../../../test/msw'
import { ec2Handlers } from './msw-handlers'

beforeAll(() => mswServer.use(...ec2Handlers))

describe('KeyPairsTab', () => {
  describe('EC2-03: Key Pair list', () => {
    test.todo('renders key pair table with Name, ID, Type, Fingerprint')
  })

  describe('CRUD-03: Create Key Pair', () => {
    test.todo('shows private key material in one-time alert after creation')
  })

  describe('CRUD-04: Delete Key Pair', () => {
    test.todo('Delete modal type-to-confirm')
  })
})
