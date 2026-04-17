import { describe, test, expect } from 'vitest'
import {
  parseBuckets,
  parseObjects,
  parseTagging,
  parseErrorXml,
} from './parseS3Xml'
import { S3_FIXTURES } from '../__tests__/fixtures'

describe('parseBuckets', () => {
  test('extracts name and creationDate from ListAllMyBucketsResult', () => {
    const buckets = parseBuckets(S3_FIXTURES.listBucketsTwo)
    expect(buckets).toHaveLength(2)
    expect(buckets[0]).toEqual({
      name: 'my-bucket',
      creationDate: '2026-04-12T10:30:00Z',
    })
    expect(buckets[1]).toEqual({
      name: 'other-bucket',
      creationDate: '2026-04-15T08:12:00Z',
    })
  })

  test('returns empty array when Buckets element is empty', () => {
    expect(parseBuckets(S3_FIXTURES.listBucketsEmpty)).toEqual([])
  })
})

describe('parseObjects', () => {
  test('emits folder entries from CommonPrefixes with trimmed basenames', () => {
    const res = parseObjects(S3_FIXTURES.listObjectsRoot)
    const folders = res.entries.filter((e) => e.kind === 'folder')
    expect(folders).toHaveLength(2)
    expect(folders[0]).toEqual({
      kind: 'folder',
      key: 'photos/',
      name: 'photos',
    })
    expect(folders[1]).toEqual({
      kind: 'folder',
      key: 'docs/',
      name: 'docs',
    })
  })

  test('emits file entries from Contents with size and lastModified', () => {
    const res = parseObjects(S3_FIXTURES.listObjectsRoot)
    const files = res.entries.filter((e) => e.kind === 'file')
    expect(files).toHaveLength(2)
    expect(files[0]).toMatchObject({
      kind: 'file',
      key: 'readme.txt',
      name: 'readme.txt',
      size: 128,
      lastModified: '2026-04-12T10:30:00Z',
      etag: '"etag-readme"',
    })
  })

  test('folders come before files in entries', () => {
    const res = parseObjects(S3_FIXTURES.listObjectsRoot)
    expect(res.entries[0].kind).toBe('folder')
    const firstFileIdx = res.entries.findIndex((e) => e.kind === 'file')
    const lastFolderIdx = res.entries
      .map((e) => e.kind)
      .lastIndexOf('folder')
    expect(firstFileIdx).toBeGreaterThan(lastFolderIdx)
  })

  test('nested folder produces correct folder basename', () => {
    const res = parseObjects(S3_FIXTURES.listObjectsNested)
    const folder = res.entries.find((e) => e.kind === 'folder')!
    expect(folder.key).toBe('photos/2026/')
    expect(folder.name).toBe('2026')
  })

  test('surfaces isTruncated and nextContinuationToken', () => {
    const res = parseObjects(S3_FIXTURES.listObjectsTruncated)
    expect(res.isTruncated).toBe(true)
    expect(res.nextContinuationToken).toBe('next-token-abc')
    expect(res.keyCount).toBe(50)
  })

  test('non-truncated response has null continuation token', () => {
    const res = parseObjects(S3_FIXTURES.listObjectsRoot)
    expect(res.isTruncated).toBe(false)
    expect(res.nextContinuationToken).toBeNull()
  })
})

describe('parseTagging', () => {
  test('returns empty array for empty TagSet', () => {
    expect(parseTagging(S3_FIXTURES.taggingEmpty)).toEqual([])
  })

  test('extracts key/value pairs from Tag elements', () => {
    const tags = parseTagging(S3_FIXTURES.taggingWithTags)
    expect(tags).toEqual([
      { key: 'env', value: 'prod' },
      { key: 'owner', value: 'alice' },
    ])
  })
})

describe('parseErrorXml', () => {
  test('extracts code and message from Error document', () => {
    const err = parseErrorXml(S3_FIXTURES.errorBucketNotEmpty)
    expect(err).toEqual({
      code: 'BucketNotEmpty',
      message: 'The bucket you tried to delete is not empty',
    })
  })

  test('returns null when XML has no Error element', () => {
    expect(parseErrorXml(S3_FIXTURES.listBucketsTwo)).toBeNull()
  })
})
