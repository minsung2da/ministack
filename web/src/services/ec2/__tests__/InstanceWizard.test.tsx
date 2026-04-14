import { describe, test, beforeAll } from 'vitest'
import { mswServer } from '../../../test/msw'
import { ec2Handlers } from './msw-handlers'

beforeAll(() => mswServer.use(...ec2Handlers))

describe('InstanceWizard', () => {
  describe('EC2-06: Instance creation wizard', () => {
    test.todo('renders 4-step wizard')
    test.todo('Step 1: Name input and Instance type dropdown')
    test.todo('Step 2: VPC dropdown populated from DescribeVpcs')
    test.todo('Step 2: Subnet dropdown filtered by selected VPC')
    test.todo('Step 3: Security Groups multiselect filtered by VPC')
    test.todo('Step 3: Key Pair dropdown populated from DescribeKeyPairs')
    test.todo('Step 4: Review shows all selections')
    test.todo('Submit calls RunInstances with correct params')
    test.todo('Cancel navigates back to Instances tab')
  })
})
