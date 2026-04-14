import { describe, test, beforeAll } from 'vitest'
import { mswServer } from '../../../test/msw'
import { ec2Handlers } from './msw-handlers'

beforeAll(() => mswServer.use(...ec2Handlers))

describe('InstancesTab', () => {
  describe('EC2-01: Status indicators', () => {
    test.todo('shows green StatusIndicator for running instances')
    test.todo('shows yellow StatusIndicator for stopped instances')
    test.todo('shows red StatusIndicator for terminated instances')
  })

  describe('EC2-02: Instance actions', () => {
    test.todo('Start action sends StartInstances POST')
    test.todo('Stop action sends StopInstances POST')
    test.todo('Terminate action sends TerminateInstances POST')
    test.todo('Reboot action sends RebootInstances POST')
  })

  describe('CRUD-01: Sortable/filterable table', () => {
    test.todo('renders all instance columns: Name, ID, State, Type, AZ, Public IP')
    test.todo('PropertyFilter token state=running filters to running instances')
  })

  describe('CRUD-02: Detail view', () => {
    test.todo('clicking row opens SplitPanel with instance details')
    test.todo('detail panel shows 5 tabs: Details, Networking, Storage, Security, Tags')
  })

  describe('CRUD-05: State-aware actions', () => {
    test.todo('Start disabled when instance is running')
    test.todo('Stop disabled when instance is stopped')
    test.todo('Terminate enabled for running and stopped')
  })

  describe('CRUD-06: Manual refresh', () => {
    test.todo('Refresh button triggers query invalidation')
  })
})
