import { describe, test, beforeAll } from 'vitest'
import { mswServer } from '../../../test/msw'
import { ec2Handlers } from './msw-handlers'

beforeAll(() => mswServer.use(...ec2Handlers))

describe('VolumesTab', () => {
  describe('EC2-04: Volume list', () => {
    test.todo('renders volume table with Name, ID, State, Size, Type, AZ, Attached to')
    test.todo('parses attachmentSet for attached instance ID')
  })

  describe('CRUD-03: Create Volume', () => {
    test.todo('Create modal validates size 1-16384')
    test.todo('Submit calls CreateVolume with AZ, Size, VolumeType')
  })

  describe('CRUD-04: Delete Volume', () => {
    test.todo('Delete modal type-to-confirm')
  })
})
