import { describe, it, expect } from 'vitest'
import { genericKeys } from './keys'

describe('_generic/keys', () => {
  it('all is a single-element tuple ["generic"]', () => {
    expect(genericKeys.all).toEqual(['generic'])
  })

  it('list(serviceKey) returns ["generic", serviceKey, "list"]', () => {
    expect(genericKeys.list('iam.users')).toEqual([
      'generic',
      'iam.users',
      'list',
    ])
  })

  it('item(serviceKey, id) returns ["generic", serviceKey, "item", id]', () => {
    expect(genericKeys.item('kms', 'key-abc')).toEqual([
      'generic',
      'kms',
      'item',
      'key-abc',
    ])
  })

  it('distinct service keys produce distinct list tuples', () => {
    expect(genericKeys.list('iam.users')).not.toEqual(
      genericKeys.list('iam.roles'),
    )
  })

  it('distinct ids produce distinct item tuples under the same service', () => {
    expect(genericKeys.item('sts', 'a')).not.toEqual(
      genericKeys.item('sts', 'b'),
    )
  })
})
