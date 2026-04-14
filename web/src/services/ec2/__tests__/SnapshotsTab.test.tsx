import { describe, test, beforeAll } from 'vitest'
import { mswServer } from '../../../test/msw'
import { ec2Handlers } from './msw-handlers'

beforeAll(() => mswServer.use(...ec2Handlers))

describe('SnapshotsTab', () => {
  describe('EC2-04: Snapshot list', () => {
    test.todo('renders snapshot table with correct columns')
  })

  describe('CRUD-03: Create Snapshot', () => {
    test.todo('Create modal populates volume dropdown from API')
    test.todo('Submit calls CreateSnapshot with VolumeId')
  })
})
