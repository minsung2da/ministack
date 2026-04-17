import { describe, test, expect } from 'vitest'
import { validateBucketName } from './validateBucketName'

describe('validateBucketName', () => {
  test('rejects names shorter than 3 characters', () => {
    expect(validateBucketName('ab')).toBe(
      'Bucket name must be at least 3 characters.',
    )
    expect(validateBucketName('')).toBe(
      'Bucket name must be at least 3 characters.',
    )
  })

  test('rejects names longer than 63 characters', () => {
    const n = 'a'.repeat(64)
    expect(validateBucketName(n)).toBe(
      'Bucket name must be 63 characters or fewer.',
    )
  })

  test('rejects uppercase letters', () => {
    expect(validateBucketName('MyBucket')).toBe(
      'Bucket name cannot contain uppercase letters.',
    )
  })

  test('rejects invalid characters', () => {
    expect(validateBucketName('my_bucket')).toBe(
      'Bucket name can only contain lowercase letters, numbers, and hyphens.',
    )
    expect(validateBucketName('my bucket')).toBe(
      'Bucket name can only contain lowercase letters, numbers, and hyphens.',
    )
  })

  test('rejects leading or trailing hyphen', () => {
    expect(validateBucketName('-bucket')).toBe(
      'Bucket name cannot start or end with a hyphen.',
    )
    expect(validateBucketName('bucket-')).toBe(
      'Bucket name cannot start or end with a hyphen.',
    )
  })

  test('rejects consecutive dots', () => {
    expect(validateBucketName('my..bucket')).toBe(
      'Bucket name cannot contain consecutive dots.',
    )
  })

  test('rejects IP-shaped names', () => {
    expect(validateBucketName('192.168.0.1')).toBe(
      'Bucket name cannot be formatted as an IP address.',
    )
  })

  test('accepts valid lowercase dash-containing names', () => {
    expect(validateBucketName('my-bucket')).toBeNull()
    expect(validateBucketName('abc')).toBeNull()
    expect(validateBucketName('bucket-123')).toBeNull()
    expect(validateBucketName('photos.v2')).toBeNull()
  })
})
