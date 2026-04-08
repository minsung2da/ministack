import { describe, it, expect } from 'vitest'
import { copy } from '../copy'

describe('copy module', () => {
  it('matches UI-SPEC brand and region', () => {
    expect(copy.brand).toBe('MiniStack')
    expect(copy.region).toBe('us-east-1')
    expect(copy.breadcrumbRoot).toBe('Console')
  })

  it('interpolates searchEmpty and serviceHomeDescription', () => {
    expect(copy.searchEmpty('foo')).toBe('No services match "foo"')
    expect(copy.serviceHomeDescription('EC2')).toBe(
      'Resources managed by the EC2 emulator.',
    )
  })
})
